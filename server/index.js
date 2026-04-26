// Bridge Four - Game Server
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createGame, addPlayer, removePlayer, allSeated, startDeal, processBid, playCard, replayHand, getClientState, PHASES, choosePartnership, startNewRubber } from './game/game.js';
import { calculateHCP } from './game/deck.js';
import { chooseBid, chooseCard, getBotName } from './game/bot.js';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket'],
  pingInterval: 10000,   // ping clients every 10 s — well under Render's 30 s proxy timeout
  pingTimeout: 5000,
});

// In production, serve the built React app
const distPath = join(__dirname, '..', 'dist');
app.use(express.json());
app.use(express.static(distPath));
app.use((req, res, next) => {
  // Don't intercept socket.io or API requests
  if (req.url.startsWith('/socket.io') || req.url.startsWith('/api')) return next();
  res.sendFile(join(distPath, 'index.html'));
});

// Claude analysis helper
const SUIT_NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs', NT: 'No Trumps' };
const SEAT_NAMES = { N: 'North', E: 'East', S: 'South', W: 'West' };

// ── Google Sheets webhook ──────────────────────────────────────────────────
// Posts one row per human player to the sheet after every completed hand.
// Set SHEETS_WEBHOOK_URL (and optionally BRIDGE_SECRET) as Render env vars.
async function postScoreToSheets(game, scoreEntry) {
  const webhookUrl = process.env.SHEETS_WEBHOOK_URL;
  if (!webhookUrl || scoreEntry.isReplay) return; // skip replays & unconfigured

  try {
    const now    = new Date();
    const pad    = n => String(n).padStart(2, '0');
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} `
                    + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const date   = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;

    const contract     = scoreEntry.contract;
    const declarerSeat = contract?.declarer;
    const declaringTeam = declarerSeat === 'N' || declarerSeat === 'S' ? 'NS' : 'EW';
    const declarerName = game.players[declarerSeat]?.name || declarerSeat || 'Unknown';
    const doubled      = contract?.redoubled ? 'Redoubled' : contract?.doubled ? 'Doubled' : 'No';
    const suit         = SUIT_NAMES[contract?.suit] || contract?.suit || '—';
    const tricksContracted = contract ? contract.level : 0;
    const tricksMade   = scoreEntry.tricksMade || 0;

    // Build one row for every human player in the game
    const rows = [];
    for (const seat of ['N', 'E', 'S', 'W']) {
      const player = game.players[seat];
      if (!player || player.isBot) continue;

      const playerTeam  = seat === 'N' || seat === 'S' ? 'NS' : 'EW';
      const wonAuction  = contract ? (playerTeam === declaringTeam ? 'Yes' : 'No') : 'No';
      const pointsScored = scoreEntry.score?.[playerTeam] || 0;
      const hcp          = game.hcp?.[seat] ?? scoreEntry.originalHands
        ? (game.hcp?.[seat] ?? 0) : 0;

      rows.push({
        timestamp,
        date,
        handNumber: scoreEntry.dealNumber + 1,  // 1-based for readability
        player:     player.name,
        hcp,
        wonAuction,
        declarer:   declarerName,
        tricksContracted,
        suit,
        tricksMade,
        doubled,
        pointsScored,
      });
    }

    if (rows.length === 0) return; // all bots, nothing to record

    const body = JSON.stringify({
      secret: process.env.BRIDGE_SECRET || '',
      rows,
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const result = await response.json();
    if (result.error) {
      console.error('Sheets webhook error:', result.error);
    } else {
      console.log(`Sheets: posted ${result.rowsAdded} row(s) for hand ${scoreEntry.dealNumber + 1}`);
    }
  } catch (err) {
    console.error('Failed to post to Google Sheets:', err.message);
  }
}

function formatHandForPrompt(cards) {
  const suits = { S: [], H: [], C: [], D: [] };
  for (const c of cards) suits[c.suit].push(c.rank);
  return Object.entries(suits)
    .map(([s, ranks]) => `${s === 'S' ? '♠' : s === 'H' ? '♥' : s === 'C' ? '♣' : '♦'}: ${ranks.join(' ') || '—'}`)
    .join('  ');
}

function formatBidForPrompt(bid) {
  if (bid.type === 'pass') return 'Pass';
  if (bid.type === 'double') return 'Double';
  if (bid.type === 'redouble') return 'Redouble';
  return `${bid.level}${bid.suit}`;
}

function buildAnalysisPrompt(dealData) {
  const { originalHands, biddingHistory, biddingDealer, contract, tricksMade, score, vulnerability, dealer } = dealData;

  let prompt = `Analyse this bridge deal. Be concise but insightful.\n\n`;
  prompt += `Dealer: ${SEAT_NAMES[dealer]}\n`;
  prompt += `Vulnerability: NS ${vulnerability.NS ? 'Vulnerable' : 'Not Vulnerable'}, EW ${vulnerability.EW ? 'Vulnerable' : 'Not Vulnerable'}\n\n`;

  prompt += `HANDS:\n`;
  for (const seat of ['N', 'E', 'S', 'W']) {
    const hcp = calculateHCP(originalHands[seat]);
    prompt += `${SEAT_NAMES[seat]} (${hcp} HCP): ${formatHandForPrompt(originalHands[seat])}\n`;
  }

  prompt += `\nBIDDING (dealer ${SEAT_NAMES[biddingDealer]}):\n`;
  const bidsByRound = [];
  let round = [];
  const seatOrder = ['N', 'E', 'S', 'W'];
  // Pad initial empty bids before dealer
  const dealerIdx = seatOrder.indexOf(biddingDealer);
  for (let i = 0; i < dealerIdx; i++) round.push('—');
  for (const bid of biddingHistory) {
    round.push(`${SEAT_NAMES[bid.seat]}: ${formatBidForPrompt(bid)}`);
    if (round.length === 4) { bidsByRound.push(round.join(' | ')); round = []; }
  }
  if (round.length > 0) bidsByRound.push(round.join(' | '));
  prompt += bidsByRound.join('\n') + '\n';

  if (contract) {
    const needed = 6 + contract.level;
    const diff = tricksMade - needed;
    prompt += `\nCONTRACT: ${contract.level}${SUIT_NAMES[contract.suit]} by ${SEAT_NAMES[contract.declarer]}`;
    if (contract.doubled) prompt += ' Doubled';
    if (contract.redoubled) prompt += ' Redoubled';
    prompt += `\nRESULT: ${tricksMade} tricks (${diff >= 0 ? `made${diff > 0 ? ' +' + diff : ''}` : `down ${Math.abs(diff)}`})`;
    prompt += `\nSCORE: NS ${score.NS}, EW ${score.EW}\n`;
  } else {
    prompt += `\nPassed out - no score\n`;
  }

  prompt += `\nPlease respond in this exact format (no markdown, no bold, no asterisks):\n\n`;
  prompt += `BEST CONTRACT: State the optimal contract given all four hands (e.g. "4♠ by North, making 10 tricks"). Consider which partnership has the combined strength, the best trump fit or NT stoppers, and how many tricks can reasonably be taken with best play.\n\n`;
  prompt += `ANALYSIS: Then critique the actual bidding — was it reasonable? How does it compare to the optimal contract above? What would you have bid differently? Use the exact HCP values shown above for each player (do not recalculate them). Note key hand points (shape, fit) and any notable aspects of the deal.\n`;
  prompt += `Keep the analysis section conversational and educational, about 150-200 words. Plain text only, no markdown formatting.`;

  return prompt;
}

// Keep-alive endpoint — prevents Render free tier from spinning down
app.get('/api/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.post('/api/analyse', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.json({ error: 'ANTHROPIC_API_KEY not set. Set it as an environment variable to enable analysis.' });
    }

    const client = new Anthropic({ apiKey });
    const dealData = req.body;

    const prompt = buildAnalysisPrompt(dealData);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1280,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysis = message.content[0]?.text || 'No analysis generated.';
    res.json({ analysis });
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.json({ error: `Analysis failed: ${err.message}` });
  }
});

// In-memory game storage
const games = {};

function getOrCreateGame(gameCode) {
  if (!games[gameCode]) {
    games[gameCode] = createGame(gameCode);
  }
  return games[gameCode];
}

function broadcastGameState(game) {
  for (const seat of ['N', 'E', 'S', 'W']) {
    const player = game.players[seat];
    if (player && !player.isBot) {
      const state = getClientState(game, seat);
      io.to(player.socketId).emit('game-state', { ...state, mySeat: seat });
    }
  }
}

// Bot auto-play: checks if it's a bot's turn and acts after a short delay
function scheduleBotAction(game) {
  if (!game) return;

  const BOT_DELAY = 800;

  if (game.phase === PHASES.BIDDING) {
    const currentBidder = game.bidding?.currentBidder;
    const player = game.players[currentBidder];
    if (player?.isBot) {
      setTimeout(() => {
        const bid = chooseBid(game, currentBidder);
        const result = processBid(game, currentBidder, bid);
        console.log(`Bot ${player.name} bids: ${bid.type}${bid.level ? ' ' + bid.level + bid.suit : ''}`);
        broadcastGameState(game);

        if (result.passedOut) {
          console.log(`Deal ${game.dealNumber}: Passed out`);
          // Auto-advance after passed out
          scheduleBotAdvance(game);
        } else if (result.contractMade) {
          console.log(`Contract: ${game.contract.level}${game.contract.suit} by ${game.contract.declarer}`);
        }
        // Continue if next player is also a bot
        scheduleBotAction(game);
      }, BOT_DELAY);
    }
  } else if (game.phase === PHASES.PLAYING) {
    let turnSeat = game.currentTurn;
    // If it's dummy's turn, the declarer plays
    const declarer = game.contract?.declarer;
    const dummy = game.contract?.dummy;
    const actingSeat = (turnSeat === dummy) ? declarer : turnSeat;
    const player = game.players[actingSeat];

    // If declarer is bot but dummy is a human, human controls both hands - don't auto-play
    if (actingSeat === declarer && player?.isBot && game.players[dummy] && !game.players[dummy].isBot) {
      return; // Human dummy plays as declarer
    }

    if (player?.isBot) {
      // Extra delay after a completed trick so players can see all 4 cards
      const trickJustCompleted = game.currentTrick.length === 0 && game.lastCompletedTrick;
      const delay = trickJustCompleted ? BOT_DELAY + 1500 : BOT_DELAY;

      setTimeout(() => {
        // Clear lastCompletedTrick before next play so client knows to hide it
        if (game.lastCompletedTrick && game.currentTrick.length === 0) {
          game.lastCompletedTrick = null;
          broadcastGameState(game);
        }

        const card = chooseCard(game, actingSeat);
        if (!card) return;
        const result = playCard(game, actingSeat, card);
        if (result.error) {
          console.log(`Bot ${player.name} play error: ${result.error}`);
          return;
        }
        console.log(`Bot ${player.name} plays ${card.rank}${card.suit}`);
        broadcastGameState(game);

        if (result.handComplete) {
          const lastScore = game.scores[game.scores.length - 1];
          console.log(`Hand complete - NS: ${lastScore.score.NS}, EW: ${lastScore.score.EW}`);
          postScoreToSheets(game, lastScore);
          scheduleBotAdvance(game);
        } else {
          scheduleBotAction(game);
        }
      }, delay);
    }
  }
}

// Auto-advance when hand/round completes and all remaining actions would be bot-driven
function scheduleBotAdvance(game) {
  // Only auto-advance if there are bots - let humans click "Next Deal"
  // Don't auto-advance, let the human player click the button
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  let currentGame = null;

  // Compute the caller's current seat by socket id. The seat can change
  // mid-session when a partnership rotation re-assigns seats, so we look
  // it up dynamically on every action instead of caching.
  const mySeat = () => {
    if (!currentGame) return null;
    for (const s of ['N','E','S','W']) {
      if (currentGame.players[s]?.socketId === socket.id) return s;
    }
    return null;
  };

  socket.on('get-lobby', ({ gameCode }, callback) => {
    const game = games[gameCode];
    const players = {};
    if (game) {
      for (const seat of ['N', 'E', 'S', 'W']) {
        const p = game.players[seat];
        if (p) players[seat] = { name: p.name, isBot: !!p.isBot, seated: true };
      }
    }
    callback?.({ players });
  });

  socket.on('join-game', ({ gameCode, name, seat }, callback) => {
    const game = getOrCreateGame(gameCode);
    const result = addPlayer(game, seat, name, socket.id);

    if (result.error) {
      callback({ error: result.error });
      return;
    }

    currentGame = game;
    socket.join(gameCode);

    callback({ success: true, seat });
    broadcastGameState(game);

    if (result.reconnected) {
      console.log(`${name} reconnected to ${gameCode} as ${seat}`);
    } else if (result.replacedBot) {
      console.log(`${name} replaced bot in ${gameCode} seat ${seat}`);
    } else {
      console.log(`${name} joined ${gameCode} as ${seat}`);
    }
  });

  socket.on('add-bots', (_, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }

    const usedNames = Object.values(currentGame.players)
      .filter(p => p)
      .map(p => p.name);

    let botsAdded = 0;
    for (const seat of ['N', 'E', 'S', 'W']) {
      if (!currentGame.players[seat]) {
        const botName = getBotName(usedNames);
        usedNames.push(botName);
        currentGame.players[seat] = {
          name: botName,
          socketId: `bot-${seat}`,
          isBot: true,
        };
        botsAdded++;
        console.log(`Bot ${botName} added to ${currentGame.gameCode} as ${seat}`);
      }
    }

    // Bots don't need partnership selection — clear the flag so the lobby
    // shows "Deal First Hand" directly.
    if (botsAdded > 0) {
      currentGame.partnershipsPending = false;
    }

    callback?.({ success: true, botsAdded });
    broadcastGameState(currentGame);
  });

  socket.on('start-game', (_, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }
    if (!allSeated(currentGame)) { callback?.({ error: 'Need 4 players' }); return; }
    if (currentGame.partnershipsPending) {
      callback?.({ error: 'Choose partnerships first' });
      return;
    }

    startDeal(currentGame);
    callback?.({ success: true });
    broadcastGameState(currentGame);
    console.log(`Game ${currentGame.gameCode} started - Deal ${currentGame.dealNumber + 1}`);

    // Kick off bot actions if a bot goes first
    scheduleBotAction(currentGame);
  });

  socket.on('choose-partnership', ({ nsPair, ewPair }, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }
    const result = choosePartnership(currentGame, { nsPair, ewPair });
    if (result.error) { callback?.({ error: result.error }); return; }
    callback?.({ success: true });
    // Auto-start the first deal of the rubber
    startDeal(currentGame);
    broadcastGameState(currentGame);
    console.log(
      `Partnerships chosen in ${currentGame.gameCode}: `
      + `NS ${currentGame.players.N.name}/${currentGame.players.S.name} vs `
      + `EW ${currentGame.players.E.name}/${currentGame.players.W.name}`
    );
    scheduleBotAction(currentGame);
  });

  socket.on('make-bid', ({ bid }, callback) => {
    const seat = mySeat();
    if (!currentGame || !seat) { callback?.({ error: 'Not in a game' }); return; }

    const result = processBid(currentGame, seat, bid);
    if (result.error) { callback?.({ error: result.error }); return; }

    callback?.({ success: true });
    broadcastGameState(currentGame);

    if (result.passedOut) {
      console.log(`Deal ${currentGame.dealNumber}: Passed out`);
    } else if (result.contractMade) {
      console.log(`Contract: ${currentGame.contract.level}${currentGame.contract.suit} by ${currentGame.contract.declarer}`);
    }

    // Trigger bot action if next player is a bot
    scheduleBotAction(currentGame);
  });

  socket.on('play-card', ({ card }, callback) => {
    const seat = mySeat();
    if (!currentGame || !seat) { callback?.({ error: 'Not in a game' }); return; }

    const result = playCard(currentGame, seat, card);
    if (result.error) { callback?.({ error: result.error }); return; }

    callback?.({ success: true });
    broadcastGameState(currentGame);

    if (result.trickComplete) {
      console.log(`Trick ${result.trickComplete.trickNumber} won by ${result.trickComplete.winner}`);
    }
    if (result.handComplete) {
      const lastScore = currentGame.scores[currentGame.scores.length - 1];
      console.log(`Hand complete - NS: ${lastScore.score.NS}, EW: ${lastScore.score.EW}`);
      postScoreToSheets(currentGame, lastScore);
    }

    // Trigger bot action if next player is a bot
    scheduleBotAction(currentGame);
  });

  socket.on('next-deal', (_, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }
    if (currentGame.phase !== PHASES.HAND_COMPLETE && currentGame.phase !== PHASES.ROUND_COMPLETE) {
      callback?.({ error: 'Not ready for next deal' });
      return;
    }

    // If the last score was a practice replay, remove it before advancing
    const lastScore = currentGame.scores[currentGame.scores.length - 1];
    if (lastScore?.isReplay) {
      currentGame.scores.pop();
    }

    startDeal(currentGame);
    callback?.({ success: true });
    broadcastGameState(currentGame);
    console.log(`Starting deal ${currentGame.dealNumber + 1}`);

    // Kick off bot actions
    scheduleBotAction(currentGame);
  });

  socket.on('replay-hand', (_, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }
    if (currentGame.phase !== PHASES.HAND_COMPLETE && currentGame.phase !== PHASES.ROUND_COMPLETE) {
      callback?.({ error: 'Hand not complete' });
      return;
    }

    const result = replayHand(currentGame);
    if (result.error) { callback?.({ error: result.error }); return; }

    callback?.({ success: true });
    broadcastGameState(currentGame);
    console.log(`Replaying hand ${currentGame.dealNumber} (practice — no score)`);

    scheduleBotAction(currentGame);
  });

  socket.on('new-round', (_, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }

    // A new rubber rotates partnerships — reset to a fresh waiting state
    // with partnershipsPending so the clients re-pick who partners whom.
    // Career individualScores persist across rubbers.
    startNewRubber(currentGame);
    callback?.({ success: true });
    broadcastGameState(currentGame);
    console.log(`New rubber started in ${currentGame.gameCode} — awaiting partnership selection`);
  });

  // ── Leave game ─────────────────────────────────────────────────────
  // Frees the seat (other players see it go empty); the socket stays
  // connected so the client can return to the lobby.
  socket.on('leave-game', (_, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }
    const gameCode = currentGame.gameCode;
    const removedSeat = removePlayer(currentGame, socket.id);
    if (removedSeat) {
      socket.leave(gameCode);
      console.log(`${removedSeat} left ${gameCode} via Leave button`);
      broadcastGameState(currentGame);
    }
    currentGame = null;
    callback?.({ success: true });
  });

  // ── Restart game ───────────────────────────────────────────────────
  // Full reset: wipes career individualScores and kicks everyone back to
  // partnership selection. Any seated player can trigger.
  socket.on('restart-game', (_, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }
    startNewRubber(currentGame);
    currentGame.individualScores = {};
    callback?.({ success: true });
    broadcastGameState(currentGame);
    console.log(`Game restarted in ${currentGame.gameCode} — partnerships reset, scores cleared`);
  });

  // ── WebRTC signalling relay ─────────────────────────────────────────
  // Forwards offer/answer/ICE candidates between the 4 players in a game.
  // Clients send { to: 'N'|'E'|'S'|'W', type, payload }; we look up the
  // target socket by seat in the same game and forward a { from, type, payload }.
  socket.on('webrtc-signal', ({ to, type, payload }) => {
    if (!currentGame) return;
    const fromSeat = mySeat();
    if (!fromSeat) return;
    const target = currentGame.players[to];
    if (!target || target.isBot || !target.socketId) return;
    io.to(target.socketId).emit('webrtc-signal', { from: fromSeat, type, payload });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (currentGame) {
      const removedSeat = removePlayer(currentGame, socket.id);
      if (removedSeat) {
        console.log(`${removedSeat} left ${currentGame.gameCode}`);
        broadcastGameState(currentGame);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Bridge Four server running on port ${PORT}`);
});

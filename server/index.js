// Bridge Four - Game Server
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createGame, addPlayer, removePlayer, allSeated, startDeal, processBid, playCard, getClientState, PHASES } from './game/game.js';
import { chooseBid, chooseCard, getBotName } from './game/bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// In production, serve the built React app
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  // Don't intercept socket.io or API requests
  if (req.url.startsWith('/socket.io')) return next();
  res.sendFile(join(distPath, 'index.html'));
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

    if (player?.isBot) {
      setTimeout(() => {
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
          // Auto-advance to next deal after a pause
          scheduleBotAdvance(game);
        } else {
          // Continue if next player is also a bot
          scheduleBotAction(game);
        }
      }, BOT_DELAY);
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
  let currentSeat = null;

  socket.on('join-game', ({ gameCode, name, seat }, callback) => {
    const game = getOrCreateGame(gameCode);
    const result = addPlayer(game, seat, name, socket.id);

    if (result.error) {
      callback({ error: result.error });
      return;
    }

    currentGame = game;
    currentSeat = seat;
    socket.join(gameCode);

    callback({ success: true, seat });
    broadcastGameState(game);

    console.log(`${name} joined ${gameCode} as ${seat}`);
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

    callback?.({ success: true, botsAdded });
    broadcastGameState(currentGame);
  });

  socket.on('start-game', (_, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }
    if (!allSeated(currentGame)) { callback?.({ error: 'Need 4 players' }); return; }

    startDeal(currentGame);
    callback?.({ success: true });
    broadcastGameState(currentGame);
    console.log(`Game ${currentGame.gameCode} started - Deal ${currentGame.dealNumber + 1}`);

    // Kick off bot actions if a bot goes first
    scheduleBotAction(currentGame);
  });

  socket.on('make-bid', ({ bid }, callback) => {
    if (!currentGame || !currentSeat) { callback?.({ error: 'Not in a game' }); return; }

    const result = processBid(currentGame, currentSeat, bid);
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
    if (!currentGame || !currentSeat) { callback?.({ error: 'Not in a game' }); return; }

    const result = playCard(currentGame, currentSeat, card);
    if (result.error) { callback?.({ error: result.error }); return; }

    callback?.({ success: true });
    broadcastGameState(currentGame);

    if (result.trickComplete) {
      console.log(`Trick ${result.trickComplete.trickNumber} won by ${result.trickComplete.winner}`);
    }
    if (result.handComplete) {
      const lastScore = currentGame.scores[currentGame.scores.length - 1];
      console.log(`Hand complete - NS: ${lastScore.score.NS}, EW: ${lastScore.score.EW}`);
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

    startDeal(currentGame);
    callback?.({ success: true });
    broadcastGameState(currentGame);
    console.log(`Starting deal ${currentGame.dealNumber + 1}`);

    // Kick off bot actions
    scheduleBotAction(currentGame);
  });

  socket.on('new-round', (_, callback) => {
    if (!currentGame) { callback?.({ error: 'Not in a game' }); return; }

    // Start a new chukker - rotate first dealer
    const seats = ['N', 'E', 'S', 'W'];
    const oldIdx = seats.indexOf(currentGame.firstDealer);
    currentGame.firstDealer = seats[(oldIdx + 1) % 4];

    startDeal(currentGame);
    callback?.({ success: true });
    broadcastGameState(currentGame);
    console.log(`New round started - First dealer: ${currentGame.firstDealer}`);

    // Kick off bot actions
    scheduleBotAction(currentGame);
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

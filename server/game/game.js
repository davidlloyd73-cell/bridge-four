// Main game state machine for Bridge

import { createDeck, shuffle, deal, calculateHCP, cardEquals, sortHand, SUITS, RANK_VALUES } from './deck.js';
import { createBiddingState, makeBid, getValidBids, nextSeat, getPartner, getTeam, formatBid } from './bidding.js';
import { getVulnerability, getDealerForDeal, calculateScore, formatContract } from './scoring.js';

const PHASES = {
  WAITING: 'waiting',
  BIDDING: 'bidding',
  PLAYING: 'playing',
  HAND_COMPLETE: 'hand_complete',
  ROUND_COMPLETE: 'round_complete',
};

export function createGame(gameCode) {
  return {
    gameCode,
    players: {},         // { N: { name, socketId }, E: ..., S: ..., W: ... }
    phase: PHASES.WAITING,
    firstDealer: 'N',
    dealNumber: 0,       // Overall deal number (0-based)
    dealer: 'N',
    vulnerability: { NS: false, EW: false },
    hands: {},           // { N: [...cards], E: [...], S: [...], W: [...] }
    hcp: {},             // { N: 14, E: 10, ... }
    bidding: null,
    contract: null,
    currentTrick: [],    // [{ seat, card }]
    trickLeader: null,
    tricksWon: { NS: 0, EW: 0 },
    trickNumber: 0,
    dummyRevealed: false,
    scores: [],          // [{ dealNumber, contract, tricksMade, score: {NS, EW}, vulnerability, dealer }]
    totalScores: { NS: 0, EW: 0 },
    individualScores: { N: 0, E: 0, S: 0, W: 0 },
    currentTurn: null,
    lastCompletedTrick: null,
  };
}

export function addPlayer(game, seat, name, socketId) {
  const existing = game.players[seat];
  if (existing) {
    // Same name reconnecting: replace the socketId so the live client gets updates.
    if (!existing.isBot && existing.name === name) {
      game.players[seat] = { ...existing, socketId };
      return { success: true, reconnected: true };
    }
    // A bot sitting in this seat yields to a human with the same preset name.
    if (existing.isBot) {
      game.players[seat] = { name, socketId };
      return { success: true, replacedBot: true };
    }
    return { error: 'Seat already taken' };
  }
  game.players[seat] = { name, socketId };
  return { success: true };
}

export function removePlayer(game, socketId) {
  for (const seat of ['N', 'E', 'S', 'W']) {
    if (game.players[seat]?.socketId === socketId) {
      delete game.players[seat];
      return seat;
    }
  }
  return null;
}

export function allSeated(game) {
  return ['N', 'E', 'S', 'W'].every(s => game.players[s]);
}

export function startDeal(game) {
  game.dealer = getDealerForDeal(game.dealNumber, game.firstDealer);
  game.vulnerability = getVulnerability(game.dealNumber, game.dealer);

  const deck = shuffle(createDeck());
  game.hands = deal(deck);
  game.hcp = {
    N: calculateHCP(game.hands.N),
    E: calculateHCP(game.hands.E),
    S: calculateHCP(game.hands.S),
    W: calculateHCP(game.hands.W),
  };

  // Save original hands for post-deal review (cards get removed during play)
  game.originalHands = {
    N: [...game.hands.N],
    E: [...game.hands.E],
    S: [...game.hands.S],
    W: [...game.hands.W],
  };

  game.bidding = createBiddingState(game.dealer);
  game.contract = null;
  game.currentTrick = [];
  game.trickLeader = null;
  game.tricksWon = { NS: 0, EW: 0 };
  game.trickNumber = 0;
  game.dummyRevealed = false;
  game.phase = PHASES.BIDDING;
  game.currentTurn = game.dealer;
  game.lastCompletedTrick = null;
}

export function processBid(game, seat, bid) {
  if (game.phase !== PHASES.BIDDING) return { error: 'Not in bidding phase' };
  if (seat !== game.bidding.currentBidder) return { error: 'Not your turn to bid' };

  const validBids = getValidBids(game.bidding);
  const isValid = validBids.some(vb => {
    if (vb.type !== bid.type) return false;
    if (bid.type === 'bid') return vb.level === bid.level && vb.suit === bid.suit;
    return true;
  });

  if (!isValid) return { error: 'Invalid bid' };

  game.bidding = makeBid(game.bidding, bid);

  if (game.bidding.isComplete) {
    if (!game.bidding.contract) {
      // Passed out
      game.contract = null;
      game.phase = PHASES.HAND_COMPLETE;
      game.scores.push({
        dealNumber: game.dealNumber,
        contract: null,
        tricksMade: 0,
        score: { NS: 0, EW: 0 },
        vulnerability: { ...game.vulnerability },
        dealer: game.dealer,
        originalHands: game.originalHands ? {
          N: [...game.originalHands.N],
          E: [...game.originalHands.E],
          S: [...game.originalHands.S],
          W: [...game.originalHands.W],
        } : null,
        biddingHistory: game.bidding ? [...game.bidding.bids] : [],
        biddingDealer: game.dealer,
      });
      return { success: true, passedOut: true };
    }

    game.contract = game.bidding.contract;
    game.phase = PHASES.PLAYING;
    // Opening leader is to the left of declarer
    game.trickLeader = nextSeat(game.contract.declarer);
    game.currentTurn = game.trickLeader;
    game.trickNumber = 1;
    game.currentTrick = [];
    game.dummyRevealed = false;
    return { success: true, contractMade: true };
  }

  game.currentTurn = game.bidding.currentBidder;
  return { success: true };
}

export function playCard(game, seat, card) {
  if (game.phase !== PHASES.PLAYING) return { error: 'Not in playing phase' };

  // Determine who can play
  let playingSeat = seat;
  const declarer = game.contract.declarer;
  const dummy = game.contract.dummy;
  const declarerIsBot = game.players[declarer]?.isBot;

  // Declarer can play dummy's cards
  if (seat === declarer && game.currentTurn === dummy) {
    playingSeat = dummy;
  }
  // When human is dummy and declarer is a bot, human controls both hands
  else if (seat === dummy && declarerIsBot) {
    if (game.currentTurn === declarer) {
      playingSeat = declarer;
    } else if (game.currentTurn === dummy) {
      playingSeat = dummy;
    } else {
      return { error: 'Not your turn' };
    }
  }
  else if (seat !== game.currentTurn) {
    return { error: 'Not your turn' };
  }

  // Dummy can't play their own cards when declarer is human
  if (seat === dummy && !declarerIsBot) {
    return { error: 'Declarer plays your cards' };
  }

  const hand = game.hands[playingSeat];
  const cardIdx = hand.findIndex(c => cardEquals(c, card));
  if (cardIdx === -1) return { error: 'Card not in hand' };

  // Must follow suit if possible
  if (game.currentTrick.length > 0) {
    const ledSuit = game.currentTrick[0].card.suit;
    const hasSuit = hand.some(c => c.suit === ledSuit);
    if (hasSuit && card.suit !== ledSuit) {
      return { error: 'Must follow suit' };
    }
  }

  // Play the card
  hand.splice(cardIdx, 1);
  game.currentTrick.push({ seat: playingSeat, card });

  // After opening lead, reveal dummy
  if (!game.dummyRevealed && game.currentTrick.length === 1 && game.trickNumber === 1) {
    game.dummyRevealed = true;
  }

  // Check if trick is complete
  if (game.currentTrick.length === 4) {
    const winner = determineTrickWinner(game.currentTrick, game.contract.suit);
    const winnerTeam = getTeam(winner);
    game.tricksWon[winnerTeam]++;

    const completedTrick = {
      cards: [...game.currentTrick],
      winner,
      trickNumber: game.trickNumber,
    };

    game.lastCompletedTrick = completedTrick;
    game.currentTrick = [];
    game.trickNumber++;

    if (game.trickNumber > 13) {
      // Hand is complete
      completeHand(game);
      return { success: true, trickComplete: completedTrick, handComplete: true };
    }

    game.trickLeader = winner;
    // If winner is dummy, declarer plays next for dummy
    game.currentTurn = winner;
    return { success: true, trickComplete: completedTrick };
  }

  // Advance to next player
  const nextPlayer = nextSeat(playingSeat);
  game.currentTurn = nextPlayer;
  return { success: true };
}

function determineTrickWinner(trick, trumpSuit) {
  const ledSuit = trick[0].card.suit;
  let winner = trick[0];

  for (let i = 1; i < trick.length; i++) {
    const current = trick[i];
    if (trumpSuit !== 'NT') {
      // Trump beats non-trump
      if (current.card.suit === trumpSuit && winner.card.suit !== trumpSuit) {
        winner = current;
        continue;
      }
      if (winner.card.suit === trumpSuit && current.card.suit !== trumpSuit) {
        continue;
      }
    }
    // Same suit comparison
    if (current.card.suit === winner.card.suit) {
      if (RANK_VALUES[current.card.rank] > RANK_VALUES[winner.card.rank]) {
        winner = current;
      }
    }
    // Different suit and not trump - doesn't win
  }

  return winner.seat;
}

function completeHand(game) {
  const tricksMade = game.contract
    ? game.tricksWon[getTeam(game.contract.declarer)]
    : 0;

  const score = game.contract
    ? calculateScore(game.contract, tricksMade, game.vulnerability)
    : { NS: 0, EW: 0 };

  const scoreEntry = {
    dealNumber: game.dealNumber,
    contract: game.contract ? { ...game.contract } : null,
    tricksMade,
    score,
    vulnerability: { ...game.vulnerability },
    dealer: game.dealer,
    originalHands: game.originalHands ? {
      N: [...game.originalHands.N],
      E: [...game.originalHands.E],
      S: [...game.originalHands.S],
      W: [...game.originalHands.W],
    } : null,
    biddingHistory: game.bidding ? [...game.bidding.bids] : [],
    biddingDealer: game.dealer,
  };

  if (game.isReplayHand) {
    // Practice replay — store result for review but don't affect totals or advance deal
    scoreEntry.isReplay = true;
    game.scores.push(scoreEntry);
    game.isReplayHand = false;
    game.phase = PHASES.HAND_COMPLETE;
    return;
  }

  game.scores.push(scoreEntry);
  game.totalScores.NS += score.NS;
  game.totalScores.EW += score.EW;

  // Individual scoring: each player gets their team's score for the deal
  game.individualScores.N += score.NS;
  game.individualScores.S += score.NS;
  game.individualScores.E += score.EW;
  game.individualScores.W += score.EW;

  game.dealNumber++;

  // Check if chukker (4 deals) is complete
  if (game.dealNumber % 4 === 0) {
    game.phase = PHASES.ROUND_COMPLETE;
  } else {
    game.phase = PHASES.HAND_COMPLETE;
  }
}

export function replayHand(game) {
  if (!game.originalHands) return { error: 'No hand data to replay' };

  // Restore original hands exactly as dealt
  game.hands = {
    N: [...game.originalHands.N],
    E: [...game.originalHands.E],
    S: [...game.originalHands.S],
    W: [...game.originalHands.W],
  };

  // Reset bidding and play state — same dealer/vulnerability as the original hand
  game.bidding = createBiddingState(game.dealer);
  game.contract = null;
  game.currentTrick = [];
  game.trickLeader = null;
  game.tricksWon = { NS: 0, EW: 0 };
  game.trickNumber = 0;
  game.dummyRevealed = false;
  game.phase = PHASES.BIDDING;
  game.currentTurn = game.dealer;
  game.lastCompletedTrick = null;
  game.isReplayHand = true; // Tells completeHand not to update totals

  return { success: true };
}

export function getClientState(game, forSeat) {
  const state = {
    gameCode: game.gameCode,
    phase: game.phase,
    players: {},
    dealNumber: game.dealNumber,
    dealer: game.dealer,
    vulnerability: game.vulnerability,
    currentTurn: game.currentTurn,
    scores: game.scores,
    totalScores: game.totalScores,
    individualScores: game.individualScores,
  };

  // Player info
  for (const seat of ['N', 'E', 'S', 'W']) {
    state.players[seat] = game.players[seat]
      ? { name: game.players[seat].name, seated: true }
      : { seated: false };
  }

  // Hand info - only show own hand (and dummy when revealed)
  if (game.hands[forSeat]) {
    state.myHand = game.hands[forSeat];
    state.myHCP = game.hcp[forSeat];
  }

  // Dummy hand visible to all after opening lead
  if (game.dummyRevealed && game.contract) {
    state.dummyHand = game.hands[game.contract.dummy];
    state.dummySeat = game.contract.dummy;
  }

  // Show hand sizes for all players (so you can see how many cards they have)
  state.handSizes = {};
  for (const seat of ['N', 'E', 'S', 'W']) {
    state.handSizes[seat] = game.hands[seat]?.length || 0;
  }

  // Bidding state
  if (game.bidding) {
    state.bidding = {
      bids: game.bidding.bids,
      currentBidder: game.bidding.currentBidder,
      isComplete: game.bidding.isComplete,
    };
    if (!game.bidding.isComplete && forSeat === game.bidding.currentBidder) {
      state.validBids = getValidBids(game.bidding);
    }
  }

  // Contract
  if (game.contract) {
    state.contract = game.contract;
  }

  // Trick play state
  if (game.phase === PHASES.PLAYING) {
    state.currentTrick = game.currentTrick;
    state.tricksWon = game.tricksWon;
    state.trickNumber = game.trickNumber;
    if (game.lastCompletedTrick) {
      state.lastCompletedTrick = game.lastCompletedTrick;
    }

    // If it's dummy's turn, declarer controls
    if (game.currentTurn === game.contract?.dummy) {
      state.declarerControlsDummy = true;
    }

    // When human is dummy and declarer is a bot, human plays both hands
    const declarer = game.contract?.declarer;
    const dummy = game.contract?.dummy;
    if (forSeat === dummy && game.players[declarer]?.isBot) {
      state.humanPlaysBothHands = true;
      // Send declarer's hand so human can play it
      state.declarerHand = game.hands[declarer];
      state.declarerSeat = declarer;
    }
  }

  // HCP for all players (visible after bidding to own player)
  state.hcp = {};
  if (game.phase !== PHASES.WAITING) {
    state.hcp[forSeat] = game.hcp[forSeat];
  }

  // Post-deal review: send all hands + bidding from the last completed deal
  if ((game.phase === PHASES.HAND_COMPLETE || game.phase === PHASES.ROUND_COMPLETE) && game.scores.length > 0) {
    const lastScore = game.scores[game.scores.length - 1];
    if (lastScore.originalHands) {
      state.reviewHands = lastScore.originalHands;
    }
    if (lastScore.biddingHistory) {
      state.reviewBidding = lastScore.biddingHistory;
      state.reviewBiddingDealer = lastScore.biddingDealer;
    }
    // Send HCP for all players during review
    state.reviewHCP = game.hcp;
  }

  return state;
}

export { PHASES };

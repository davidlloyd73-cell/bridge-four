// Simple bot AI for bridge bidding and card play

import { getTeam, getPartner, BID_SUITS, getValidBids } from './bidding.js';
import { RANK_VALUES } from './deck.js';

const BOT_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana'];

export function getBotName(usedNames) {
  return BOT_NAMES.find(n => !usedNames.includes(n)) || 'Bot';
}

// ============ Bidding AI ============

export function chooseBid(game, seat) {
  const hand = game.hands[seat];
  const hcp = game.hcp[seat];
  const validBids = game.bidding ? getValidBidsForBot(game) : [];

  if (validBids.length === 0) return { type: 'pass' };

  // Count suits
  const suitLengths = { S: 0, H: 0, D: 0, C: 0 };
  for (const card of hand) {
    suitLengths[card.suit]++;
  }
  const longestSuit = Object.entries(suitLengths).sort((a, b) => b[1] - a[1])[0];
  const hasLongMajor = suitLengths.H >= 5 || suitLengths.S >= 5;
  const isBalanced = Object.values(suitLengths).every(l => l >= 2 && l <= 5);

  // Simple bidding logic based on HCP
  if (hcp < 6) {
    return { type: 'pass' };
  }

  // Opening bids (no previous real bid from partner's side)
  const partnerBid = getPartnerLastBid(game.bidding, seat);
  const hasPreviousBid = hasTeamBid(game.bidding, seat);

  if (!hasPreviousBid) {
    // Opening
    if (hcp >= 15 && isBalanced) {
      return tryBid(validBids, 1, 'NT') || { type: 'pass' };
    }
    if (hcp >= 12) {
      if (suitLengths.S >= 5) return tryBid(validBids, 1, 'S') || { type: 'pass' };
      if (suitLengths.H >= 5) return tryBid(validBids, 1, 'H') || { type: 'pass' };
      if (suitLengths.D >= 4) return tryBid(validBids, 1, 'D') || { type: 'pass' };
      return tryBid(validBids, 1, 'C') || { type: 'pass' };
    }
    return { type: 'pass' };
  }

  // Responding to partner
  if (hcp >= 6 && hcp < 10) {
    // Minimum response
    if (hasLongMajor) {
      if (suitLengths.S >= 5) return tryBid(validBids, 1, 'S') || { type: 'pass' };
      if (suitLengths.H >= 5) return tryBid(validBids, 1, 'H') || { type: 'pass' };
    }
    return tryBid(validBids, 1, 'NT') || { type: 'pass' };
  }

  if (hcp >= 10) {
    // Game-try range, just bid game in NT or a major if we have one
    if (isBalanced && hcp >= 13) {
      return tryBid(validBids, 3, 'NT') || { type: 'pass' };
    }
    if (suitLengths.S >= 5) return tryBidAtLowest(validBids, 'S') || { type: 'pass' };
    if (suitLengths.H >= 5) return tryBidAtLowest(validBids, 'H') || { type: 'pass' };
    return { type: 'pass' };
  }

  return { type: 'pass' };
}

function tryBid(validBids, level, suit) {
  return validBids.find(b => b.type === 'bid' && b.level === level && b.suit === suit) || null;
}

function tryBidAtLowest(validBids, suit) {
  const suitBids = validBids.filter(b => b.type === 'bid' && b.suit === suit);
  return suitBids.length > 0 ? suitBids[0] : null;
}

function getPartnerLastBid(biddingState, seat) {
  const partner = getPartner(seat);
  for (let i = biddingState.bids.length - 1; i >= 0; i--) {
    if (biddingState.bids[i].seat === partner && biddingState.bids[i].type === 'bid') {
      return biddingState.bids[i];
    }
  }
  return null;
}

function hasTeamBid(biddingState, seat) {
  const team = getTeam(seat);
  return biddingState.bids.some(b => b.type === 'bid' && getTeam(b.seat) === team);
}

function getValidBidsForBot(game) {
  return getValidBids(game.bidding);
}

// ============ Card Play AI ============

export function chooseCard(game, seat) {
  // Determine which hand to play from
  let playingSeat = seat;
  if (game.contract && seat === game.contract.declarer && game.currentTurn === game.contract.dummy) {
    playingSeat = game.contract.dummy;
  }

  const hand = game.hands[playingSeat];
  if (!hand || hand.length === 0) return null;

  const trick = game.currentTrick;
  const trumpSuit = game.contract?.suit;

  // Must follow suit
  if (trick.length > 0) {
    const ledSuit = trick[0].card.suit;
    const suitCards = hand.filter(c => c.suit === ledSuit);

    if (suitCards.length > 0) {
      // Follow suit - try to win if possible, otherwise play low
      const winningCard = findCheapestWinner(suitCards, trick, trumpSuit);
      if (winningCard) return winningCard;
      // Can't win, play lowest
      return lowest(suitCards);
    }

    // Can't follow suit - trump if possible and worthwhile
    if (trumpSuit !== 'NT') {
      const trumpCards = hand.filter(c => c.suit === trumpSuit);
      if (trumpCards.length > 0) {
        // Check if partner is winning
        if (!isPartnerWinning(trick, seat, trumpSuit)) {
          return lowest(trumpCards);
        }
      }
    }

    // Discard lowest from weakest suit
    return lowest(hand);
  }

  // Leading - play from longest suit (non-trump), highest card
  const nonTrump = trumpSuit !== 'NT'
    ? hand.filter(c => c.suit !== trumpSuit)
    : hand;

  if (nonTrump.length > 0) {
    // Group by suit
    const suits = {};
    for (const c of nonTrump) {
      if (!suits[c.suit]) suits[c.suit] = [];
      suits[c.suit].push(c);
    }
    // Lead from longest suit, 4th best or highest
    const longestSuitCards = Object.values(suits).sort((a, b) => b.length - a.length)[0];
    if (longestSuitCards.length >= 4) {
      // 4th best lead
      const sorted = longestSuitCards.sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
      return sorted[3] || sorted[sorted.length - 1];
    }
    return highest(longestSuitCards);
  }

  return highest(hand);
}

function findCheapestWinner(suitCards, trick, trumpSuit) {
  // Find the current winning rank in the led suit
  const ledSuit = trick[0].card.suit;
  let highestRank = 0;
  for (const play of trick) {
    if (play.card.suit === ledSuit) {
      highestRank = Math.max(highestRank, RANK_VALUES[play.card.rank]);
    }
  }

  // Find cheapest card that beats it
  const winners = suitCards
    .filter(c => RANK_VALUES[c.rank] > highestRank)
    .sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]);

  return winners.length > 0 ? winners[0] : null;
}

function isPartnerWinning(trick, mySeat, trumpSuit) {
  if (trick.length === 0) return false;
  const partner = getPartner(mySeat);
  const ledSuit = trick[0].card.suit;
  let winnerSeat = trick[0].seat;
  let winnerRank = RANK_VALUES[trick[0].card.rank];
  let winnerIsTrump = trick[0].card.suit === trumpSuit;

  for (let i = 1; i < trick.length; i++) {
    const play = trick[i];
    const isTrump = play.card.suit === trumpSuit && trumpSuit !== 'NT';

    if (isTrump && !winnerIsTrump) {
      winnerSeat = play.seat;
      winnerRank = RANK_VALUES[play.card.rank];
      winnerIsTrump = true;
    } else if (play.card.suit === (winnerIsTrump ? trumpSuit : ledSuit)) {
      if (RANK_VALUES[play.card.rank] > winnerRank) {
        winnerSeat = play.seat;
        winnerRank = RANK_VALUES[play.card.rank];
      }
    }
  }

  return winnerSeat === partner;
}

function highest(cards) {
  return cards.reduce((best, c) =>
    RANK_VALUES[c.rank] > RANK_VALUES[best.rank] ? c : best
  );
}

function lowest(cards) {
  return cards.reduce((best, c) =>
    RANK_VALUES[c.rank] < RANK_VALUES[best.rank] ? c : best
  );
}

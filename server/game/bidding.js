// Bidding logic for contract bridge

export const BID_SUITS = ['C', 'D', 'H', 'S', 'NT'];
export const BID_SUIT_NAMES = { C: 'Clubs', D: 'Diamonds', H: 'Hearts', S: 'Spades', NT: 'No Trump' };
export const SEAT_ORDER = ['N', 'E', 'S', 'W'];

export function getPartner(seat) {
  const partners = { N: 'S', S: 'N', E: 'W', W: 'E' };
  return partners[seat];
}

export function getTeam(seat) {
  return (seat === 'N' || seat === 'S') ? 'NS' : 'EW';
}

export function nextSeat(seat) {
  const idx = SEAT_ORDER.indexOf(seat);
  return SEAT_ORDER[(idx + 1) % 4];
}

// Compare two bids: returns positive if bid a > bid b
export function compareBids(a, b) {
  if (a.level !== b.level) return a.level - b.level;
  return BID_SUITS.indexOf(a.suit) - BID_SUITS.indexOf(b.suit);
}

export function createBiddingState(dealer) {
  return {
    dealer,
    currentBidder: dealer,
    bids: [],           // Array of { seat, type, level?, suit? }
    lastBid: null,      // The last actual bid (not pass/double/redouble)
    doubled: false,
    redoubled: false,
    doubledBy: null,
    consecutivePasses: 0,
    isComplete: false,
    contract: null,     // Final contract if bidding complete
  };
}

export function getValidBids(biddingState) {
  const { lastBid, doubled, redoubled, consecutivePasses, bids, currentBidder } = biddingState;
  const validBids = [];

  // Can always pass
  validBids.push({ type: 'pass' });

  if (!lastBid) {
    // No bid yet, can bid anything from 1C to 7NT
    for (let level = 1; level <= 7; level++) {
      for (const suit of BID_SUITS) {
        validBids.push({ type: 'bid', level, suit });
      }
    }
    return validBids;
  }

  // Can make a higher bid
  for (let level = 1; level <= 7; level++) {
    for (const suit of BID_SUITS) {
      if (compareBids({ level, suit }, lastBid) > 0) {
        validBids.push({ type: 'bid', level, suit });
      }
    }
  }

  // Can double if last bid was by opponent and not already doubled
  if (!doubled && !redoubled) {
    const lastBidder = findLastBidder(bids);
    if (lastBidder && getTeam(lastBidder) !== getTeam(currentBidder)) {
      validBids.push({ type: 'double' });
    }
  }

  // Can redouble if doubled by opponent
  if (doubled && !redoubled) {
    if (getTeam(biddingState.doubledBy) !== getTeam(currentBidder)) {
      validBids.push({ type: 'redouble' });
    }
  }

  return validBids;
}

function findLastBidder(bids) {
  for (let i = bids.length - 1; i >= 0; i--) {
    if (bids[i].type === 'bid') return bids[i].seat;
  }
  return null;
}

export function makeBid(biddingState, bid) {
  const newState = { ...biddingState, bids: [...biddingState.bids, { ...bid, seat: biddingState.currentBidder }] };
  const currentSeat = biddingState.currentBidder;

  switch (bid.type) {
    case 'pass':
      newState.consecutivePasses = biddingState.consecutivePasses + 1;
      break;
    case 'bid':
      newState.lastBid = { level: bid.level, suit: bid.suit };
      newState.doubled = false;
      newState.redoubled = false;
      newState.doubledBy = null;
      newState.consecutivePasses = 0;
      break;
    case 'double':
      newState.doubled = true;
      newState.doubledBy = currentSeat;
      newState.consecutivePasses = 0;
      break;
    case 'redouble':
      newState.redoubled = true;
      newState.consecutivePasses = 0;
      break;
  }

  // Check if bidding is complete
  // All pass (4 passes with no bid) or 3 passes after a bid/double/redouble
  const totalBids = newState.bids.length;
  if (newState.consecutivePasses >= 3 && newState.lastBid) {
    newState.isComplete = true;
    newState.contract = resolveContract(newState);
  } else if (newState.consecutivePasses >= 4 && !newState.lastBid) {
    // All four players passed - passed out
    newState.isComplete = true;
    newState.contract = null; // Passed out
  }

  if (!newState.isComplete) {
    newState.currentBidder = nextSeat(currentSeat);
  }

  return newState;
}

function resolveContract(biddingState) {
  const { lastBid, doubled, redoubled, bids } = biddingState;
  if (!lastBid) return null;

  // Find declarer: the first player of the declaring side who bid the contract suit
  const lastBidEntry = [...bids].reverse().find(b => b.type === 'bid');
  const declaringTeam = getTeam(lastBidEntry.seat);

  let declarer = null;
  for (const b of bids) {
    if (b.type === 'bid' && b.suit === lastBid.suit && getTeam(b.seat) === declaringTeam) {
      declarer = b.seat;
      break;
    }
  }

  return {
    level: lastBid.level,
    suit: lastBid.suit,
    declarer,
    dummy: getPartner(declarer),
    defender1: nextSeat(declarer),
    defender2: getPartner(nextSeat(declarer)),
    doubled,
    redoubled,
    tricksNeeded: 6 + lastBid.level,
  };
}

export function formatBid(bid) {
  switch (bid.type) {
    case 'pass': return 'Pass';
    case 'double': return 'Dbl';
    case 'redouble': return 'Rdbl';
    case 'bid': return `${bid.level}${bid.suit}`;
    default: return '?';
  }
}

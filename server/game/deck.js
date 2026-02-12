// Card constants and deck operations

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
export const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const HCP_VALUES = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1 };

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

// Fisher-Yates shuffle
export function shuffle(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function deal(deck) {
  const hands = { N: [], E: [], S: [], W: [] };
  const seats = ['N', 'E', 'S', 'W'];
  for (let i = 0; i < 52; i++) {
    hands[seats[i % 4]].push(deck[i]);
  }
  // Sort each hand by suit then rank (descending)
  for (const seat of seats) {
    hands[seat] = sortHand(hands[seat]);
  }
  return hands;
}

export function sortHand(cards) {
  return [...cards].sort((a, b) => {
    const suitOrder = SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    if (suitOrder !== 0) return suitOrder;
    return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
  });
}

export function calculateHCP(cards) {
  return cards.reduce((total, card) => total + (HCP_VALUES[card.rank] || 0), 0);
}

export function cardToString(card) {
  return `${card.rank}${card.suit}`;
}

export function cardEquals(a, b) {
  return a.suit === b.suit && a.rank === b.rank;
}

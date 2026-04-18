// Chicago (four-deal) Bridge scoring

import { getTeam } from './bidding.js';

const SEAT_ORDER = ['N', 'E', 'S', 'W'];

// Determine vulnerability for a given deal in a chukker (0-3)
export function getVulnerability(dealNumber, dealer) {
  // Deal 0: Neither vulnerable
  // Deal 1: Dealer's side vulnerable
  // Deal 2: Dealer's side vulnerable
  // Deal 3: Both vulnerable
  const dealInChukker = dealNumber % 4;
  const dealerTeam = getTeam(dealer);

  switch (dealInChukker) {
    case 0: return { NS: false, EW: false };
    case 1:
    case 2: return {
      NS: dealerTeam === 'NS',
      EW: dealerTeam === 'EW',
    };
    case 3: return { NS: true, EW: true };
    default: return { NS: false, EW: false };
  }
}

// Get dealer for a given deal number (rotates clockwise)
export function getDealerForDeal(dealNumber, firstDealer) {
  const startIdx = SEAT_ORDER.indexOf(firstDealer);
  return SEAT_ORDER[(startIdx + dealNumber) % 4];
}

// Calculate score for a completed hand
export function calculateScore(contract, tricksMade, vulnerability) {
  if (!contract) return { NS: 0, EW: 0 }; // Passed out

  const { level, suit, declarer, doubled, redoubled } = contract;
  const declarerTeam = getTeam(declarer);
  const isVulnerable = vulnerability[declarerTeam];
  const tricksNeeded = 6 + level;
  const overtricks = tricksMade - tricksNeeded;
  const undertricks = tricksNeeded - tricksMade;

  let declarerScore = 0;
  let defenderScore = 0;

  if (overtricks >= 0) {
    // Contract made
    declarerScore = contractPoints(level, suit, doubled, redoubled)
      + overtrickPoints(overtricks, suit, doubled, redoubled, isVulnerable)
      + gameBonus(level, suit, doubled, redoubled, isVulnerable)
      + slamBonus(level, isVulnerable)
      + insultBonus(doubled, redoubled);
  } else {
    // Contract defeated
    defenderScore = undertrickPenalty(undertricks, doubled, redoubled, isVulnerable);
  }

  const result = { NS: 0, EW: 0 };
  if (declarerTeam === 'NS') {
    result.NS = declarerScore;
    result.EW = defenderScore;
  } else {
    result.EW = declarerScore;
    result.NS = defenderScore;
  }

  return result;
}

function trickValue(suit) {
  if (suit === 'C' || suit === 'D') return 20;
  if (suit === 'H' || suit === 'S') return 30;
  return 30; // NT base (first trick is 40, handled in contractPoints)
}

function contractPoints(level, suit, doubled, redoubled) {
  let points;
  if (suit === 'NT') {
    points = 40 + (level - 1) * 30;
  } else {
    points = level * trickValue(suit);
  }
  if (redoubled) return points * 4;
  if (doubled) return points * 2;
  return points;
}

function overtrickPoints(overtricks, suit, doubled, redoubled, isVulnerable) {
  if (overtricks <= 0) return 0;
  if (redoubled) {
    return overtricks * (isVulnerable ? 400 : 200);
  }
  if (doubled) {
    return overtricks * (isVulnerable ? 200 : 100);
  }
  // NT overtricks are 30 each (not 40)
  if (suit === 'NT') return overtricks * 30;
  return overtricks * trickValue(suit);
}

function gameBonus(level, suit, doubled, redoubled, isVulnerable) {
  const cp = contractPoints(level, suit, doubled, redoubled);
  if (cp >= 100) {
    // Game bonus
    return isVulnerable ? 500 : 300;
  }
  // Partial bonus
  return 50;
}

function slamBonus(level, isVulnerable) {
  if (level === 7) return isVulnerable ? 1500 : 1000; // Grand slam
  if (level === 6) return isVulnerable ? 750 : 500;   // Small slam
  return 0;
}

function insultBonus(doubled, redoubled) {
  if (redoubled) return 100;
  if (doubled) return 50;
  return 0;
}

function undertrickPenalty(undertricks, doubled, redoubled, isVulnerable) {
  if (!doubled && !redoubled) {
    return undertricks * (isVulnerable ? 100 : 50);
  }

  let penalty = 0;
  const multiplier = redoubled ? 2 : 1;

  for (let i = 1; i <= undertricks; i++) {
    if (isVulnerable) {
      if (i === 1) penalty += 200 * multiplier;
      else penalty += 300 * multiplier;
    } else {
      if (i === 1) penalty += 100 * multiplier;
      else if (i <= 3) penalty += 200 * multiplier;
      else penalty += 300 * multiplier;
    }
  }

  return penalty;
}

// Format contract for display
export function formatContract(contract) {
  if (!contract) return 'Passed Out';
  let str = `${contract.level}${contract.suit}`;
  if (contract.redoubled) str += 'XX';
  else if (contract.doubled) str += 'X';
  str += ` by ${contract.declarer}`;
  return str;
}

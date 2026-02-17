import { differenceInYears, differenceInDays, format, addYears, isBefore, isAfter, startOfDay } from 'date-fns';

export function getAge(dob) {
  return differenceInYears(new Date(), new Date(dob));
}

export function getNextBirthday(dob) {
  const today = startOfDay(new Date());
  const birth = new Date(dob);
  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (isBefore(next, today)) {
    next = addYears(next, 1);
  }
  return next;
}

export function getDaysUntilBirthday(dob) {
  const today = startOfDay(new Date());
  const next = getNextBirthday(dob);
  return differenceInDays(next, today);
}

export function formatDate(date) {
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatRelativeDate(date) {
  const days = differenceInDays(new Date(), new Date(date));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return 'Last month';
  return `${Math.floor(days / 30)} months ago`;
}

export function daysSince(date) {
  if (!date) return Infinity;
  return differenceInDays(new Date(), new Date(date));
}

// The one place dates, times and money are formatted. Dates travel as
// 'YYYY-MM-DD' and times as 'HH:MM' (24-hour clinic time); both are built from
// their parts so nothing shifts with the browser's time zone.

const LOCALE = 'en-GB';
const pad = (n) => String(n).padStart(2, '0');

export function parseDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return toDateString(date);
}

export function addDays(value, days) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

// 'Thu, 1 Oct' — the year is added only when it is not the current one.
export function formatDate(value) {
  if (!value) return '';
  const date = parseDate(value);
  const weekday = date.toLocaleDateString(LOCALE, { weekday: 'short' });
  const options = { day: 'numeric', month: 'short' };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
  return `${weekday}, ${date.toLocaleDateString(LOCALE, options)}`;
}

// 'Thursday, 1 October 2026' — for detail views and calendar exports.
export function formatDateLong(value) {
  if (!value) return '';
  return parseDate(value).toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// 'Today', 'Tomorrow', or 'Thu, 1 Oct'.
export function formatRelativeDate(value) {
  if (value === todayDate()) return 'Today';
  if (value === todayDate(1)) return 'Tomorrow';
  return formatDate(value);
}

export function formatTime(value) {
  return value ? value.slice(0, 5) : '';
}

// 'Thu, 1 Oct · 09:00'
export function formatDateTime(date, time, { relative = false } = {}) {
  return `${relative ? formatRelativeDate(date) : formatDate(date)} · ${formatTime(time)}`;
}

export function dateParts(value) {
  const date = parseDate(value);
  return {
    weekday: date.toLocaleDateString(LOCALE, { weekday: 'short' }),
    day: date.getDate(),
    month: date.toLocaleDateString(LOCALE, { month: 'short' }),
    dayIndex: date.getDay(),
  };
}

// A timestamp from the API ('2026-10-01T09:12:00.000Z') as local 'HH:MM' when
// it is from today, otherwise as a short date such as '30 Sep'.
export function formatClock(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (toDateString(date) !== todayDate()) {
    return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const feeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatFee(value) {
  return feeFormatter.format(value);
}

// 'about 15 min', 'about 1 h 10 min', or 'no wait'.
export function formatWait(minutes) {
  if (minutes === null || minutes === undefined) return '';
  if (minutes < 1) return 'no wait';
  if (minutes < 60) return `about ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `about ${hours} h${rest ? ` ${rest} min` : ''}`;
}

// A doctor's pace today: 'On time' or '13 min behind'. Under five minutes
// counts as on time.
export function paceText(delayMinutes) {
  return delayMinutes >= 5 ? `${delayMinutes} min behind` : 'On time';
}

export function firstName(name = '') {
  return name.trim().split(/\s+/)[0] || '';
}

// Initials for avatars, ignoring a leading title such as 'Dr.'.
export function initials(name = '') {
  const words = name.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '').trim().split(/\s+/);
  return ((words[0]?.[0] || '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

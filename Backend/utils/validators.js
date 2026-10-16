const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Password: 8+ chars with at least one letter and one number. */
function passwordError(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Parse a route id param; returns null if it is not a positive integer. */
function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

module.exports = {
  EMAIL_REGEX,
  PHONE_REGEX,
  str,
  passwordError,
  parseDate,
  isHttpUrl,
  parseId,
};

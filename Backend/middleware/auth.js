const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { fail } = require('../utils/response');

/** Verify the Bearer JWT and attach the current user to req.user. */
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return fail(res, 401, 'Authentication required. Please log in.');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid token. Please log in again.';
    return fail(res, 401, message);
  }

  try {
    // Re-load the user so deleted accounts / changed roles take effect immediately.
    const { rows } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [payload.id]
    );
    if (rows.length === 0) {
      return fail(res, 401, 'Account no longer exists');
    }
    req.user = rows[0];
    return next();
  } catch (error) {
    return next(error);
  }
};

/** Allow only the given roles (use after authenticate). */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, 'You do not have permission to perform this action');
    }
    return next();
  };

module.exports = { authenticate, authorize };

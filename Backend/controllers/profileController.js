const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { ok, fail, invalid } = require('../utils/response');
const { EMAIL_REGEX, PHONE_REGEX, str, passwordError } = require('../utils/validators');
const { publicUser, SALT_ROUNDS } = require('./authController');

/** GET /api/profile */
const getProfile = async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  return ok(res, publicUser(rows[0]));
};

/**
 * PUT /api/profile
 * Body: { name, email, phone?, bio? }
 */
const updateProfile = async (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const phone = str(req.body.phone);
  const bio = str(req.body.bio);

  const errors = {};
  if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  if (!EMAIL_REGEX.test(email)) errors.email = 'Please provide a valid email address';
  if (phone && !PHONE_REGEX.test(phone)) errors.phone = 'Please provide a valid phone number';
  if (bio.length > 300) errors.bio = 'Bio must be 300 characters or fewer';
  if (Object.keys(errors).length) return invalid(res, errors);

  const taken = await pool.query('SELECT id FROM users WHERE email = $1 AND id <> $2', [
    email,
    req.user.id,
  ]);
  if (taken.rows.length > 0) {
    return fail(res, 409, 'Another account is already using this email', {
      email: 'Email already in use',
    });
  }

  const { rows } = await pool.query(
    `UPDATE users
     SET name = $1, email = $2, phone = $3, bio = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING *`,
    [name, email, phone || null, bio || null, req.user.id]
  );
  return ok(res, publicUser(rows[0]), 'Profile updated successfully');
};

/**
 * PUT /api/profile/password
 * Body: { currentPassword, newPassword }
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const errors = {};
  if (typeof currentPassword !== 'string' || !currentPassword) {
    errors.currentPassword = 'Current password is required';
  }
  const pwError = passwordError(newPassword);
  if (pwError) errors.newPassword = pwError;
  else if (newPassword === currentPassword) {
    errors.newPassword = 'New password must be different from the current password';
  }
  if (Object.keys(errors).length) return invalid(res, errors);

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
    req.user.id,
  ]);
  const matches = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!matches) {
    return fail(res, 400, 'Current password is incorrect', {
      currentPassword: 'Current password is incorrect',
    });
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [hash, req.user.id]
  );
  return ok(res, undefined, 'Password changed successfully');
};

module.exports = { getProfile, updateProfile, changePassword };

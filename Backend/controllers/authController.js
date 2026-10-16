const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { ok, created, fail, invalid } = require('../utils/response');
const { EMAIL_REGEX, str, passwordError } = require('../utils/validators');

const SALT_ROUNDS = 10;
const ROLES = ['student', 'teacher'];

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/** Never return the password hash. */
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone ?? null,
  bio: u.bio ?? null,
  created_at: u.created_at,
});

/**
 * POST /api/auth/register
 * Body: { name, email, password, role? }
 */
const register = async (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const { password } = req.body;
  const role = req.body.role ? str(req.body.role).toLowerCase() : 'student';

  const errors = {};
  if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  if (!EMAIL_REGEX.test(email)) errors.email = 'Please provide a valid email address';
  const pwError = passwordError(password);
  if (pwError) errors.password = pwError;
  if (!ROLES.includes(role)) errors.role = `Role must be one of: ${ROLES.join(', ')}`;
  if (Object.keys(errors).length) return invalid(res, errors);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return fail(res, 409, 'An account with this email already exists', {
      email: 'Email already registered',
    });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, email, passwordHash, role]
  );

  const user = rows[0];
  return created(res, { user: publicUser(user), token: signToken(user) }, 'Registration successful');
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  const email = str(req.body.email).toLowerCase();
  const { password } = req.body;

  if (!email || typeof password !== 'string' || !password) {
    return invalid(res, {
      ...(!email && { email: 'Email is required' }),
      ...(!password && { password: 'Password is required' }),
    });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  // Same message for unknown email and wrong password to avoid leaking which emails exist.
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) return fail(res, 401, 'Invalid email or password');

  return ok(res, { user: publicUser(user), token: signToken(user) }, 'Login successful');
};

/** GET /api/auth/me – the logged-in user (used to restore a session). */
const me = async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  return ok(res, publicUser(rows[0]));
};

module.exports = { register, login, me, publicUser, SALT_ROUNDS };

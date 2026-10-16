/** Consistent JSON response helpers: { success, message, data?, errors?, count? } */

const ok = (res, data, message, status = 200) => {
  const body = { success: true };
  if (message) body.message = message;
  if (Array.isArray(data)) body.count = data.length;
  if (data !== undefined) body.data = data;
  return res.status(status).json(body);
};

const created = (res, data, message) => ok(res, data, message, 201);

const fail = (res, status, message, errors) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
};

const invalid = (res, errors) =>
  fail(res, 400, 'Validation failed', errors);

const serverError = (res, error, context) => {
  console.error(`Error ${context}:`, error.message);
  return fail(res, 500, 'Internal server error');
};

/** Wrap async handlers so thrown errors reach the global error handler. */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ok, created, fail, invalid, serverError, asyncHandler };

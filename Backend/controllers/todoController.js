const pool = require('../config/db');
const { ok, created, fail, invalid } = require('../utils/response');
const { str, parseId, parseDate } = require('../utils/validators');

/** GET /api/todos?status=all|active|completed */
const listTodos = async (req, res) => {
  const status = str(req.query.status) || 'all';
  const filter =
    status === 'active' ? 'AND completed = FALSE' : status === 'completed' ? 'AND completed = TRUE' : '';

  const { rows } = await pool.query(
    `SELECT * FROM todos WHERE user_id = $1 ${filter}
     ORDER BY completed ASC, due_date ASC NULLS LAST, created_at DESC`,
    [req.user.id]
  );
  return ok(res, rows);
};

/** POST /api/todos – Body: { title, notes?, due_date? } */
const createTodo = async (req, res) => {
  const title = str(req.body.title);
  const notes = str(req.body.notes);
  const dueDate = req.body.due_date ? parseDate(req.body.due_date) : null;

  const errors = {};
  if (!title) errors.title = 'Title is required';
  else if (title.length > 255) errors.title = 'Title must be 255 characters or fewer';
  if (req.body.due_date && !dueDate) errors.due_date = 'Due date is not valid';
  if (Object.keys(errors).length) return invalid(res, errors);

  const { rows } = await pool.query(
    'INSERT INTO todos (user_id, title, notes, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.user.id, title, notes || null, dueDate]
  );
  return created(res, rows[0], 'Task added');
};

/**
 * PUT|PATCH /api/todos/:id – partial update: any of { title, notes, due_date, completed }.
 * Users can only touch their own tasks.
 */
const updateTodo = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid task id');

  const existing = await pool.query('SELECT * FROM todos WHERE id = $1 AND user_id = $2', [
    id,
    req.user.id,
  ]);
  if (existing.rows.length === 0) return fail(res, 404, 'Task not found');
  const todo = existing.rows[0];
  const body = req.body;
  const errors = {};

  const title = body.title !== undefined ? str(body.title) : todo.title;
  if (!title) errors.title = 'Title is required';
  else if (title.length > 255) errors.title = 'Title must be 255 characters or fewer';

  const notes = body.notes !== undefined ? str(body.notes) || null : todo.notes;

  let dueDate = todo.due_date;
  if (body.due_date !== undefined) {
    dueDate = body.due_date ? parseDate(body.due_date) : null;
    if (body.due_date && !dueDate) errors.due_date = 'Due date is not valid';
  }

  let completed = todo.completed;
  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') errors.completed = 'completed must be true or false';
    else completed = body.completed;
  }
  if (Object.keys(errors).length) return invalid(res, errors);

  const { rows } = await pool.query(
    `UPDATE todos SET title = $1, notes = $2, due_date = $3, completed = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $5 RETURNING *`,
    [title, notes, dueDate, completed, id]
  );
  return ok(res, rows[0], 'Task updated');
};

/** DELETE /api/todos/:id */
const deleteTodo = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid task id');

  const { rows } = await pool.query(
    'DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, req.user.id]
  );
  if (rows.length === 0) return fail(res, 404, 'Task not found');
  return ok(res, { id }, 'Task deleted');
};

module.exports = { listTodos, createTodo, updateTodo, deleteTodo };

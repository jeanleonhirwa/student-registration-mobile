import pool from '../config/db.js';
import { ok, created, fail, invalid } from '../utils/response.js';
import { str, parseId, parseDate } from '../utils/validators.js';

// Columns shared by list and detail queries. `enrolled` and counts are per-request.
const COURSE_SELECT = `
  c.id, c.code, c.title, c.description, c.category,
  COALESCE(t.name, c.instructor) AS instructor, c.teacher_id,
  (c.teacher_id = $1) AS mine,
  c.start_date, c.end_date,
  (c.start_date <= CURRENT_DATE) AS started,
  (c.end_date IS NOT NULL AND c.end_date < CURRENT_DATE) AS ended,
  EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $1) AS enrolled,
  (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count,
  (SELECT COUNT(*)::int FROM assignments a WHERE a.course_id = c.id) AS assignment_count
`;

/**
 * GET /api/courses?search=&category=&status=all|enrolled|available
 * Returns each course with an `enrolled` flag for the logged-in user.
 */
const listCourses = async (req, res) => {
  const search = str(req.query.search);
  const category = str(req.query.category);
  const status = str(req.query.status) || 'all';

  const params = [req.user.id];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(c.title ILIKE $${params.length} OR c.code ILIKE $${params.length} OR COALESCE(t.name, c.instructor) ILIKE $${params.length})`
    );
  }
  if (category && category.toLowerCase() !== 'all') {
    params.push(category);
    where.push(`c.category = $${params.length}`);
  }
  const enrolledSql = 'EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $1)';
  if (status === 'enrolled') where.push(enrolledSql);
  else if (status === 'available') where.push(`NOT ${enrolledSql}`);
  else if (status === 'mine') where.push('c.teacher_id = $1');
  else if (status === 'unassigned') where.push('c.teacher_id IS NULL');

  const { rows } = await pool.query(
    `SELECT ${COURSE_SELECT} FROM courses c LEFT JOIN users t ON t.id = c.teacher_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY c.start_date ASC, c.title ASC`,
    params
  );
  return ok(res, rows);
};

/** GET /api/courses/categories */
const listCategories = async (req, res) => {
  const { rows } = await pool.query('SELECT DISTINCT category FROM courses ORDER BY category');
  return ok(res, rows.map((r) => r.category));
};

/** GET /api/courses/:id */
const getCourse = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid course id');

  const { rows } = await pool.query(`SELECT ${COURSE_SELECT} FROM courses c LEFT JOIN users t ON t.id = c.teacher_id WHERE c.id = $2`, [
    req.user.id,
    id,
  ]);
  if (rows.length === 0) return fail(res, 404, 'Course not found');

  const course = rows[0];
  const assignments = await pool.query(
    `SELECT a.id, a.title, a.due_date, (a.due_date < NOW()) AS is_overdue,
            EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $1) AS submitted
     FROM assignments a WHERE a.course_id = $2 ORDER BY a.due_date ASC`,
    [req.user.id, id]
  );

  return ok(res, {
    ...course,
    can_unenroll: course.enrolled && !course.started,
    // Only enrolled students (and teachers) can see the classwork list.
    assignments: course.enrolled || req.user.role === 'teacher' ? assignments.rows : [],
  });
};

/** POST /api/courses/:id/enroll (students) */
const enroll = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid course id');

  const { rows } = await pool.query(
    `SELECT id, title, (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS ended
     FROM courses WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) return fail(res, 404, 'Course not found');
  if (rows[0].ended) return fail(res, 400, 'This course has already ended');

  const result = await pool.query(
    `INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2)
     ON CONFLICT (student_id, course_id) DO NOTHING RETURNING id`,
    [req.user.id, id]
  );
  if (result.rows.length === 0) return fail(res, 409, 'You are already enrolled in this course');

  return created(res, { course_id: id }, `Enrolled in ${rows[0].title}`);
};

/** DELETE /api/courses/:id/enroll – only allowed before the course starts. */
const unenroll = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid course id');

  const { rows } = await pool.query(
    `SELECT c.title, (c.start_date <= CURRENT_DATE) AS started
     FROM enrollments e JOIN courses c ON c.id = e.course_id
     WHERE e.student_id = $1 AND e.course_id = $2`,
    [req.user.id, id]
  );
  if (rows.length === 0) return fail(res, 404, 'You are not enrolled in this course');
  if (rows[0].started) {
    return fail(res, 400, 'You cannot unenroll because this course has already started');
  }

  await pool.query('DELETE FROM enrollments WHERE student_id = $1 AND course_id = $2', [
    req.user.id,
    id,
  ]);
  return ok(res, { course_id: id }, `Unenrolled from ${rows[0].title}`);
};

/**
 * POST /api/courses (teachers) – create a course; the creator becomes its (only) teacher.
 * Body: { code, title, description?, category?, start_date, end_date? }
 */
const createCourse = async (req, res) => {
  const code = str(req.body.code).toUpperCase();
  const title = str(req.body.title);
  const description = str(req.body.description);
  const category = str(req.body.category) || 'General';
  const start = parseDate(req.body.start_date);
  const end = req.body.end_date ? parseDate(req.body.end_date) : null;

  const errors = {};
  if (!/^[A-Z0-9-]{2,20}$/.test(code)) errors.code = 'Code must be 2-20 letters, numbers or dashes (e.g. CS101)';
  if (title.length < 3) errors.title = 'Title must be at least 3 characters';
  if (!start) errors.start_date = 'A valid start date is required';
  if (req.body.end_date && !end) errors.end_date = 'End date is not valid';
  else if (start && end && end < start) errors.end_date = 'End date must be after the start date';
  if (Object.keys(errors).length) return invalid(res, errors);

  const day = (d) => d.toISOString().slice(0, 10);
  const taken = await pool.query('SELECT 1 FROM courses WHERE code = $1', [code]);
  if (taken.rows.length) return fail(res, 409, 'A course with this code already exists', { code: 'Code already in use' });

  const { rows } = await pool.query(
    `INSERT INTO courses (code, title, description, category, instructor, teacher_id, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [code, title, description || null, category, req.user.name, req.user.id, day(start), end ? day(end) : null]
  );
  return created(res, { id: rows[0].id }, 'Course created. You are now its teacher.');
};

/** POST /api/courses/:id/claim (teachers) – become the teacher of an unassigned course. */
const claimCourse = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid course id');

  // Single atomic UPDATE guarantees a course never ends up with two teachers.
  const { rows } = await pool.query(
    `UPDATE courses SET teacher_id = $1, instructor = $2
     WHERE id = $3 AND teacher_id IS NULL RETURNING title`,
    [req.user.id, req.user.name, id]
  );
  if (rows.length) return ok(res, { course_id: id }, `You now teach ${rows[0].title}`);

  const exists = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [id]);
  if (!exists.rows.length) return fail(res, 404, 'Course not found');
  return fail(
    res,
    409,
    exists.rows[0].teacher_id === req.user.id
      ? 'You already teach this course'
      : 'This course is already taught by another teacher'
  );
};

/** DELETE /api/courses/:id/claim (owner teacher) – stop teaching a course. */
const releaseCourse = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid course id');

  const { rows } = await pool.query(
    `UPDATE courses SET teacher_id = NULL, instructor = NULL
     WHERE id = $1 AND teacher_id = $2 RETURNING title`,
    [id, req.user.id]
  );
  if (!rows.length) return fail(res, 403, 'You can only release courses you teach');
  return ok(res, { course_id: id }, `You no longer teach ${rows[0].title}`);
};

export {
  listCourses,
  listCategories,
  getCourse,
  enroll,
  unenroll,
  createCourse,
  claimCourse,
  releaseCourse,
};

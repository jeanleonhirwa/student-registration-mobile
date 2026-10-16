const pool = require('../config/db');
const { ok, created, fail } = require('../utils/response');
const { str, parseId } = require('../utils/validators');

// Columns shared by list and detail queries. `enrolled` and counts are per-request.
const COURSE_SELECT = `
  c.id, c.code, c.title, c.description, c.category, c.instructor,
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
      `(c.title ILIKE $${params.length} OR c.code ILIKE $${params.length} OR c.instructor ILIKE $${params.length})`
    );
  }
  if (category && category.toLowerCase() !== 'all') {
    params.push(category);
    where.push(`c.category = $${params.length}`);
  }
  const enrolledSql = 'EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $1)';
  if (status === 'enrolled') where.push(enrolledSql);
  else if (status === 'available') where.push(`NOT ${enrolledSql}`);

  const { rows } = await pool.query(
    `SELECT ${COURSE_SELECT} FROM courses c
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

  const { rows } = await pool.query(`SELECT ${COURSE_SELECT} FROM courses c WHERE c.id = $2`, [
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

module.exports = { listCourses, listCategories, getCourse, enroll, unenroll };

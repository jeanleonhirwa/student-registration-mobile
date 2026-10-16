const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { UPLOAD_DIR } = require('../middleware/upload');
const { ok, created, fail, invalid } = require('../utils/response');
const { str, parseId, parseDate, isHttpUrl } = require('../utils/validators');

const removeFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(path.join(UPLOAD_DIR, filePath), () => {});
};

const fileUrl = (req, filePath) =>
  filePath ? `${req.protocol}://${req.get('host')}/uploads/${filePath}` : null;

const formatSubmission = (req, s) =>
  s && {
    id: s.id,
    link_url: s.link_url,
    file_name: s.file_name,
    file_url: fileUrl(req, s.file_path),
    submitted_at: s.submitted_at,
    is_late: s.is_late,
    ...(s.student_name && { student_id: s.student_id, student_name: s.student_name }),
  };

/** Assignment row → API shape: hide the stored path, expose a download URL. */
const formatAssignment = (req, a) => {
  const { file_path: filePath, ...rest } = a;
  return { ...rest, file_url: fileUrl(req, filePath) };
};

/** Is the student enrolled in the assignment's course? */
const isEnrolled = async (studentId, courseId) => {
  const { rows } = await pool.query(
    'SELECT 1 FROM enrollments WHERE student_id = $1 AND course_id = $2',
    [studentId, courseId]
  );
  return rows.length > 0;
};

const validateAssignment = (body, { requireFutureDate }) => {
  const title = str(body.title);
  const description = str(body.description);
  const dueDate = parseDate(body.due_date);
  const link = str(body.link_url);
  const errors = {};

  if (title.length < 3) errors.title = 'Title must be at least 3 characters';
  if (title.length > 255) errors.title = 'Title must be 255 characters or fewer';
  if (!dueDate) errors.due_date = 'A valid due date is required';
  else if (requireFutureDate && dueDate <= new Date()) {
    errors.due_date = 'Due date must be in the future';
  }
  if (link && !isHttpUrl(link)) errors.link_url = 'Link must be a valid http(s) URL';
  return { errors, values: { title, description, dueDate, link } };
};

/**
 * GET /api/assignments?status=all|pending|submitted|overdue&course_id=
 * Students: assignments of their enrolled courses. Teachers: assignments they created.
 */
const listAssignments = async (req, res) => {
  const status = str(req.query.status) || 'all';
  const courseId = parseId(req.query.course_id);
  const isTeacher = req.user.role === 'teacher';

  const params = [req.user.id];
  const where = [];
  if (isTeacher) where.push('a.teacher_id = $1');
  else where.push('a.course_id IN (SELECT course_id FROM enrollments WHERE student_id = $1)');

  if (courseId) {
    params.push(courseId);
    where.push(`a.course_id = $${params.length}`);
  }

  const submittedSql = 'EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $1)';
  if (!isTeacher) {
    if (status === 'submitted') where.push(submittedSql);
    else if (status === 'pending') where.push(`NOT ${submittedSql} AND a.due_date >= NOW()`);
    else if (status === 'overdue') where.push(`NOT ${submittedSql} AND a.due_date < NOW()`);
  }

  const { rows } = await pool.query(
    `SELECT a.id, a.course_id, c.title AS course_title, c.code AS course_code,
            a.title, a.description, a.due_date, (a.due_date < NOW()) AS is_overdue,
            ${isTeacher ? 'NULL::boolean' : submittedSql} AS submitted,
            (SELECT COUNT(*)::int FROM submissions s WHERE s.assignment_id = a.id) AS submission_count
     FROM assignments a JOIN courses c ON c.id = a.course_id
     WHERE ${where.join(' AND ')}
     ORDER BY a.due_date ASC`,
    params
  );
  return ok(res, rows);
};

/** GET /api/assignments/upcoming?days=7 – not-yet-submitted work due soon (students). */
const upcomingAssignments = async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 60);
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.due_date, c.title AS course_title, c.code AS course_code
     FROM assignments a JOIN courses c ON c.id = a.course_id
     WHERE a.course_id IN (SELECT course_id FROM enrollments WHERE student_id = $1)
       AND a.due_date BETWEEN NOW() AND NOW() + ($2 || ' days')::interval
       AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $1)
     ORDER BY a.due_date ASC`,
    [req.user.id, String(days)]
  );
  return ok(res, rows);
};

/** GET /api/assignments/:id */
const getAssignment = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid assignment id');

  const { rows } = await pool.query(
    `SELECT a.*, (a.due_date < NOW()) AS is_overdue, c.title AS course_title, c.code AS course_code
     FROM assignments a JOIN courses c ON c.id = a.course_id WHERE a.id = $1`,
    [id]
  );
  if (rows.length === 0) return fail(res, 404, 'Assignment not found');
  const assignment = rows[0];

  if (req.user.role === 'teacher') {
    if (assignment.teacher_id !== req.user.id) {
      return fail(res, 403, 'You can only view assignments you created');
    }
    const subs = await pool.query(
      `SELECT s.*, u.name AS student_name, (s.submitted_at > $2) AS is_late
       FROM submissions s JOIN users u ON u.id = s.student_id
       WHERE s.assignment_id = $1 ORDER BY s.submitted_at ASC`,
      [id, assignment.due_date]
    );
    return ok(res, { ...formatAssignment(req, assignment), submissions: subs.rows.map((s) => formatSubmission(req, s)) });
  }

  if (!(await isEnrolled(req.user.id, assignment.course_id))) {
    return fail(res, 403, 'Enroll in this course to view its assignments');
  }
  const sub = await pool.query(
    `SELECT s.*, (s.submitted_at > $3) AS is_late FROM submissions s
     WHERE s.assignment_id = $1 AND s.student_id = $2`,
    [id, req.user.id, assignment.due_date]
  );
  return ok(res, { ...formatAssignment(req, assignment), submission: formatSubmission(req, sub.rows[0]) ?? null });
};

/**
 * POST /api/assignments (teachers)
 * multipart/form-data: course_id, title, description?, due_date, link_url? and/or file?
 */
const createAssignment = async (req, res) => {
  const uploaded = req.file;
  const discardUpload = () => uploaded && removeFile(uploaded.filename);

  const courseId = parseId(req.body.course_id);
  const { errors, values } = validateAssignment(req.body, { requireFutureDate: true });
  if (!courseId) errors.course_id = 'A valid course is required';
  if (Object.keys(errors).length) {
    discardUpload();
    return invalid(res, errors);
  }

  const course = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
  if (course.rows.length === 0) {
    discardUpload();
    return fail(res, 404, 'Course not found');
  }

  const { rows } = await pool.query(
    `INSERT INTO assignments (course_id, teacher_id, title, description, due_date, link_url, file_path, file_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      courseId,
      req.user.id,
      values.title,
      values.description || null,
      values.dueDate,
      values.link || null,
      uploaded?.filename ?? null,
      uploaded?.originalname ?? null,
    ]
  );
  return created(res, formatAssignment(req, rows[0]), 'Assignment created successfully');
};

/**
 * PUT /api/assignments/:id (owner teacher)
 * multipart/form-data: same fields as create (minus course_id). The link is replaced by
 * `link_url` (empty clears it); a new `file` replaces the document; `remove_file=true` deletes it.
 */
const updateAssignment = async (req, res) => {
  const uploaded = req.file;
  const discardUpload = () => uploaded && removeFile(uploaded.filename);

  const id = parseId(req.params.id);
  if (!id) {
    discardUpload();
    return fail(res, 400, 'Invalid assignment id');
  }

  const existing = await pool.query('SELECT teacher_id, file_path, file_name FROM assignments WHERE id = $1', [id]);
  if (existing.rows.length === 0) {
    discardUpload();
    return fail(res, 404, 'Assignment not found');
  }
  if (existing.rows[0].teacher_id !== req.user.id) {
    discardUpload();
    return fail(res, 403, 'You can only edit assignments you created');
  }

  // Past dates are allowed on edit so a teacher can fix typos on an already-closed assignment.
  const { errors, values } = validateAssignment(req.body, { requireFutureDate: false });
  if (Object.keys(errors).length) {
    discardUpload();
    return invalid(res, errors);
  }

  const old = existing.rows[0];
  const dropOld = !!uploaded || String(req.body.remove_file) === 'true';
  const filePath = uploaded ? uploaded.filename : dropOld ? null : old.file_path;
  const fileName = uploaded ? uploaded.originalname : dropOld ? null : old.file_name;

  const { rows } = await pool.query(
    `UPDATE assignments
     SET title = $1, description = $2, due_date = $3, link_url = $4, file_path = $5, file_name = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7 RETURNING *`,
    [values.title, values.description || null, values.dueDate, values.link || null, filePath, fileName, id]
  );
  if (dropOld) removeFile(old.file_path);
  return ok(res, formatAssignment(req, rows[0]), 'Assignment updated successfully');
};

/** DELETE /api/assignments/:id (owner teacher) */
const deleteAssignment = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return fail(res, 400, 'Invalid assignment id');

  const existing = await pool.query('SELECT teacher_id, file_path FROM assignments WHERE id = $1', [id]);
  if (existing.rows.length === 0) return fail(res, 404, 'Assignment not found');
  if (existing.rows[0].teacher_id !== req.user.id) {
    return fail(res, 403, 'You can only delete assignments you created');
  }

  const files = await pool.query('SELECT file_path FROM submissions WHERE assignment_id = $1', [id]);
  await pool.query('DELETE FROM assignments WHERE id = $1', [id]);
  files.rows.forEach((f) => removeFile(f.file_path));
  removeFile(existing.rows[0].file_path);
  return ok(res, { id }, 'Assignment deleted successfully');
};

/**
 * POST /api/assignments/:id/submit (students)
 * multipart/form-data: link_url? and/or file?  – re-submitting replaces the previous work.
 */
const submitAssignment = async (req, res) => {
  const id = parseId(req.params.id);
  const uploaded = req.file;
  const discardUpload = () => uploaded && removeFile(uploaded.filename);

  if (!id) {
    discardUpload();
    return fail(res, 400, 'Invalid assignment id');
  }

  const { rows } = await pool.query('SELECT course_id, due_date FROM assignments WHERE id = $1', [id]);
  if (rows.length === 0) {
    discardUpload();
    return fail(res, 404, 'Assignment not found');
  }
  if (!(await isEnrolled(req.user.id, rows[0].course_id))) {
    discardUpload();
    return fail(res, 403, 'Enroll in this course to submit work');
  }

  const link = str(req.body.link_url);
  const errors = {};
  if (!link && !uploaded) errors.submission = 'Provide a link or upload a document';
  if (link && !isHttpUrl(link)) errors.link_url = 'Link must be a valid http(s) URL';
  if (Object.keys(errors).length) {
    discardUpload();
    return invalid(res, errors);
  }

  const previous = await pool.query(
    'SELECT file_path FROM submissions WHERE assignment_id = $1 AND student_id = $2',
    [id, req.user.id]
  );

  // COALESCE below keeps the old file if the student only updates the link.
  const result = await pool.query(
    `INSERT INTO submissions (assignment_id, student_id, link_url, file_path, file_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (assignment_id, student_id) DO UPDATE
       SET link_url = EXCLUDED.link_url,
           file_path = COALESCE(EXCLUDED.file_path, submissions.file_path),
           file_name = COALESCE(EXCLUDED.file_name, submissions.file_name),
           submitted_at = CURRENT_TIMESTAMP
     RETURNING *, (CURRENT_TIMESTAMP > $6::timestamptz) AS is_late`,
    [id, req.user.id, link || null, uploaded?.filename ?? null, uploaded?.originalname ?? null, rows[0].due_date]
  );

  if (uploaded && previous.rows[0]?.file_path) removeFile(previous.rows[0].file_path);

  const sub = result.rows[0];
  return created(
    res,
    formatSubmission(req, sub),
    sub.is_late ? 'Work submitted (after the deadline)' : 'Work submitted successfully'
  );
};

module.exports = {
  listAssignments,
  upcomingAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
};

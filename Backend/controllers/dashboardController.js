import pool from '../config/db.js';
import { ok } from '../utils/response.js';
import { publicUser } from './authController.js';

const scalar = async (sql, params) => (await pool.query(sql, params)).rows[0].n;

/** GET /api/dashboard – role-aware summary built from real database data. */
const getDashboard = async (req, res) => {
  const userId = req.user.id;
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const profile = publicUser(rows[0]);

  if (req.user.role === 'teacher') {
    const [assignments, submissions, dueSoon] = await Promise.all([
      scalar('SELECT COUNT(*)::int AS n FROM assignments WHERE teacher_id = $1', [userId]),
      scalar(
        `SELECT COUNT(*)::int AS n FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id WHERE a.teacher_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT a.id, a.title, a.due_date, c.title AS course_title, c.code AS course_code,
                (SELECT COUNT(*)::int FROM submissions s WHERE s.assignment_id = a.id) AS submission_count
         FROM assignments a JOIN courses c ON c.id = a.course_id
         WHERE a.teacher_id = $1 AND a.due_date >= NOW()
         ORDER BY a.due_date ASC LIMIT 5`,
        [userId]
      ),
    ]);
    return ok(res, {
      role: 'teacher',
      profile,
      stats: { assignments_created: assignments, submissions_received: submissions },
      upcoming_assignments: dueSoon.rows,
    });
  }

  const enrolledSql = '(SELECT course_id FROM enrollments WHERE student_id = $1)';
  const notSubmitted =
    'NOT EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.student_id = $1)';

  const [enrolled, pending, overdue, submitted, todosDone, todosOpen, upcoming, courses] =
    await Promise.all([
      scalar('SELECT COUNT(*)::int AS n FROM enrollments WHERE student_id = $1', [userId]),
      scalar(
        `SELECT COUNT(*)::int AS n FROM assignments a
         WHERE a.course_id IN ${enrolledSql} AND ${notSubmitted} AND a.due_date >= NOW()`,
        [userId]
      ),
      scalar(
        `SELECT COUNT(*)::int AS n FROM assignments a
         WHERE a.course_id IN ${enrolledSql} AND ${notSubmitted} AND a.due_date < NOW()`,
        [userId]
      ),
      scalar('SELECT COUNT(*)::int AS n FROM submissions WHERE student_id = $1', [userId]),
      scalar('SELECT COUNT(*)::int AS n FROM todos WHERE user_id = $1 AND completed', [userId]),
      scalar('SELECT COUNT(*)::int AS n FROM todos WHERE user_id = $1 AND NOT completed', [userId]),
      pool.query(
        `SELECT a.id, a.title, a.due_date, c.title AS course_title, c.code AS course_code
         FROM assignments a JOIN courses c ON c.id = a.course_id
         WHERE a.course_id IN ${enrolledSql} AND ${notSubmitted}
           AND a.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
         ORDER BY a.due_date ASC LIMIT 5`,
        [userId]
      ),
      pool.query(
        `SELECT c.id, c.code, c.title, c.start_date, (c.start_date <= CURRENT_DATE) AS started
         FROM enrollments e JOIN courses c ON c.id = e.course_id
         WHERE e.student_id = $1 ORDER BY c.start_date ASC LIMIT 3`,
        [userId]
      ),
    ]);

  return ok(res, {
    role: 'student',
    profile,
    stats: {
      enrolled_courses: enrolled,
      pending_assignments: pending,
      overdue_assignments: overdue,
      submitted_assignments: submitted,
      completed_tasks: todosDone,
      open_tasks: todosOpen,
    },
    upcoming_assignments: upcoming.rows,
    my_courses: courses.rows,
  });
};

export { getDashboard };

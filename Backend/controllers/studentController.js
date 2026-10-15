const pool = require('../config/db');

/**
 * Register a new student
 * POST /api/students
 */
const registerStudent = async (req, res) => {
  const { name, email, course } = req.body;

  // Validate required fields
  if (!name || !email || !course) {
    return res.status(400).json({
      success: false,
      message: 'Please fill in all fields (name, email, course)',
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address',
    });
  }

  try {
    // Check if email already exists
    const existingStudent = await pool.query(
      'SELECT id FROM students WHERE email = $1',
      [email]
    );

    if (existingStudent.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A student with this email is already registered',
      });
    }

    // Insert new student
    const result = await pool.query(
      'INSERT INTO students (name, email, course) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), email.trim().toLowerCase(), course.trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error registering student:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get all registered students
 * GET /api/students
 */
const getAllStudents = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM students ORDER BY created_at DESC'
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching students:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Get a single student by ID
 * GET /api/students/:id
 */
const getStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching student:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update a student by ID
 * PUT /api/students/:id
 */
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, email, course } = req.body;

  if (!name || !email || !course) {
    return res.status(400).json({
      success: false,
      message: 'Please fill in all fields (name, email, course)',
    });
  }

  try {
    // Check if student exists
    const existing = await pool.query('SELECT id FROM students WHERE id = $1', [
      id,
    ]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if the new email is already taken by another student
    const emailCheck = await pool.query(
      'SELECT id FROM students WHERE email = $1 AND id != $2',
      [email.trim().toLowerCase(), id]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Another student is already using this email',
      });
    }

    const result = await pool.query(
      'UPDATE students SET name = $1, email = $2, course = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name.trim(), email.trim().toLowerCase(), course.trim(), id]
    );

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating student:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Delete a student by ID
 * DELETE /api/students/:id
 */
const deleteStudent = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM students WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting student:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  registerStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};

const express = require('express');
const router = express.Router();
const {
  registerStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');

// POST   /api/students      - Register a new student
router.post('/', registerStudent);

// GET    /api/students      - Get all students
router.get('/', getAllStudents);

// GET    /api/students/:id  - Get a student by ID
router.get('/:id', getStudentById);

// PUT    /api/students/:id  - Update a student by ID
router.put('/:id', updateStudent);

// DELETE /api/students/:id  - Delete a student by ID
router.delete('/:id', deleteStudent);

module.exports = router;

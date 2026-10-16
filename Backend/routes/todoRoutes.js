const express = require('express');
const { listTodos, createTodo, updateTodo, deleteTodo } = require('../controllers/todoController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/response');

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(listTodos));
router.post('/', asyncHandler(createTodo));
router.put('/:id', asyncHandler(updateTodo));
router.patch('/:id', asyncHandler(updateTodo));
router.delete('/:id', asyncHandler(deleteTodo));

module.exports = router;

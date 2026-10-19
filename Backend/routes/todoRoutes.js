import express from 'express';
import { listTodos, createTodo, updateTodo, deleteTodo } from '../controllers/todoController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

router.get('/', asyncHandler(listTodos));
router.post('/', asyncHandler(createTodo));
router.put('/:id', asyncHandler(updateTodo));
router.patch('/:id', asyncHandler(updateTodo));
router.delete('/:id', asyncHandler(deleteTodo));

export default router;

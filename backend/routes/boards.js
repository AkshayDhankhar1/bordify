// routes/boards.js
// All board-related endpoints.

import express from 'express';
import {
  getAllBoards,
  getBoardById,
  createBoard,
  updateBoard,
  deleteBoard,
  searchCards,
} from '../controllers/boardController.js';

import {
  getListsByBoard,
  createList,
  reorderLists,
} from '../controllers/listController.js';

const router = express.Router();

// Board CRUD
router.get('/',    getAllBoards);    // GET  /api/boards
router.post('/',   createBoard);    // POST /api/boards
router.get('/:id', getBoardById);   // GET  /api/boards/:id
router.patch('/:id', updateBoard);  // PATCH /api/boards/:id
router.delete('/:id', deleteBoard); // DELETE /api/boards/:id

// Search cards within a board
router.get('/:id/search', searchCards); // GET /api/boards/:id/search?q=...

// Lists within a board
router.get('/:boardId/lists',           getListsByBoard); // GET  /api/boards/:boardId/lists
router.post('/:boardId/lists',          createList);      // POST /api/boards/:boardId/lists
router.put('/:boardId/lists/reorder',   reorderLists);    // PUT  /api/boards/:boardId/lists/reorder

export default router;

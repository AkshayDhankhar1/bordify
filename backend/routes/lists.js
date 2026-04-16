// routes/lists.js
// List-level individual operations (rename, delete).

import express from 'express';
import {
  updateList,
  deleteList,
} from '../controllers/listController.js';
import {
  createCard,
  reorderCards,
} from '../controllers/cardController.js';

const router = express.Router();

router.patch('/:id',               updateList);    // PATCH  /api/lists/:id
router.delete('/:id',              deleteList);    // DELETE /api/lists/:id
router.post('/:listId/cards',      createCard);    // POST   /api/lists/:listId/cards
router.put('/:listId/cards/reorder', reorderCards); // PUT    /api/lists/:listId/cards/reorder

export default router;

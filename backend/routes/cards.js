// routes/cards.js
// Card-level operations: detail, update, delete, labels, members, checklists, comments.

import express from 'express';
import {
  getCardById,
  updateCard,
  deleteCard,
  addLabelToCard,
  removeLabelFromCard,
  addMemberToCard,
  removeMemberFromCard,
  createChecklist,
  deleteChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  addComment,
  deleteComment,
} from '../controllers/cardController.js';

const router = express.Router();

// Card CRUD
router.get('/:id',    getCardById);  // GET    /api/cards/:id
router.patch('/:id',  updateCard);   // PATCH  /api/cards/:id
router.delete('/:id', deleteCard);   // DELETE /api/cards/:id

// Labels
router.post('/:id/labels',               addLabelToCard);     // POST   /api/cards/:id/labels
router.delete('/:id/labels/:labelId',    removeLabelFromCard); // DELETE /api/cards/:id/labels/:labelId

// Members
router.post('/:id/members',              addMemberToCard);    // POST   /api/cards/:id/members
router.delete('/:id/members/:memberId',  removeMemberFromCard); // DELETE /api/cards/:id/members/:memberId

// Checklists
router.post('/:id/checklists',           createChecklist);    // POST   /api/cards/:id/checklists
router.delete('/checklists/:checklistId', deleteChecklist);   // DELETE /api/cards/checklists/:checklistId

// Checklist items
router.post('/checklists/:checklistId/items', addChecklistItem);       // POST   /api/cards/checklists/:checklistId/items
router.patch('/checklist-items/:itemId',      updateChecklistItem);    // PATCH  /api/cards/checklist-items/:itemId
router.delete('/checklist-items/:itemId',     deleteChecklistItem);    // DELETE /api/cards/checklist-items/:itemId

// Comments
router.post('/:id/comments',             addComment);         // POST   /api/cards/:id/comments
router.delete('/comments/:commentId',    deleteComment);      // DELETE /api/cards/comments/:commentId

export default router;

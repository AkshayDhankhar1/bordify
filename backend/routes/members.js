// routes/members.js
import express from 'express';
import { getAllMembers } from '../controllers/memberController.js';

const router = express.Router();
router.get('/', getAllMembers); // GET /api/members

export default router;

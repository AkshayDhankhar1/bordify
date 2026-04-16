// controllers/memberController.js
// Simple member management — no authentication needed per the assignment brief.

import pool from '../db/pool.js';

// GET /api/members  — all members
export async function getAllMembers(req, res) {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('getAllMembers error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}

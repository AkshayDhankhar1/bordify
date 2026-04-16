// controllers/listController.js
// Handles list (column) CRUD and reordering within a board.

import pool from '../db/pool.js';

// GET /api/boards/:boardId/lists
export async function getListsByBoard(req, res) {
  const { boardId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM lists WHERE board_id = $1 ORDER BY position ASC',
      [boardId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getListsByBoard error:', err);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
}

// POST /api/boards/:boardId/lists
export async function createList(req, res) {
  const { boardId } = req.params;
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  try {
    // Place at the end: find max position
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM lists WHERE board_id = $1',
      [boardId]
    );
    const position = posResult.rows[0].next_pos;

    const result = await pool.query(
      'INSERT INTO lists (board_id, title, position) VALUES ($1, $2, $3) RETURNING *',
      [boardId, title.trim(), position]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createList error:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
}

// PATCH /api/lists/:id  — rename a list
export async function updateList(req, res) {
  const { id } = req.params;
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await pool.query(
      'UPDATE lists SET title = $1 WHERE id = $2 RETURNING *',
      [title.trim(), id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'List not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateList error:', err);
    res.status(500).json({ error: 'Failed to update list' });
  }
}

// DELETE /api/lists/:id
export async function deleteList(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM lists WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'List not found' });
    res.json({ message: 'List deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('deleteList error:', err);
    res.status(500).json({ error: 'Failed to delete list' });
  }
}

// PUT /api/boards/:boardId/lists/reorder
// Body: { orderedIds: [3, 1, 4, 2] }  — new position order of list IDs
export async function reorderLists(req, res) {
  const { orderedIds } = req.body; // array of list IDs in new order
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Update each list's position based on its index in the array
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE lists SET position = $1 WHERE id = $2',
        [i, orderedIds[i]]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Lists reordered' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('reorderLists error:', err);
    res.status(500).json({ error: 'Failed to reorder lists' });
  } finally {
    client.release();
  }
}

// controllers/cardController.js
// Handles all card operations: CRUD, reorder, labels, members, checklists, comments.

import pool from '../db/pool.js';

// ─────────────────────────────────────────
// GET /api/cards/:id  — full card detail
// ─────────────────────────────────────────
export async function getCardById(req, res) {
  const { id } = req.params;
  try {
    // Card base data
    const cardResult = await pool.query('SELECT * FROM cards WHERE id = $1', [id]);
    if (!cardResult.rows.length) return res.status(404).json({ error: 'Card not found' });
    const card = cardResult.rows[0];

    // Labels assigned to this card
    const labelsResult = await pool.query(`
      SELECT l.* FROM labels l
      JOIN card_labels cl ON cl.label_id = l.id
      WHERE cl.card_id = $1
    `, [id]);
    card.labels = labelsResult.rows;

    // Members assigned to this card
    const membersResult = await pool.query(`
      SELECT m.* FROM members m
      JOIN card_members cm ON cm.member_id = m.id
      WHERE cm.card_id = $1
    `, [id]);
    card.members = membersResult.rows;

    // Checklists with items
    const checklistsResult = await pool.query(
      'SELECT * FROM checklists WHERE card_id = $1',
      [id]
    );
    const checklists = checklistsResult.rows;
    for (const cl of checklists) {
      const itemsResult = await pool.query(
        'SELECT * FROM checklist_items WHERE checklist_id = $1 ORDER BY position ASC',
        [cl.id]
      );
      cl.items = itemsResult.rows;
    }
    card.checklists = checklists;

    // Comments
    const commentsResult = await pool.query(`
      SELECT co.*, m.name AS member_name, m.color AS member_color
      FROM comments co
      LEFT JOIN members m ON m.id = co.member_id
      WHERE co.card_id = $1
      ORDER BY co.created_at ASC
    `, [id]);
    card.comments = commentsResult.rows;

    res.json(card);
  } catch (err) {
    console.error('getCardById error:', err);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
}

// ─────────────────────────────────────────
// POST /api/lists/:listId/cards
// ─────────────────────────────────────────
export async function createCard(req, res) {
  const { listId } = req.params;
  const { title, board_id } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!board_id)       return res.status(400).json({ error: 'board_id is required' });

  try {
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM cards WHERE list_id = $1',
      [listId]
    );
    const position = posResult.rows[0].next_pos;

    const result = await pool.query(
      'INSERT INTO cards (list_id, board_id, title, position) VALUES ($1, $2, $3, $4) RETURNING *',
      [listId, board_id, title.trim(), position]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createCard error:', err);
    res.status(500).json({ error: 'Failed to create card' });
  }
}

// ─────────────────────────────────────────
// PATCH /api/cards/:id  — update card fields
// ─────────────────────────────────────────
export async function updateCard(req, res) {
  const { id } = req.params;
  const { title, description, due_date, cover_color, is_archived, is_done } = req.body;

  try {
    const result = await pool.query(`
      UPDATE cards
      SET  title       = COALESCE($1, title),
           description = COALESCE($2, description),
           due_date    = COALESCE($3::DATE, due_date),
           cover_color = COALESCE($4, cover_color),
           is_archived = COALESCE($5, is_archived),
           is_done     = COALESCE($6, is_done),
           updated_at  = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      title?.trim() || null,
      description !== undefined ? description : null,
      due_date || null,
      cover_color || null,
      is_archived !== undefined ? is_archived : null,
      is_done     !== undefined ? is_done     : null,
      id
    ]);
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateCard error:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
}

// ─────────────────────────────────────────
// DELETE /api/cards/:id
// ─────────────────────────────────────────
export async function deleteCard(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM cards WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found' });
    res.json({ message: 'Card deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('deleteCard error:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
}

// ─────────────────────────────────────────
// PUT /api/lists/:listId/cards/reorder
// Body: { orderedIds, sourceListId } — move/reorder cards between lists
// ─────────────────────────────────────────
export async function reorderCards(req, res) {
  const { listId } = req.params;                     // destination list
  const { orderedIds } = req.body;                   // new card order in destination

  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds must be an array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedIds.length; i++) {
      await client.query(
        'UPDATE cards SET list_id = $1, position = $2, updated_at = NOW() WHERE id = $3',
        [listId, i, orderedIds[i]]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Cards reordered' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('reorderCards error:', err);
    res.status(500).json({ error: 'Failed to reorder cards' });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────
// Labels on a card
// ─────────────────────────────────────────
// POST /api/cards/:id/labels
export async function addLabelToCard(req, res) {
  const { id } = req.params;
  const { label_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, label_id]
    );
    res.json({ message: 'Label added' });
  } catch (err) {
    console.error('addLabelToCard error:', err);
    res.status(500).json({ error: 'Failed to add label' });
  }
}

// DELETE /api/cards/:id/labels/:labelId
export async function removeLabelFromCard(req, res) {
  const { id, labelId } = req.params;
  try {
    await pool.query(
      'DELETE FROM card_labels WHERE card_id = $1 AND label_id = $2',
      [id, labelId]
    );
    res.json({ message: 'Label removed' });
  } catch (err) {
    console.error('removeLabelFromCard error:', err);
    res.status(500).json({ error: 'Failed to remove label' });
  }
}

// ─────────────────────────────────────────
// Members on a card
// ─────────────────────────────────────────
// POST /api/cards/:id/members
export async function addMemberToCard(req, res) {
  const { id } = req.params;
  const { member_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO card_members (card_id, member_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, member_id]
    );
    res.json({ message: 'Member assigned' });
  } catch (err) {
    console.error('addMemberToCard error:', err);
    res.status(500).json({ error: 'Failed to assign member' });
  }
}

// DELETE /api/cards/:id/members/:memberId
export async function removeMemberFromCard(req, res) {
  const { id, memberId } = req.params;
  try {
    await pool.query(
      'DELETE FROM card_members WHERE card_id = $1 AND member_id = $2',
      [id, memberId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('removeMemberFromCard error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
}

// ─────────────────────────────────────────
// Checklists
// ─────────────────────────────────────────
// POST /api/cards/:id/checklists
export async function createChecklist(req, res) {
  const { id } = req.params;
  const { title = 'Checklist' } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO checklists (card_id, title) VALUES ($1, $2) RETURNING *',
      [id, title]
    );
    res.status(201).json({ ...result.rows[0], items: [] });
  } catch (err) {
    console.error('createChecklist error:', err);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
}

// DELETE /api/checklists/:checklistId
export async function deleteChecklist(req, res) {
  const { checklistId } = req.params;
  try {
    await pool.query('DELETE FROM checklists WHERE id = $1', [checklistId]);
    res.json({ message: 'Checklist deleted' });
  } catch (err) {
    console.error('deleteChecklist error:', err);
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
}

// POST /api/checklists/:checklistId/items
export async function addChecklistItem(req, res) {
  const { checklistId } = req.params;
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text is required' });
  try {
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM checklist_items WHERE checklist_id = $1',
      [checklistId]
    );
    const result = await pool.query(
      'INSERT INTO checklist_items (checklist_id, text, position) VALUES ($1, $2, $3) RETURNING *',
      [checklistId, text.trim(), posResult.rows[0].next_pos]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('addChecklistItem error:', err);
    res.status(500).json({ error: 'Failed to add checklist item' });
  }
}

// PATCH /api/checklist-items/:itemId
export async function updateChecklistItem(req, res) {
  const { itemId } = req.params;
  const { text, is_done } = req.body;
  try {
    const result = await pool.query(
      'UPDATE checklist_items SET text = COALESCE($1, text), is_done = COALESCE($2, is_done) WHERE id = $3 RETURNING *',
      [text?.trim() || null, is_done !== undefined ? is_done : null, itemId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateChecklistItem error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
}

// DELETE /api/checklist-items/:itemId
export async function deleteChecklistItem(req, res) {
  const { itemId } = req.params;
  try {
    await pool.query('DELETE FROM checklist_items WHERE id = $1', [itemId]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('deleteChecklistItem error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
}

// ─────────────────────────────────────────
// Comments
// ─────────────────────────────────────────
// POST /api/cards/:id/comments
export async function addComment(req, res) {
  const { id } = req.params;
  // Default to member 1 (Alice) — no auth for this assignment
  const { body, member_id = 1 } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Comment body is required' });
  try {
    const result = await pool.query(`
      INSERT INTO comments (card_id, member_id, body)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, member_id, body.trim()]);
    // Join member name for response
    const comment = result.rows[0];
    const memberRes = await pool.query('SELECT name, color FROM members WHERE id = $1', [member_id]);
    if (memberRes.rows.length) {
      comment.member_name  = memberRes.rows[0].name;
      comment.member_color = memberRes.rows[0].color;
    }
    res.status(201).json(comment);
  } catch (err) {
    console.error('addComment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
}

// DELETE /api/comments/:commentId
export async function deleteComment(req, res) {
  const { commentId } = req.params;
  try {
    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('deleteComment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
}

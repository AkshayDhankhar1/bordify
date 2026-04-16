// controllers/boardController.js
// Handles all board-level CRUD operations.
// Each function is a middleware: (req, res) => {}
// pool.query() is always used directly — no ORM — so SQL is explicit and easy to read.

import pool from '../db/pool.js';

// ─────────────────────────────────────────
// GET /api/boards  — list all boards
// ─────────────────────────────────────────
export async function getAllBoards(req, res) {
  try {
    const result = await pool.query(`
      SELECT b.*,
             COUNT(DISTINCT l.id)  AS list_count,
             COUNT(DISTINCT c.id)  AS card_count
      FROM   boards b
      LEFT JOIN lists l ON l.board_id = b.id
      LEFT JOIN cards c ON c.board_id = b.id AND c.is_archived = false
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('getAllBoards error:', err);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
}

// ─────────────────────────────────────────
// GET /api/boards/:id  — get one board with all lists, cards, labels, members
// ─────────────────────────────────────────
export async function getBoardById(req, res) {
  const { id } = req.params;
  try {
    // Board
    const boardResult = await pool.query('SELECT * FROM boards WHERE id = $1', [id]);
    if (!boardResult.rows.length) return res.status(404).json({ error: 'Board not found' });
    const board = boardResult.rows[0];

    // Board members
    const membersResult = await pool.query(`
      SELECT m.* FROM members m
      JOIN board_members bm ON bm.member_id = m.id
      WHERE bm.board_id = $1
    `, [id]);
    board.members = membersResult.rows;

    // Board labels
    const labelsResult = await pool.query(
      'SELECT * FROM labels WHERE board_id = $1 ORDER BY id',
      [id]
    );
    board.labels = labelsResult.rows;

    // Lists ordered by position
    const listsResult = await pool.query(
      'SELECT * FROM lists WHERE board_id = $1 ORDER BY position ASC',
      [id]
    );

    // Cards for each list
    const cardsResult = await pool.query(`
      SELECT c.*,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'id', l.id, 'name', l.name, 'color', l.color
             )) FILTER (WHERE l.id IS NOT NULL), '[]') AS labels,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'id', m.id, 'name', m.name, 'color', m.color
             )) FILTER (WHERE m.id IS NOT NULL), '[]') AS members
      FROM   cards c
      LEFT JOIN card_labels  cl ON cl.card_id  = c.id
      LEFT JOIN labels       l  ON l.id         = cl.label_id
      LEFT JOIN card_members cm ON cm.card_id   = c.id
      LEFT JOIN members      m  ON m.id          = cm.member_id
      WHERE  c.board_id = $1 AND c.is_archived = false
      GROUP BY c.id
      ORDER BY c.position ASC
    `, [id]);

    // Nest cards into their lists
    const cardsByList = {};
    cardsResult.rows.forEach(card => {
      if (!cardsByList[card.list_id]) cardsByList[card.list_id] = [];
      cardsByList[card.list_id].push(card);
    });

    board.lists = listsResult.rows.map(list => ({
      ...list,
      cards: cardsByList[list.id] || [],
    }));

    res.json(board);
  } catch (err) {
    console.error('getBoardById error:', err);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
}

// ─────────────────────────────────────────
// POST /api/boards  — create a new board
// ─────────────────────────────────────────
export async function createBoard(req, res) {
  const { title, background = 'gradient-1' } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await pool.query(
      'INSERT INTO boards (title, background) VALUES ($1, $2) RETURNING *',
      [title.trim(), background]
    );
    const board = result.rows[0];

    // Automatically add default labels to new board
    await pool.query(`
      INSERT INTO labels (board_id, name, color) VALUES
        ($1, 'Bug',      '#ef4444'),
        ($1, 'Feature',  '#6366f1'),
        ($1, 'Design',   '#f59e0b'),
        ($1, 'Backend',  '#22c55e'),
        ($1, 'Frontend', '#06b6d4'),
        ($1, 'Urgent',   '#ec4899')
    `, [board.id]);

    res.status(201).json(board);
  } catch (err) {
    console.error('createBoard error:', err);
    res.status(500).json({ error: 'Failed to create board' });
  }
}

// ─────────────────────────────────────────
// PATCH /api/boards/:id  — update board title or background
// ─────────────────────────────────────────
export async function updateBoard(req, res) {
  const { id } = req.params;
  const { title, background } = req.body;

  try {
    const result = await pool.query(`
      UPDATE boards
      SET    title      = COALESCE($1, title),
             background = COALESCE($2, background),
             updated_at = NOW()
      WHERE  id = $3
      RETURNING *
    `, [title?.trim() || null, background || null, id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Board not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateBoard error:', err);
    res.status(500).json({ error: 'Failed to update board' });
  }
}

// ─────────────────────────────────────────
// DELETE /api/boards/:id  — delete a board (cascades to lists, cards, etc.)
// ─────────────────────────────────────────
export async function deleteBoard(req, res) {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM boards WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Board not found' });
    res.json({ message: 'Board deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('deleteBoard error:', err);
    res.status(500).json({ error: 'Failed to delete board' });
  }
}

// ─────────────────────────────────────────
// GET /api/boards/:id/search?q=term
// ─────────────────────────────────────────
export async function searchCards(req, res) {
  const { id }  = req.params;
  const { q, label, member, due } = req.query;

  try {
    let queryText = `
      SELECT c.*, l2.title AS list_title,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'id', lbl.id, 'name', lbl.name, 'color', lbl.color
             )) FILTER (WHERE lbl.id IS NOT NULL), '[]') AS labels,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'id', m.id, 'name', m.name, 'color', m.color
             )) FILTER (WHERE m.id IS NOT NULL), '[]') AS members
      FROM   cards c
      JOIN   lists l2 ON l2.id = c.list_id
      LEFT JOIN card_labels  cl  ON cl.card_id  = c.id
      LEFT JOIN labels       lbl ON lbl.id       = cl.label_id
      LEFT JOIN card_members cm  ON cm.card_id   = c.id
      LEFT JOIN members      m   ON m.id          = cm.member_id
      WHERE  c.board_id = $1 AND c.is_archived = false
    `;
    const params = [id];
    let idx = 2;

    if (q) {
      queryText += ` AND c.title ILIKE $${idx}`;
      params.push(`%${q}%`);
      idx++;
    }
    if (label) {
      queryText += ` AND lbl.id = $${idx}`;
      params.push(label);
      idx++;
    }
    if (member) {
      queryText += ` AND m.id = $${idx}`;
      params.push(member);
      idx++;
    }
    if (due === 'overdue') {
      queryText += ` AND c.due_date < CURRENT_DATE`;
    } else if (due === 'soon') {
      queryText += ` AND c.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`;
    }

    queryText += ' GROUP BY c.id, l2.title ORDER BY c.position ASC';

    const result = await pool.query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    console.error('searchCards error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
}

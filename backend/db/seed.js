// db/seed.js
// Populates the database with sample data so the app works right out of the box.
// Run with:  node db/seed.js
// WARNING: This deletes all existing data and re-seeds fresh.

import pool from './pool.js';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting seed...');

    // 1. Run schema (creates/resets tables)
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema applied');

    // 2. Insert sample members
    const membersResult = await client.query(`
      INSERT INTO members (name, email, avatar_url, color) VALUES
        ('Alice Johnson', 'alice@boardify.dev',   null, '#6366f1'),
        ('Bob Smith',     'bob@boardify.dev',     null, '#22c55e'),
        ('Carol White',   'carol@boardify.dev',   null, '#f59e0b'),
        ('Dave Brown',    'dave@boardify.dev',    null, '#ef4444'),
        ('Eve Davis',     'eve@boardify.dev',     null, '#06b6d4')
      RETURNING id, name
    `);
    const [alice, bob, carol, dave, eve] = membersResult.rows;
    console.log('✅ Members inserted');

    // 3. Insert sample boards
    const boardsResult = await client.query(`
      INSERT INTO boards (title, background) VALUES
        ('Product Roadmap',  'gradient-1'),
        ('Marketing Sprint', 'gradient-2'),
        ('Engineering Q2',   'gradient-3')
      RETURNING id, title
    `);
    const [roadmap, marketing, engineering] = boardsResult.rows;
    console.log('✅ Boards inserted');

    // 4. Assign members to boards
    await client.query(`
      INSERT INTO board_members (board_id, member_id, role) VALUES
        ($1, $2, 'admin'), ($1, $3, 'member'), ($1, $4, 'member'),
        ($5, $3, 'admin'), ($5, $2, 'member'),
        ($6, $4, 'admin'), ($6, $7, 'member'), ($6, $2, 'member')
    `, [roadmap.id, alice.id, bob.id, carol.id,
        marketing.id, carol.id, bob.id,
        engineering.id, dave.id, eve.id, alice.id]);
    console.log('✅ Board members assigned');

    // 5. Insert labels for the Product Roadmap board
    const labelsResult = await client.query(`
      INSERT INTO labels (board_id, name, color) VALUES
        ($1, 'Bug',      '#ef4444'),
        ($1, 'Feature',  '#6366f1'),
        ($1, 'Design',   '#f59e0b'),
        ($1, 'Backend',  '#22c55e'),
        ($1, 'Frontend', '#06b6d4'),
        ($1, 'Urgent',   '#ec4899')
      RETURNING id, name
    `, [roadmap.id]);
    const [lblBug, lblFeature, lblDesign, lblBackend, lblFrontend, lblUrgent] = labelsResult.rows;
    console.log('✅ Labels inserted');

    // 6. Insert lists for the Product Roadmap board
    const listsResult = await client.query(`
      INSERT INTO lists (board_id, title, position) VALUES
        ($1, 'Backlog',     0),
        ($1, 'In Progress', 1),
        ($1, 'In Review',   2),
        ($1, 'Done',        3)
      RETURNING id, title
    `, [roadmap.id]);
    const [backlog, inProgress, inReview, done] = listsResult.rows;
    console.log('✅ Lists inserted');

    // 7. Insert cards
    const cardsResult = await client.query(`
      INSERT INTO cards (list_id, board_id, title, description, position, due_date) VALUES
        ($1, $5, 'Design new landing page',
          'Create wireframes and high-fidelity mockups for the updated landing page. Focus on conversion.',
          0, '2026-04-25'),
        ($1, $5, 'Set up CI/CD pipeline',
          'Automate testing and deployment using GitHub Actions. Target: deploy on every merge to main.',
          1, '2026-04-20'),
        ($1, $5, 'Write API documentation',
          'Document all REST endpoints using OpenAPI/Swagger spec.',
          2, null),
        ($2, $5, 'Implement drag-and-drop',
          'Add @hello-pangea/dnd for smooth list and card reordering.',
          0, '2026-04-18'),
        ($2, $5, 'Build card detail modal',
          'Full-featured modal: description, labels, due date, checklist, members.',
          1, '2026-04-19'),
        ($2, $5, 'Database schema design',
          'Design normalized PostgreSQL schema for boards, lists, cards, labels, members.',
          2, '2026-04-17'),
        ($3, $5, 'Code review: Auth module',
          'Review PR #42 — JWT authentication implementation.',
          0, null),
        ($4, $5, 'Project setup & scaffolding',
          'Initial React + Vite frontend and Node + Express backend setup.',
          0, null),
        ($4, $5, 'Neon DB configuration',
          'Connected PostgreSQL via Neon DB. SSL working.',
          1, null)
      RETURNING id, title
    `, [backlog.id, inProgress.id, inReview.id, done.id, roadmap.id]);
    const cards = cardsResult.rows;
    console.log('✅ Cards inserted');

    // 8. Assign labels to cards
    await client.query(`
      INSERT INTO card_labels (card_id, label_id) VALUES
        ($1, $7), ($1, $10),
        ($2, $8), ($2, $11),
        ($3, $8),
        ($4, $9), ($4, $11),
        ($5, $9), ($5, $10),
        ($6, $8),
        ($7, $7), ($7, $11)
    `, [
      cards[0].id, cards[1].id, cards[2].id, cards[3].id, cards[4].id, cards[5].id, cards[6].id,
      lblBug.id, lblBackend.id, lblFrontend.id, lblFeature.id, lblDesign.id, lblUrgent.id
    ]);
    console.log('✅ Card labels assigned');

    // 9. Assign members to cards
    await client.query(`
      INSERT INTO card_members (card_id, member_id) VALUES
        ($1, $6), ($1, $7),
        ($2, $8),
        ($3, $8),
        ($4, $9), ($4, $7),
        ($5, $9),
        ($6, $8)
    `, [
      cards[0].id, cards[1].id, cards[2].id, cards[3].id, cards[4].id, cards[5].id,
      carol.id, alice.id, dave.id, bob.id
    ]);
    console.log('✅ Card members assigned');

    // 10. Add a checklist to the "Implement drag-and-drop" card
    const checklistResult = await client.query(`
      INSERT INTO checklists (card_id, title) VALUES ($1, 'Implementation Steps')
      RETURNING id
    `, [cards[3].id]);
    const checklistId = checklistResult.rows[0].id;

    await client.query(`
      INSERT INTO checklist_items (checklist_id, text, is_done, position) VALUES
        ($1, 'Install @hello-pangea/dnd',             true,  0),
        ($1, 'Enable DragDropContext for board',       true,  1),
        ($1, 'Make lists draggable (horizontal)',      false, 2),
        ($1, 'Make cards draggable (vertical)',        false, 3),
        ($1, 'Persist new order to backend on drop',  false, 4)
    `, [checklistId]);
    console.log('✅ Checklist inserted');

    // 11. Add comments to the "Implement drag-and-drop" card
    await client.query(`
      INSERT INTO comments (card_id, member_id, body) VALUES
        ($1, $2, 'Started with vertical card drag. Lists next!'),
        ($1, $3, 'Make sure to debounce the position save API call.')
    `, [cards[3].id, bob.id, alice.id]);
    console.log('✅ Comments inserted');

    // 12. Insert lists + cards for Engineering board (bonus data)
    const engListsResult = await client.query(`
      INSERT INTO lists (board_id, title, position) VALUES
        ($1, 'To Do',       0),
        ($1, 'Doing',       1),
        ($1, 'Done',        2)
      RETURNING id
    `, [engineering.id]);
    const [engTodo, engDoing, engDone] = engListsResult.rows;

    await client.query(`
      INSERT INTO cards (list_id, board_id, title, position) VALUES
        ($1, $4, 'Set up monorepo structure', 0),
        ($1, $4, 'Configure ESLint & Prettier', 1),
        ($2, $4, 'Write unit tests for API', 0),
        ($3, $4, 'Deploy to Render', 0)
    `, [engTodo.id, engDoing.id, engDone.id, engineering.id]);
    console.log('✅ Engineering board data inserted');

    console.log('\n🎉 Seed complete! Database is ready.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

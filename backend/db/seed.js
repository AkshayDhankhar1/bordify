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
        ('Akshay Dhankhar', 'akshaydhankhar.iiitn@gmail.com', null, '#ea580c'),
        ('Hiring Manager',  'hiring@scaler.com',              null, '#6366f1'),
        ('Bob Smith',       'bob@boardify.dev',               null, '#22c55e')
      RETURNING id, name
    `);
    const [akshay, manager, bob] = membersResult.rows;
    console.log('✅ Members inserted');

    // 3. Insert boards
    const boardsResult = await client.query(`
      INSERT INTO boards (title, background, created_at) VALUES
        ('Hi from Akshay Dhankhar (Scaler Team)', 'gradient-2', NOW() + INTERVAL '1 hour'),
        ('AtomPay Sprint Planning', 'gradient-1', NOW()),
        ('Personal Kanban', 'gradient-3', NOW() - INTERVAL '1 hour')
      RETURNING id, title
    `);
    const [portfolio, atompay, personal] = boardsResult.rows;
    console.log('✅ Boards inserted');

    // 4. Assign members to boards
    await client.query(`
      INSERT INTO board_members (board_id, member_id, role) VALUES
        ($1, $2, 'admin'), ($1, $3, 'member'),
        ($4, $2, 'admin'), ($4, $5, 'member'),
        ($6, $2, 'admin')
    `, [portfolio.id, akshay.id, manager.id, atompay.id, bob.id, personal.id]);
    console.log('✅ Board members assigned');

    // 5. Insert labels for the Portfolio board
    const labelsResult = await client.query(`
      INSERT INTO labels (board_id, name, color) VALUES
        ($1, 'Full Stack', '#ef4444'),
        ($1, 'DSA (500+)', '#6366f1'),
        ($1, 'Backend',    '#22c55e'),
        ($1, 'Frontend',   '#f59e0b'),
        ($1, 'Important',  '#ec4899')
      RETURNING id, name
    `, [portfolio.id]);
    const [lFullStack, lDsa, lBackend, lFrontend, lImportant] = labelsResult.rows;
    console.log('✅ Labels inserted');

    // 6. Insert lists for the Portfolio board
    const listsResult = await client.query(`
      INSERT INTO lists (board_id, title, position) VALUES
        ($1, 'About Me', 0),
        ($1, 'Skills',   1),
        ($1, 'Projects', 2),
        ($1, 'Contact',  3)
      RETURNING id, title
    `, [portfolio.id]);
    const [lstAbout, lstSkills, lstProjects, lstContact] = listsResult.rows;
    console.log('✅ Lists inserted');

    // 7. Insert cards for the Portfolio board
    const cDocs = await client.query(`
      INSERT INTO cards (list_id, board_id, title, description, cover_color, position) VALUES
        ($1, $5, '👋 Akshay Dhankhar', 
          'I am a Full Stack Web Developer studying at Indian Institute of Information Technology Nagpur (3rd Year).\n\nI have completed my backend training from Harkirat Singh (100xdevs) and have solved 500+ DSA questions across platforms.', 
          '#f97316', 0),
        ($1, $5, '🔗 Important Links', 
          '**LinkedIn:** https://www.linkedin.com/in/akshaydhankhar/\n**GitHub:** https://github.com/AkshayDhankhar1/\n**LeetCode:** https://leetcode.com/u/AkshyDhankhar/', 
          null, 1),
        ($2, $5, '💻 Languages', 'C++, JavaScript (ES6+), TypeScript, HTML5, CSS3', null, 0),
        ($2, $5, '⚙️ Backend', 'Node.js, Express.js, RESTful Architecture, WebSockets, WebRTC, JWT, Zod', null, 1),
        ($2, $5, '🎨 Frontend', 'ReactJs, NextJs', null, 2),
        ($2, $5, '🗄️ Databases & Tools', 'MongoDB (Transactions, Indexing), PostgreSQL, Prisma, MySQL, Git, GitHub, Postman, Linux', null, 3),
        ($2, $5, '🧠 Core Concepts', 'Data Structures & Algorithms (400+ problems), OOPS, DBMS, Software Engineering, OS, CN', null, 4),
        ($3, $5, '🚀 AtomPay – Wallet-to-Wallet Payment System', 
          '**Live Link:** https://atom-pay-nine.vercel.app/\n**Tech Stack:** Node.js, Express, MongoDB, ReactJs\n\n• Engineered a FinTech backend with P2P transfers across 6+ REST APIs, secured via 2-token JWT and 2FA Email OTP (speakeasy, 30s window).\n• Implemented ACID-compliant transfers using MongoDB sessions — 3 atomic ops (debit, credit, ledger) in a 2-phase commit with auto-rollback and 100% auditability.\n• Designed idempotency middleware with Idempotency-Key headers and 3-state FSM (pending → processing → completed), eliminating duplicate charges on retries.\n• Built 0-dependency IP rate limiter (Map + setInterval) and enforced 1,00,000/24hr cap via MongoDB Aggregation on 3 indexed fields — blocking velocity fraud.',
          '#0ea5e9', 0),
        ($4, $5, '📧 Email', 'akshaydhankhar.iiitn@gmail.com', null, 0),
        ($4, $5, '📱 Mobile', '+91 9050261651', null, 1),
        ($4, $5, '📄 Resume', 'https://drive.google.com/file/d/1kfmeK7fOHN7KWx5edkx7K1M5bVhHRJKX/view?usp=sharing', '#22c55e', 2)
      RETURNING id, title
    `, [lstAbout.id, lstSkills.id, lstProjects.id, lstContact.id, portfolio.id]);
    const cards = cDocs.rows;
    console.log('✅ Cards inserted');

    // 8. Assign labels to cards
    // '👋 Akshay Dhankhar' uses 'Full Stack', 'DSA (500+)'
    // '🚀 AtomPay' uses 'Backend', 'Full Stack', 'Important'
    await client.query(`
      INSERT INTO card_labels (card_id, label_id) VALUES
        ($1, $2), ($1, $3),
        ($4, $5), ($4, $2), ($4, $6),
        ($7, $5)
    `, [
      cards[0].id, lFullStack.id, lDsa.id, 
      cards[7].id, lBackend.id, lImportant.id,
      cards[3].id
    ]);
    console.log('✅ Card labels assigned');

    // 9. Assign members to cards
    await client.query(`
      INSERT INTO card_members (card_id, member_id) VALUES
        ($1, $2), ($3, $2)
    `, [cards[0].id, akshay.id, cards[7].id]);
    console.log('✅ Card members assigned');

    // 10. AtomPay Checklist
    const chkRes = await client.query(`
      INSERT INTO checklists (card_id, title) VALUES ($1, 'FinTech Implementation Checklist') RETURNING id
    `, [cards[7].id]);
    
    await client.query(`
      INSERT INTO checklist_items (checklist_id, text, is_done, position) VALUES
        ($1, '2-token JWT & 2FA Email OTP', true, 0),
        ($1, 'MongoDB ACID transactions with session rollback', true, 1),
        ($1, 'Idempotency Middleware (FSM)', true, 2),
        ($1, 'Custom IP Rate Limiter (velocity fraud blocking)', true, 3)
    `, [chkRes.rows[0].id]);
    
    console.log('\n🎉 Seed complete! Database is ready!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
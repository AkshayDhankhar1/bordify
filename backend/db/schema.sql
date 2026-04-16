-- ============================================================
-- Boardify Database Schema
-- PostgreSQL / Neon DB
-- ============================================================

-- Drop tables in reverse-dependency order for clean re-runs
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS checklists      CASCADE;
DROP TABLE IF EXISTS card_labels     CASCADE;
DROP TABLE IF EXISTS card_members    CASCADE;
DROP TABLE IF EXISTS comments        CASCADE;
DROP TABLE IF EXISTS cards           CASCADE;
DROP TABLE IF EXISTS labels          CASCADE;
DROP TABLE IF EXISTS lists           CASCADE;
DROP TABLE IF EXISTS board_members   CASCADE;
DROP TABLE IF EXISTS boards          CASCADE;
DROP TABLE IF EXISTS members         CASCADE;

-- ============================================================
-- MEMBERS
-- ============================================================
CREATE TABLE members (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) UNIQUE NOT NULL,
  avatar_url TEXT,                        
  color      VARCHAR(7) DEFAULT '#6366f1' 
);

-- ============================================================
-- BOARDS
-- ============================================================
CREATE TABLE boards (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  background VARCHAR(255) DEFAULT 'gradient-1',
  is_done    BOOLEAN      DEFAULT FALSE,
  created_at TIMESTAMPTZ  DEFAULT NOW(),
  updated_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- BOARD_MEMBERS
-- ============================================================
CREATE TABLE board_members (
  board_id  INTEGER REFERENCES boards(id)  ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  role      VARCHAR(20) DEFAULT 'member',  
  PRIMARY KEY (board_id, member_id)
);

-- ============================================================
-- LABELS
-- ============================================================
CREATE TABLE labels (
  id       SERIAL PRIMARY KEY,
  board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
  name     VARCHAR(50),
  color    VARCHAR(7) NOT NULL  
);

-- ============================================================
-- LISTS
-- ============================================================
CREATE TABLE lists (
  id         SERIAL PRIMARY KEY,
  board_id   INTEGER REFERENCES boards(id) ON DELETE CASCADE,
  title      VARCHAR(255) NOT NULL,
  position   INTEGER      NOT NULL DEFAULT 0,  
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- CARDS
-- ============================================================
CREATE TABLE cards (
  id          SERIAL PRIMARY KEY,
  list_id     INTEGER REFERENCES lists(id)   ON DELETE CASCADE,
  board_id    INTEGER REFERENCES boards(id)  ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  position    INTEGER      NOT NULL DEFAULT 0,
  due_date    DATE,
  is_archived BOOLEAN      DEFAULT FALSE,
  is_done     BOOLEAN      DEFAULT FALSE,
  cover_color VARCHAR(7),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- CARD_LABELS
-- ============================================================
CREATE TABLE card_labels (
  card_id  INTEGER REFERENCES cards(id)  ON DELETE CASCADE,
  label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

-- ============================================================
-- CARD_MEMBERS
-- ============================================================
CREATE TABLE card_members (
  card_id   INTEGER REFERENCES cards(id)   ON DELETE CASCADE,
  member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, member_id)
);

-- ============================================================
-- CHECKLISTS
-- ============================================================
CREATE TABLE checklists (
  id      SERIAL PRIMARY KEY,
  card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
  title   VARCHAR(255) NOT NULL DEFAULT 'Checklist'
);

-- ============================================================
-- CHECKLIST_ITEMS
-- ============================================================
CREATE TABLE checklist_items (
  id           SERIAL PRIMARY KEY,
  checklist_id INTEGER REFERENCES checklists(id) ON DELETE CASCADE,
  text         TEXT    NOT NULL,
  is_done      BOOLEAN NOT NULL DEFAULT FALSE,
  position     INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
  id         SERIAL PRIMARY KEY,
  card_id    INTEGER REFERENCES cards(id)   ON DELETE CASCADE,
  member_id  INTEGER REFERENCES members(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_lists_board    ON lists(board_id);
CREATE INDEX idx_cards_list     ON cards(list_id);
CREATE INDEX idx_cards_board    ON cards(board_id);
CREATE INDEX idx_card_labels    ON card_labels(card_id);
CREATE INDEX idx_card_members   ON card_members(card_id);
CREATE INDEX idx_comments_card  ON comments(card_id);
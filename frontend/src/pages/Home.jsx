// src/pages/Home.jsx
// Displays all boards in a beautiful card grid. Allows creating new boards.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { boardsApi } from '../api/index.js';
import styles from './Home.module.css';

// Board background gradients — unique color palette
const BACKGROUNDS = [
  { key: 'gradient-1', label: 'Indigo Night',  style: 'linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)' },
  { key: 'gradient-2', label: 'Emerald Dusk',  style: 'linear-gradient(135deg,#064e3b,#065f46,#047857)' },
  { key: 'gradient-3', label: 'Aurora',        style: 'linear-gradient(135deg,#0c4a6e,#075985,#0369a1)' },
  { key: 'gradient-4', label: 'Sunset',        style: 'linear-gradient(135deg,#7c2d12,#9a3412,#c2410c)' },
  { key: 'gradient-5', label: 'Violet Storm',  style: 'linear-gradient(135deg,#4a044e,#6b21a8,#7c3aed)' },
  { key: 'gradient-6', label: 'Teal Wave',     style: 'linear-gradient(135deg,#042f2e,#134e4a,#0f766e)' },
];

function getBgStyle(key) {
  const found = BACKGROUNDS.find(b => b.key === key);
  return found ? found.style : BACKGROUNDS[0].style;
}

// Get user initials for avatar
function getInitials(name = '') {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function Home() {
  const [boards, setBoards]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBg, setNewBg]       = useState('gradient-1');
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState(null);

  // Load all boards on mount
  useEffect(() => {
    loadBoards();
  }, []);

  async function loadBoards() {
    try {
      setLoading(true);
      const res = await boardsApi.getAll();
      setBoards(res.data);
    } catch (err) {
      setError('Failed to load boards. Is the backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setCreating(true);
      const res = await boardsApi.create({ title: newTitle.trim(), background: newBg });
      setBoards(prev => [res.data, ...prev]);
      setNewTitle('');
      setNewBg('gradient-1');
      setShowForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className="spinner" />
      <p>Loading your boards…</p>
    </div>
  );

  if (error) return (
    <div className={styles.errorScreen}>
      <p>⚠️ {error}</p>
      <button className="btn btn-primary" onClick={loadBoards}>Retry</button>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Hero banner */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Your Boards
            <span className={styles.pulse} />
          </h1>
          <p className={styles.heroSubtitle}>Organize work, ship faster. Drag, drop, done.</p>
        </div>
        <button
          id="create-board-btn"
          className={`btn btn-primary ${styles.createBtn}`}
          onClick={() => setShowForm(true)}
        >
          + New Board
        </button>
      </div>

      {/* Create board form */}
      {showForm && (
        <div className={styles.formOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className={styles.formCard}>
            <h2>Create a New Board</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.field}>
                <label htmlFor="board-title">Board Title</label>
                <input
                  id="board-title"
                  className="input"
                  placeholder="e.g. Product Roadmap"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Background</label>
                <div className={styles.bgPicker}>
                  {BACKGROUNDS.map(bg => (
                    <button
                      key={bg.key}
                      type="button"
                      className={`${styles.bgSwatch} ${newBg === bg.key ? styles.bgSwatchActive : ''}`}
                      style={{ background: bg.style }}
                      onClick={() => setNewBg(bg.key)}
                      title={bg.label}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Board grid */}
      {boards.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>⬡</div>
          <h2>No boards yet</h2>
          <p>Create your first board to get started</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create Board</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {boards.map(board => (
            <Link
              key={board.id}
              to={`/board/${board.id}`}
              className={styles.boardCard}
              id={`board-${board.id}`}
            >
              {/* Board background cover */}
              <div
                className={styles.boardCover}
                style={{ background: getBgStyle(board.background) }}
              >
                <div className={styles.boardCoverOverlay} />
                <span className={styles.boardCoverIcon}>⬡</span>
              </div>

              {/* Board info */}
              <div className={styles.boardInfo}>
                <h3 className={styles.boardTitle}>{board.title}</h3>
                <div className={styles.boardMeta}>
                  <span className={styles.metaPill}>{board.list_count || 0} lists</span>
                  <span className={styles.metaPill}>{board.card_count || 0} cards</span>
                </div>
              </div>
            </Link>
          ))}

          {/* + Add board tile */}
          <button
            className={styles.addTile}
            onClick={() => setShowForm(true)}
            id="add-board-tile"
          >
            <span className={styles.addIcon}>+</span>
            <span>Create new board</span>
          </button>
        </div>
      )}
    </div>
  );
}

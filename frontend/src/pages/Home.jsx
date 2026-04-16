// src/pages/Home.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { boardsApi } from '../api/index.js';
import styles from './Home.module.css';

const BG_GRADIENTS = [
  { id: 'gradient-1', style: 'linear-gradient(135deg,#0ea5e9,#6366f1)', preview: '#0ea5e9' },
  { id: 'gradient-2', style: 'linear-gradient(135deg,#f97316,#ef4444)', preview: '#f97316' },
  { id: 'gradient-3', style: 'linear-gradient(135deg,#22c55e,#0ea5e9)', preview: '#22c55e' },
  { id: 'gradient-4', style: 'linear-gradient(135deg,#8b5cf6,#ec4899)', preview: '#8b5cf6' },
  { id: 'gradient-5', style: 'linear-gradient(135deg,#f59e0b,#f97316)', preview: '#f59e0b' },
  { id: 'gradient-6', style: 'linear-gradient(135deg,#06b6d4,#22c55e)', preview: '#06b6d4' },
];

export default function Home() {
  const [boards,   setBoards]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [title,    setTitle]    = useState('');
  const [creating, setCreating] = useState(false);
  const [selBg,    setSelBg]    = useState('gradient-1');
  const navigate = useNavigate();

  useEffect(() => { loadBoards(); }, []);

  async function loadBoards() {
    try {
      setLoading(true);
      const res = await boardsApi.getAll();
      setBoards(res.data);
    } catch {
      setError('Could not load boards. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await boardsApi.create({ title: title.trim(), background: selBg });
      setBoards(prev => [res.data, ...prev]);
      setTitle('');
      navigate(`/board/${res.data.id}`);
    } catch { setError('Failed to create board.'); }
    finally { setCreating(false); }
  }

  async function handleDelete(e, id) {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm('Delete this board and all its data?')) return;
    await boardsApi.delete(id);
    setBoards(prev => prev.filter(b => b.id !== id));
  }

  async function handleMarkDone(e, boardId) {
    e.preventDefault(); e.stopPropagation();
    await boardsApi.update(boardId, { is_done: true });
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, is_done: true } : b));
  }

  const getBgStyle = (bg) => BG_GRADIENTS.find(g => g.id === bg)?.style || BG_GRADIENTS[0].style;

  if (loading) return <div className={styles.loadingWrap}><div className="spinner" /></div>;
  if (error)   return <div className={styles.errorBox}><p>⚠️ {error}</p></div>;

  return (
    <div className={styles.page}>
      {/* Hero + create form */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Your <span>Boards</span></h1>
        <p className={styles.heroSub}>Organize your work visually, just like Trello.</p>

        <div className={styles.createCard}>
          <p className={styles.createTitle}>✨ Create a new board</p>
          {/* Color picker */}
          <div className={styles.colorPicker}>
            {BG_GRADIENTS.map(g => (
              <button
                key={g.id}
                className={`${styles.colorSwatch} ${selBg === g.id ? styles.colorSwatchActive : ''}`}
                style={{ background: g.style }}
                onClick={() => setSelBg(g.id)}
                title={g.id}
              />
            ))}
          </div>
          <form className={styles.createForm} onSubmit={handleCreate}>
            <input
              className="input"
              placeholder="Board title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              id="new-board-input"
            />
            <button
              type="submit"
              className="btn btn-accent"
              disabled={creating || !title.trim()}
              id="create-board-btn"
            >
              {creating ? '…' : '+ Add'}
            </button>
          </form>
        </div>
      </div>

      {/* Board grid */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            📋 My Boards <span className={styles.boardCount}>{boards.length}</span>
          </h2>
        </div>

        {boards.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📭</div>
            <p className={styles.emptyText}>No boards yet</p>
            <p>Create your first board above to get started!</p>
          </div>
        ) : (
          <div className={styles.boardGrid}>
            {boards.map(board => (
              <Link
                key={board.id}
                to={`/board/${board.id}`}
                className={styles.boardCard}
                id={`board-card-${board.id}`}
              >
                <div
                  className={styles.boardCardInner}
                  style={{ background: getBgStyle(board.background) }}
                >
                  {/* Done badge */}
                  {board.is_done && <span className={styles.doneBadge}>✓ Done</span>}

                  <div className={styles.boardCardTitle}>{board.title}</div>

                  <div className={styles.boardCardMeta}>
                    <div className={styles.boardCardStats}>
                      <span>📋 {board.list_count || 0} lists</span>
                      <span>🃏 {board.card_count || 0} cards</span>
                    </div>
                    <div className={styles.boardCardActions}>
                      {!board.is_done && (
                        <button
                          className={styles.boardActionBtn}
                          onClick={(e) => handleMarkDone(e, board.id)}
                          title="Mark board as done"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className={`${styles.boardActionBtn} ${styles.boardActionDanger}`}
                        onClick={(e) => handleDelete(e, board.id)}
                        title="Delete board"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

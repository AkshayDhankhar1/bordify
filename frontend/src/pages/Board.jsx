// src/pages/Board.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { boardsApi, listsApi, cardsApi } from '../api/index.js';
import List       from '../components/List.jsx';
import CardModal  from '../components/CardModal.jsx';
import SearchBar  from '../components/SearchBar.jsx';
import styles     from './Board.module.css';

const BG_STYLES = {
  'gradient-1': 'linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)',
  'gradient-2': 'linear-gradient(135deg,#f97316 0%,#ef4444 100%)',
  'gradient-3': 'linear-gradient(135deg,#22c55e 0%,#0ea5e9 100%)',
  'gradient-4': 'linear-gradient(135deg,#8b5cf6 0%,#ec4899 100%)',
  'gradient-5': 'linear-gradient(135deg,#f59e0b 0%,#f97316 100%)',
  'gradient-6': 'linear-gradient(135deg,#06b6d4 0%,#22c55e 100%)',
};

export default function Board() {
  const { id } = useParams();

  const [board,         setBoard]         = useState(null);
  const [lists,         setLists]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [activeCard,    setActiveCard]    = useState(null);
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [boardTitle,    setBoardTitle]    = useState('');
  const [searchActive,  setSearchActive]  = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => { loadBoard(); }, [id]);

  async function loadBoard() {
    try {
      setLoading(true);
      const res = await boardsApi.getById(id);
      setBoard(res.data);
      setBoardTitle(res.data.title);
      setLists(res.data.lists || []);
    } catch (err) {
      setError('Failed to load board.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveBoardTitle() {
    if (boardTitle.trim() === board.title) { setEditingTitle(false); return; }
    await boardsApi.update(id, { title: boardTitle.trim() });
    setBoard(prev => ({ ...prev, title: boardTitle.trim() }));
    setEditingTitle(false);
  }

  async function handleMarkBoardDone() {
    const isDone = !board.is_done;
    await boardsApi.update(id, { is_done: isDone });
    setBoard(prev => ({ ...prev, is_done: isDone }));
  }

  async function handleCreateList(title) {
    const res = await listsApi.create(id, { title });
    setLists(prev => [...prev, { ...res.data, cards: [] }]);
  }

  async function handleDeleteList(listId) {
    await listsApi.delete(listId);
    setLists(prev => prev.filter(l => l.id !== listId));
  }

  async function handleRenameList(listId, title) {
    await listsApi.update(listId, { title });
    setLists(prev => prev.map(l => l.id === listId ? { ...l, title } : l));
  }

  async function handleCreateCard(listId, title) {
    const res = await cardsApi.create(listId, { title, board_id: Number(id) });
    const card = { ...res.data, labels: [], members: [] };
    setLists(prev => prev.map(l => l.id === listId ? { ...l, cards: [...l.cards, card] } : l));
  }

  async function handleDeleteCard(listId, cardId) {
    await cardsApi.delete(cardId);
    setLists(prev => prev.map(l =>
      l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l
    ));
  }

  async function handleToggleCardDone(listId, card) {
    const res = await cardsApi.update(card.id, { is_archived: !card.is_done });
    setLists(prev => prev.map(l =>
      l.id === listId
        ? { ...l, cards: l.cards.map(c => c.id === card.id ? { ...c, is_done: !c.is_done } : c) }
        : l
    ));
  }

  async function onDragEnd(result) {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'LIST') {
      const reordered = Array.from(lists);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      setLists(reordered);
      await listsApi.reorder(id, { orderedIds: reordered.map(l => l.id) });
    } else {
      const srcListId  = Number(source.droppableId);
      const destListId = Number(destination.droppableId);
      const newLists   = lists.map(l => ({ ...l, cards: [...l.cards] }));
      const srcList    = newLists.find(l => l.id === srcListId);
      const destList   = newLists.find(l => l.id === destListId);
      const [movedCard] = srcList.cards.splice(source.index, 1);
      destList.cards.splice(destination.index, 0, movedCard);
      setLists(newLists);
      await cardsApi.reorder(destListId, { orderedIds: destList.cards.map(c => c.id) });
      if (srcListId !== destListId) {
        await cardsApi.reorder(srcListId, { orderedIds: srcList.cards.map(c => c.id) });
      }
    }
  }

  function handleCardUpdated(updatedCard) {
    setLists(prev => prev.map(l => ({
      ...l, cards: l.cards.map(c => c.id === updatedCard.id ? { ...c, ...updatedCard } : c)
    })));
  }

  async function handleSearch(params) {
    const res = await boardsApi.search(id, params);
    setSearchResults(res.data);
    setSearchActive(true);
  }

  function handleClearSearch() {
    setSearchResults(null);
    setSearchActive(false);
  }

  if (loading) return (
    <div className={styles.loadingScreen}><div className="spinner" /><p>Loading board…</p></div>
  );
  if (error) return (
    <div className={styles.loadingScreen}>
      <p>⚠️ {error}</p>
      <Link to="/" className="btn btn-primary mt-2">← Back to Home</Link>
    </div>
  );

  const bgStyle = BG_STYLES[board?.background] || BG_STYLES['gradient-1'];

  return (
    <div className={styles.boardPage} style={{ background: bgStyle }}>

      {/* ── Board Header ── */}
      <div className={styles.boardHeader}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.backBtn}>← Boards</Link>

          {editingTitle ? (
            <input
              className={styles.titleInput}
              value={boardTitle}
              onChange={e => setBoardTitle(e.target.value)}
              onBlur={saveBoardTitle}
              onKeyDown={e => { if (e.key === 'Enter') saveBoardTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
              autoFocus
            />
          ) : (
            <h1 className={styles.boardTitle} onClick={() => setEditingTitle(true)} title="Click to rename">
              {board.title}
            </h1>
          )}

          {/* Member avatars */}
          <div className={styles.memberAvatars}>
            {(board.members || []).slice(0, 4).map(m => (
              <div
                key={m.id}
                className={styles.memberAvatar}
                style={{ background: m.color || '#0ea5e9' }}
                title={m.name}
              >
                {m.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
              </div>
            ))}
          </div>
        </div>

        {/* Done board button */}
        <button
          className={`${styles.doneBoardBtn} ${board.is_done ? styles.isDone : ''}`}
          onClick={handleMarkBoardDone}
          id="done-board-btn"
        >
          {board.is_done ? '✓ Completed' : '✓ Mark Done'}
        </button>

        <SearchBar board={board} onSearch={handleSearch} onClear={handleClearSearch} />
      </div>

      {/* Search results */}
      {searchActive && searchResults && (
        <div className={styles.searchResults}>
          <div className={styles.searchResultsHeader}>
            <span>🔍 {searchResults.length} card{searchResults.length !== 1 ? 's' : ''} found</span>
            <button className="btn-icon" onClick={handleClearSearch}>✕</button>
          </div>
          <div className={styles.searchResultsList}>
            {searchResults.length === 0 ? (
              <p style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '14px' }}>No results.</p>
            ) : searchResults.map(card => (
              <button
                key={card.id}
                className={styles.searchResultItem}
                onClick={() => { setActiveCard(card.id); handleClearSearch(); }}
              >
                <span className={styles.srListName}>{card.list_title}</span>
                <span className={styles.srCardTitle}>{card.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Kanban Board ── */}
      <div className={styles.boardScrollArea}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="LIST" direction="horizontal">
            {(provided) => (
              <div
                className={styles.listsContainer}
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {lists.map((list, index) => (
                  <List
                    key={list.id}
                    list={list}
                    index={index}
                    onCreateCard={handleCreateCard}
                    onDeleteCard={handleDeleteCard}
                    onDeleteList={handleDeleteList}
                    onRenameList={handleRenameList}
                    onCardClick={setActiveCard}
                    onToggleCardDone={handleToggleCardDone}
                  />
                ))}
                {provided.placeholder}
                <AddListForm onCreate={handleCreateList} />
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Card Modal */}
      {activeCard && (
        <CardModal
          cardId={activeCard}
          board={board}
          onClose={() => setActiveCard(null)}
          onCardUpdated={handleCardUpdated}
          onCardDeleted={(cardId) => {
            setLists(prev => prev.map(l => ({ ...l, cards: l.cards.filter(c => c.id !== cardId) })));
            setActiveCard(null);
          }}
        />
      )}
    </div>
  );
}

function AddListForm({ onCreate }) {
  const [open,  setOpen]  = useState(false);
  const [title, setTitle] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim());
    setTitle('');
    setOpen(false);
  }

  if (!open) return (
    <button id="add-list-btn" className={styles.addListBtn} onClick={() => setOpen(true)}>
      + Add a list
    </button>
  );

  return (
    <form className={styles.addListForm} onSubmit={handleSubmit}>
      <input
        className={`input ${styles.addListInput}`}
        placeholder="List title…"
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
      />
      <div className={styles.addListActions}>
        <button type="submit" className="btn btn-primary btn-sm">Add List</button>
        <button type="button" className="btn-icon" onClick={() => { setOpen(false); setTitle(''); }}>✕</button>
      </div>
    </form>
  );
}

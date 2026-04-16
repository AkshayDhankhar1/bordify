// src/pages/Board.jsx
// The main board view with drag-and-drop lists and cards using @hello-pangea/dnd.

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { boardsApi, listsApi, cardsApi } from '../api/index.js';
import List        from '../components/List.jsx';
import CardModal   from '../components/CardModal.jsx';
import SearchBar   from '../components/SearchBar.jsx';
import styles      from './Board.module.css';

// Same bg gradients as Home.jsx (DRY in practice would use a shared constant)
const BG_STYLES = {
  'gradient-1': 'linear-gradient(135deg,#1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  'gradient-2': 'linear-gradient(135deg,#064e3b 0%, #065f46 50%, #047857 100%)',
  'gradient-3': 'linear-gradient(135deg,#0c4a6e 0%, #075985 50%, #0369a1 100%)',
  'gradient-4': 'linear-gradient(135deg,#7c2d12 0%, #9a3412 50%, #c2410c 100%)',
  'gradient-5': 'linear-gradient(135deg,#4a044e 0%, #6b21a8 50%, #7c3aed 100%)',
  'gradient-6': 'linear-gradient(135deg,#042f2e 0%, #134e4a 50%, #0f766e 100%)',
};

export default function Board() {
  const { id } = useParams();  // board ID from URL /board/:id

  const [board,        setBoard]        = useState(null);
  const [lists,        setLists]        = useState([]);   // array of lists with .cards
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeCard,   setActiveCard]   = useState(null); // card ID to show in modal
  const [editingTitle, setEditingTitle] = useState(false);
  const [boardTitle,   setBoardTitle]   = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchResults,setSearchResults]= useState(null);  // null = no search active

  // ── Load board ─────────────────────────────────────────────
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

  // ── Board title inline edit ──────────────────────────────
  async function saveBoardTitle() {
    if (boardTitle.trim() === board.title) { setEditingTitle(false); return; }
    try {
      await boardsApi.update(id, { title: boardTitle.trim() });
      setBoard(prev => ({ ...prev, title: boardTitle.trim() }));
    } catch (err) { console.error(err); }
    setEditingTitle(false);
  }

  // ── Create list ───────────────────────────────────────────
  async function handleCreateList(title) {
    try {
      const res = await listsApi.create(id, { title });
      setLists(prev => [...prev, { ...res.data, cards: [] }]);
    } catch (err) { console.error(err); }
  }

  // ── Delete list ───────────────────────────────────────────
  async function handleDeleteList(listId) {
    try {
      await listsApi.delete(listId);
      setLists(prev => prev.filter(l => l.id !== listId));
    } catch (err) { console.error(err); }
  }

  // ── Rename list ───────────────────────────────────────────
  async function handleRenameList(listId, title) {
    try {
      await listsApi.update(listId, { title });
      setLists(prev => prev.map(l => l.id === listId ? { ...l, title } : l));
    } catch (err) { console.error(err); }
  }

  // ── Create card ───────────────────────────────────────────
  async function handleCreateCard(listId, title) {
    try {
      const res = await cardsApi.create(listId, { title, board_id: Number(id) });
      const card = { ...res.data, labels: [], members: [] };
      setLists(prev => prev.map(l =>
        l.id === listId ? { ...l, cards: [...l.cards, card] } : l
      ));
    } catch (err) { console.error(err); }
  }

  // ── Delete card ───────────────────────────────────────────
  async function handleDeleteCard(listId, cardId) {
    try {
      await cardsApi.delete(cardId);
      setLists(prev => prev.map(l =>
        l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l
      ));
    } catch (err) { console.error(err); }
  }

  // ── Drag and drop ─────────────────────────────────────────
  // This is the most important function for the assignment.
  // It handles both list-to-list reorder and card movement within/between lists.
  async function onDragEnd(result) {
    const { source, destination, type } = result;

    // Dropped outside — do nothing
    if (!destination) return;
    // Same position — do nothing
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'LIST') {
      // ── Reorder lists ──────────────────────────────────────
      const reordered = Array.from(lists);
      const [moved]   = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      setLists(reordered); // optimistic update (instant UI)

      // Persist new order to backend
      await listsApi.reorder(id, { orderedIds: reordered.map(l => l.id) });

    } else {
      // ── Move card ──────────────────────────────────────────
      const srcListId  = Number(source.droppableId);
      const destListId = Number(destination.droppableId);
      const newLists   = lists.map(l => ({ ...l, cards: [...l.cards] }));

      const srcList  = newLists.find(l => l.id === srcListId);
      const destList = newLists.find(l => l.id === destListId);

      const [movedCard] = srcList.cards.splice(source.index, 1);
      destList.cards.splice(destination.index, 0, movedCard);

      setLists(newLists); // optimistic update

      // Persist to backend — send all card IDs in destination list in new order
      await cardsApi.reorder(destListId, {
        orderedIds: destList.cards.map(c => c.id),
      });

      // If source list changed, update it too
      if (srcListId !== destListId) {
        await cardsApi.reorder(srcListId, {
          orderedIds: srcList.cards.map(c => c.id),
        });
      }
    }
  }

  // ── Card updated in modal — refresh card in lists state ───
  function handleCardUpdated(updatedCard) {
    setLists(prev => prev.map(l => ({
      ...l,
      cards: l.cards.map(c => c.id === updatedCard.id ? { ...c, ...updatedCard } : c)
    })));
  }

  // ── Search ────────────────────────────────────────────────
  async function handleSearch(params) {
    try {
      const res = await boardsApi.search(id, params);
      setSearchResults(res.data);
      setSearchActive(true);
    } catch (err) { console.error(err); }
  }

  function handleClearSearch() {
    setSearchResults(null);
    setSearchActive(false);
  }

  // ── Render ────────────────────────────────────────────────
  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className="spinner" />
      <p>Loading board…</p>
    </div>
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
      {/* Board header */}
      <div className={styles.boardHeader}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.backBtn} title="Back to boards">
            ← Boards
          </Link>

          {/* Editable board title */}
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
                style={{ background: m.color || '#6366f1' }}
                title={m.name}
              >
                {m.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
              </div>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <SearchBar board={board} onSearch={handleSearch} onClear={handleClearSearch} />
      </div>

      {/* Search results overlay */}
      {searchActive && searchResults && (
        <div className={styles.searchResults}>
          <div className={styles.searchResultsHeader}>
            <span>🔍 {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
            <button className="btn-icon" onClick={handleClearSearch}>✕</button>
          </div>
          <div className={styles.searchResultsList}>
            {searchResults.length === 0 ? (
              <p className="text-muted text-sm" style={{ padding: '12px 0' }}>No cards match your search.</p>
            ) : (
              searchResults.map(card => (
                <button
                  key={card.id}
                  className={styles.searchResultItem}
                  onClick={() => { setActiveCard(card.id); handleClearSearch(); }}
                >
                  <span className={styles.srListName}>{card.list_title}</span>
                  <span className={styles.srCardTitle}>{card.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Kanban board — drag and drop context */}
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
                  />
                ))}
                {provided.placeholder}

                {/* Add list button */}
                <AddListForm onCreate={handleCreateList} />
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Card detail modal */}
      {activeCard && (
        <CardModal
          cardId={activeCard}
          board={board}
          onClose={() => setActiveCard(null)}
          onCardUpdated={handleCardUpdated}
          onCardDeleted={(cardId) => {
            setLists(prev => prev.map(l => ({
              ...l,
              cards: l.cards.filter(c => c.id !== cardId)
            })));
            setActiveCard(null);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// AddListForm — inline form fixed at end of list container
// ─────────────────────────────────────────
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
    <button
      id="add-list-btn"
      className={styles.addListBtn}
      onClick={() => setOpen(true)}
    >
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

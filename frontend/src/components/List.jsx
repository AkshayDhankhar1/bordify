// src/components/List.jsx
import { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import CardItem from './CardItem.jsx';
import styles   from './List.module.css';

export default function List({
  list, index,
  onCreateCard, onDeleteCard, onDeleteList, onRenameList, onCardClick, onToggleCardDone,
}) {
  const [editing,    setEditing]    = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const [addingCard, setAddingCard] = useState(false);
  const [cardTitle,  setCardTitle]  = useState('');
  const [showMenu,   setShowMenu]   = useState(false);

  function saveTitle() {
    if (titleValue.trim() && titleValue.trim() !== list.title) {
      onRenameList(list.id, titleValue.trim());
    } else {
      setTitleValue(list.title);
    }
    setEditing(false);
  }

  function handleAddCard(e) {
    e.preventDefault();
    if (!cardTitle.trim()) return;
    onCreateCard(list.id, cardTitle.trim());
    setCardTitle('');
    setAddingCard(false);
  }

  return (
    <Draggable draggableId={`list-${list.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`${styles.list} ${snapshot.isDragging ? styles.listDragging : ''}`}
          id={`list-${list.id}`}
        >
          {/* Header — drag handle */}
          <div className={styles.listHeader} {...provided.dragHandleProps}>
            {editing ? (
              <input
                className={styles.titleInput}
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') { setTitleValue(list.title); setEditing(false); }
                }}
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <h2 className={styles.listTitle} onClick={() => setEditing(true)} title="Click to rename">
                {list.title}
                <span className={styles.cardCount}>{list.cards.length}</span>
              </h2>
            )}

            {/* Options menu */}
            <div className={styles.menuWrapper}>
              <button
                className={`btn-icon ${styles.menuBtn}`}
                onClick={() => setShowMenu(v => !v)}
                title="List options"
              >···</button>
              {showMenu && (
                <div className={styles.menu}>
                  <button className={styles.menuItem} onClick={() => { setEditing(true); setShowMenu(false); }}>
                    ✏️ Rename list
                  </button>
                  <button
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={() => { onDeleteList(list.id); setShowMenu(false); }}
                  >
                    🗑️ Delete list
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cards droppable zone */}
          <Droppable droppableId={String(list.id)} type="CARD">
            {(droppableProvided, droppableSnapshot) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                className={`${styles.cardsArea} ${droppableSnapshot.isDraggingOver ? styles.cardsAreaOver : ''}`}
              >
                {list.cards.map((card, cardIndex) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    index={cardIndex}
                    onClick={() => onCardClick(card.id)}
                    onDelete={() => onDeleteCard(list.id, card.id)}
                    onToggleDone={() => onToggleCardDone(list.id, card)}
                  />
                ))}
                {droppableProvided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Add card form */}
          {addingCard ? (
            <form className={styles.addCardForm} onSubmit={handleAddCard}>
              <textarea
                className={`input ${styles.cardTitleInput}`}
                placeholder="Enter card title…"
                value={cardTitle}
                onChange={e => setCardTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(e); } }}
                autoFocus
                rows={2}
              />
              <div className={styles.addCardActions}>
                <button type="submit" className="btn btn-primary btn-sm">Add Card</button>
                <button type="button" className="btn-icon" onClick={() => { setAddingCard(false); setCardTitle(''); }}>✕</button>
              </div>
            </form>
          ) : (
            <button
              className={styles.addCardBtn}
              onClick={() => setAddingCard(true)}
              id={`add-card-${list.id}`}
            >
              + Add a card
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}

// src/components/CardItem.jsx
// A single card on the Kanban board (compact view).
// Shows: cover color, labels, title, due date badge, member avatars.

import { Draggable } from '@hello-pangea/dnd';
import { format, isPast, isToday } from 'date-fns';
import styles from './CardItem.module.css';

export default function CardItem({ card, index, onClick, onDelete }) {
  const hasCover   = Boolean(card.cover_color);
  const hasLabels  = card.labels?.length > 0;
  const hasMembers = card.members?.length > 0;

  // Due date state
  let dueState = null;
  if (card.due_date) {
    const due = new Date(card.due_date);
    if (isToday(due))      dueState = 'today';
    else if (isPast(due))  dueState = 'overdue';
    else                   dueState = 'upcoming';
  }

  return (
    <Draggable draggableId={`card-${card.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.card} ${snapshot.isDragging ? styles.cardDragging : ''}`}
          id={`card-${card.id}`}
        >
          {/* Cover color strip */}
          {hasCover && (
            <div className={styles.cover} style={{ background: card.cover_color }} />
          )}

          {/* Card body */}
          <div className={styles.body} onClick={onClick}>
            {/* Labels */}
            {hasLabels && (
              <div className={styles.labels}>
                {card.labels.map(label => (
                  <span
                    key={label.id}
                    className={styles.label}
                    style={{ background: label.color }}
                    title={label.name}
                  />
                ))}
              </div>
            )}

            {/* Title */}
            <p className={styles.title}>{card.title}</p>

            {/* Footer: due date + members */}
            {(dueState || hasMembers || card.description) && (
              <div className={styles.footer}>
                <div className={styles.footerLeft}>
                  {/* Due date chip */}
                  {dueState && (
                    <span className={`${styles.due} ${styles[`due_${dueState}`]}`}>
                      📅 {format(new Date(card.due_date), 'MMM d')}
                    </span>
                  )}
                  {/* Description indicator */}
                  {card.description && (
                    <span className={styles.indicator} title="Has description">≡</span>
                  )}
                </div>

                {/* Member avatars */}
                {hasMembers && (
                  <div className={styles.members}>
                    {card.members.slice(0, 3).map(m => (
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
                )}
              </div>
            )}
          </div>

          {/* Quick delete on hover */}
          <button
            className={styles.deleteBtn}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete card"
          >
            ✕
          </button>
        </div>
      )}
    </Draggable>
  );
}

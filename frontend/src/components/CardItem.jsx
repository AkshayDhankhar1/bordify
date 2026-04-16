import { Draggable } from '@hello-pangea/dnd';
import { format, isPast, isToday } from 'date-fns';
import styles from './CardItem.module.css';

// Helper to wrap URLs in <a> tags
function renderTextWithLinks(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={styles.inlineLink}
          onClick={(e) => e.stopPropagation()} // Prevent opening CardModal when clicking a link
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function CardItem({ card, index, onClick, onDelete, onToggleDone }) {
  const hasCover   = Boolean(card.cover_color);
  const hasLabels  = card.labels?.length > 0;
  const hasMembers = card.members?.length > 0;

  let dueState = null;
  if (card.due_date) {
    const due = new Date(card.due_date);
    if (isToday(due))     dueState = 'today';
    else if (isPast(due)) dueState = 'overdue';
    else                  dueState = 'upcoming';
  }

  const isDone = card.is_done;

  return (
    <Draggable draggableId={`card-${card.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.card} ${snapshot.isDragging ? styles.cardDragging : ''} ${isDone ? styles.cardDone : ''}`}
          id={`card-${card.id}`}
        >
          {/* Cover */}
          {hasCover && (
            <div className={styles.cover} style={{ background: card.cover_color }} />
          )}

          {/* Body */}
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
            <div className={styles.title}>{renderTextWithLinks(card.title)}</div>

            {/* Footer */}
            {(dueState || hasMembers || card.description) && (
              <div className={styles.footer}>
                <div className={styles.footerLeft}>
                  {dueState && (
                    <span className={`${styles.due} ${styles[`due_${dueState}`]}`}>
                      📅 {format(new Date(card.due_date), 'MMM d')}
                    </span>
                  )}
                  {card.description && (
                    <span className={styles.indicator} title="Has description">≡</span>
                  )}
                </div>

                {hasMembers && (
                  <div className={styles.members}>
                    {card.members.slice(0, 3).map(m => (
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
                )}
              </div>
            )}
          </div>

          {/* Action row: Done + Delete (visible on hover) */}
          <div className={styles.actions}>
            <button
              className={`${styles.doneBtn} ${isDone ? styles.doneBtnActive : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleDone(); }}
              title={isDone ? 'Mark as not done' : 'Mark as done'}
            >
              {isDone ? '✓ Done' : '✓ Mark done'}
            </button>
            <button
              className={styles.deleteBtn}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete card"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

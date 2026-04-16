// src/components/CardModal.jsx
// Full-featured card detail modal.
// Features: edit title, description, due date, labels, members, checklists, comments, cover color, archive/delete.

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { cardsApi } from '../api/index.js';
import styles from './CardModal.module.css';

// Cover color options
const COVER_COLORS = [
  '#ef4444', '#f59e0b', '#22c55e', '#06b6d4',
  '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', null // null = remove cover
];

export default function CardModal({ cardId, board, onClose, onCardUpdated, onCardDeleted }) {
  const [card,          setCard]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [editingTitle,  setEditingTitle]  = useState(false);
  const [titleVal,      setTitleVal]      = useState('');
  const [editingDesc,   setEditingDesc]   = useState(false);
  const [descVal,       setDescVal]       = useState('');
  const [dueDate,       setDueDate]       = useState('');
  const [activeSection, setActiveSection] = useState('details'); // sidebar navigation
  const [newComment,    setNewComment]    = useState('');
  const [newCheckTitle, setNewCheckTitle] = useState('');
  const [newItemText,   setNewItemText]   = useState({});  // { checklistId: string }
  const overlayRef = useRef(null);

  useEffect(() => {
    loadCard();
  }, [cardId]);

  async function loadCard() {
    try {
      setLoading(true);
      const res = await cardsApi.getById(cardId);
      setCard(res.data);
      setTitleVal(res.data.title);
      setDescVal(res.data.description || '');
      setDueDate(res.data.due_date ? res.data.due_date.split('T')[0] : '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Title edit ─────────────────────────────────────────────
  async function saveTitle() {
    if (!titleVal.trim() || titleVal.trim() === card.title) { setEditingTitle(false); return; }
    const res = await cardsApi.update(cardId, { title: titleVal.trim() });
    setCard(prev => ({ ...prev, title: res.data.title }));
    onCardUpdated(res.data);
    setEditingTitle(false);
  }

  // ── Description edit ───────────────────────────────────────
  async function saveDesc() {
    const res = await cardsApi.update(cardId, { description: descVal });
    setCard(prev => ({ ...prev, description: res.data.description }));
    onCardUpdated(res.data);
    setEditingDesc(false);
  }

  // ── Due date ───────────────────────────────────────────────
  async function saveDueDate(val) {
    setDueDate(val);
    const res = await cardsApi.update(cardId, { due_date: val || null });
    setCard(prev => ({ ...prev, due_date: res.data.due_date }));
    onCardUpdated(res.data);
  }

  // ── Cover color ────────────────────────────────────────────
  async function setCoverColor(color) {
    const res = await cardsApi.update(cardId, { cover_color: color });
    setCard(prev => ({ ...prev, cover_color: res.data.cover_color }));
    onCardUpdated(res.data);
  }

  // ── Labels ─────────────────────────────────────────────────
  const cardLabelIds = new Set(card?.labels?.map(l => l.id) || []);

  async function toggleLabel(label) {
    if (cardLabelIds.has(label.id)) {
      await cardsApi.removeLabel(cardId, label.id);
      setCard(prev => ({ ...prev, labels: prev.labels.filter(l => l.id !== label.id) }));
    } else {
      await cardsApi.addLabel(cardId, { label_id: label.id });
      setCard(prev => ({ ...prev, labels: [...prev.labels, label] }));
    }
  }

  // ── Members ────────────────────────────────────────────────
  const cardMemberIds = new Set(card?.members?.map(m => m.id) || []);

  async function toggleMember(member) {
    if (cardMemberIds.has(member.id)) {
      await cardsApi.removeMember(cardId, member.id);
      setCard(prev => ({ ...prev, members: prev.members.filter(m => m.id !== member.id) }));
    } else {
      await cardsApi.addMember(cardId, { member_id: member.id });
      setCard(prev => ({ ...prev, members: [...prev.members, member] }));
    }
  }

  // ── Checklists ─────────────────────────────────────────────
  async function addChecklist(e) {
    e.preventDefault();
    if (!newCheckTitle.trim()) return;
    const res = await cardsApi.createChecklist(cardId, { title: newCheckTitle.trim() });
    setCard(prev => ({ ...prev, checklists: [...(prev.checklists || []), res.data] }));
    setNewCheckTitle('');
  }

  async function deleteChecklist(checklistId) {
    await cardsApi.deleteChecklist(checklistId);
    setCard(prev => ({ ...prev, checklists: prev.checklists.filter(c => c.id !== checklistId) }));
  }

  async function addItem(checklistId) {
    const text = (newItemText[checklistId] || '').trim();
    if (!text) return;
    const res = await cardsApi.addChecklistItem(checklistId, { text });
    setCard(prev => ({
      ...prev,
      checklists: prev.checklists.map(cl =>
        cl.id === checklistId ? { ...cl, items: [...cl.items, res.data] } : cl
      )
    }));
    setNewItemText(prev => ({ ...prev, [checklistId]: '' }));
  }

  async function toggleItem(checklistId, itemId, isDone) {
    const res = await cardsApi.updateChecklistItem(itemId, { is_done: !isDone });
    setCard(prev => ({
      ...prev,
      checklists: prev.checklists.map(cl =>
        cl.id === checklistId
          ? { ...cl, items: cl.items.map(it => it.id === itemId ? res.data : it) }
          : cl
      )
    }));
  }

  async function deleteItem(checklistId, itemId) {
    await cardsApi.deleteChecklistItem(itemId);
    setCard(prev => ({
      ...prev,
      checklists: prev.checklists.map(cl =>
        cl.id === checklistId ? { ...cl, items: cl.items.filter(it => it.id !== itemId) } : cl
      )
    }));
  }

  // ── Comments ───────────────────────────────────────────────
  async function submitComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    const res = await cardsApi.addComment(cardId, { body: newComment.trim(), member_id: 1 });
    setCard(prev => ({ ...prev, comments: [...(prev.comments || []), res.data] }));
    setNewComment('');
  }

  async function deleteComment(commentId) {
    await cardsApi.deleteComment(commentId);
    setCard(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }));
  }

  // ── Archive / Delete ───────────────────────────────────────
  async function archiveCard() {
    await cardsApi.update(cardId, { is_archived: true });
    onCardDeleted(cardId);
  }

  async function deleteCard() {
    if (!window.confirm('Delete this card permanently?')) return;
    await cardsApi.delete(cardId);
    onCardDeleted(cardId);
  }

  // ── Close on overlay click ─────────────────────────────────
  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  if (loading) return (
    <div className="overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.loadingState}><div className="spinner" /></div>
      </div>
    </div>
  );

  if (!card) return null;

  // Checklist progress
  const allItems  = (card.checklists || []).flatMap(cl => cl.items || []);
  const doneItems = allItems.filter(it => it.is_done).length;
  const progress  = allItems.length ? Math.round((doneItems / allItems.length) * 100) : 0;

  return (
    <div className="overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal} id={`card-modal-${card.id}`}>

        {/* Cover */}
        {card.cover_color && (
          <div className={styles.cover} style={{ background: card.cover_color }} />
        )}

        {/* Close button */}
        <button className={styles.closeBtn} onClick={onClose} id="modal-close-btn">✕</button>

        <div className={styles.body}>
          {/* ── Left column: main content ── */}
          <div className={styles.main}>

            {/* Labels row */}
            {card.labels?.length > 0 && (
              <div className={styles.labelsRow}>
                {card.labels.map(l => (
                  <span
                    key={l.id}
                    className={styles.labelChip}
                    style={{ background: l.color }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            {editingTitle ? (
              <textarea
                className={`input ${styles.titleInput}`}
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTitle(); } }}
                autoFocus
                rows={2}
              />
            ) : (
              <h2 className={styles.cardTitle} onClick={() => setEditingTitle(true)}>
                {card.title}
              </h2>
            )}

            {/* Meta: list name */}
            <p className={styles.listMeta}>in list <strong>{card.list_title || ''}</strong></p>

            {/* Members display */}
            {card.members?.length > 0 && (
              <div className={styles.section}>
                <h4 className={styles.sectionLabel}>Members</h4>
                <div className={styles.membersRow}>
                  {card.members.map(m => (
                    <div
                      key={m.id}
                      className={`avatar ${styles.memberAv}`}
                      style={{ background: m.color }}
                      title={m.name}
                    >
                      {m.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionLabel}>≡ Description</h4>
                {!editingDesc && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingDesc(true)}>
                    {card.description ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              {editingDesc ? (
                <>
                  <textarea
                    className={`input ${styles.descInput}`}
                    value={descVal}
                    onChange={e => setDescVal(e.target.value)}
                    placeholder="Add a more detailed description…"
                    autoFocus
                    rows={4}
                  />
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-primary btn-sm" onClick={saveDesc}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setDescVal(card.description || ''); setEditingDesc(false); }}>Cancel</button>
                  </div>
                </>
              ) : (
                <p
                  className={`${styles.descText} ${!card.description ? styles.descPlaceholder : ''}`}
                  onClick={() => setEditingDesc(true)}
                >
                  {card.description || 'Add a description…'}
                </p>
              )}
            </div>

            {/* Checklists */}
            {(card.checklists || []).map(cl => {
              const clDone  = cl.items.filter(i => i.is_done).length;
              const clTotal = cl.items.length;
              const clPct   = clTotal ? Math.round((clDone / clTotal) * 100) : 0;
              return (
                <div key={cl.id} className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionLabel}>
                      ☑ {cl.title}
                      <span className={styles.clProgress}>{clDone}/{clTotal}</span>
                    </h4>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteChecklist(cl.id)}
                    >
                      Delete
                    </button>
                  </div>
                  {/* Progress bar */}
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${clPct}%` }} />
                  </div>
                  {/* Items */}
                  <div className={styles.checkItems}>
                    {cl.items.map(item => (
                      <div key={item.id} className={styles.checkItem}>
                        <input
                          type="checkbox"
                          id={`item-${item.id}`}
                          checked={item.is_done}
                          onChange={() => toggleItem(cl.id, item.id, item.is_done)}
                          className={styles.checkbox}
                        />
                        <label
                          htmlFor={`item-${item.id}`}
                          className={`${styles.checkLabel} ${item.is_done ? styles.checkLabelDone : ''}`}
                        >
                          {item.text}
                        </label>
                        <button
                          className="btn-icon"
                          style={{ fontSize: '11px' }}
                          onClick={() => deleteItem(cl.id, item.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {/* Add item */}
                    <div className={styles.addItemRow}>
                      <input
                        className={`input ${styles.addItemInput}`}
                        placeholder="Add an item…"
                        value={newItemText[cl.id] || ''}
                        onChange={e => setNewItemText(prev => ({ ...prev, [cl.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(cl.id); }}}
                      />
                      <button className="btn btn-ghost btn-sm" onClick={() => addItem(cl.id)}>Add</button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Comments */}
            <div className={styles.section}>
              <h4 className={styles.sectionLabel}>💬 Activity</h4>
              <form onSubmit={submitComment} className={styles.commentForm}>
                <div className={`avatar ${styles.commentAvatar}`} style={{ background: '#6366f1' }}>A</div>
                <div className={styles.commentInputWrap}>
                  <textarea
                    className={`input ${styles.commentInput}`}
                    placeholder="Write a comment…"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    rows={2}
                  />
                  {newComment.trim() && (
                    <button type="submit" className="btn btn-primary btn-sm mt-2">Save</button>
                  )}
                </div>
              </form>
              {(card.comments || []).map(c => (
                <div key={c.id} className={styles.comment}>
                  <div
                    className={`avatar ${styles.commentAvatar}`}
                    style={{ background: c.member_color || '#6366f1' }}
                  >
                    {(c.member_name || 'U').split(' ').map(p => p[0]).join('').slice(0,2)}
                  </div>
                  <div className={styles.commentContent}>
                    <div className={styles.commentMeta}>
                      <strong>{c.member_name || 'Unknown'}</strong>
                      <span className="text-muted text-xs">
                        {c.created_at ? format(new Date(c.created_at), 'MMM d, h:mm a') : ''}
                      </span>
                    </div>
                    <p className={styles.commentBody}>{c.body}</p>
                    <button
                      className={`text-xs text-muted ${styles.deleteCommentBtn}`}
                      onClick={() => deleteComment(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right sidebar: actions ── */}
          <div className={styles.sidebar}>
            <p className={styles.sidebarTitle}>Add to card</p>

            {/* Members */}
            <div className={styles.sidebarBlock}>
              <p className={styles.sidebarBlockTitle}>👤 Members</p>
              {(board?.members || []).map(m => (
                <button
                  key={m.id}
                  className={`${styles.sidebarItem} ${cardMemberIds.has(m.id) ? styles.sidebarItemActive : ''}`}
                  onClick={() => toggleMember(m)}
                >
                  <div className="avatar" style={{ background: m.color }}>
                    {m.name.split(' ').map(p => p[0]).join('').slice(0,2)}
                  </div>
                  <span>{m.name}</span>
                  {cardMemberIds.has(m.id) && <span className={styles.checkmark}>✓</span>}
                </button>
              ))}
            </div>

            {/* Labels */}
            <div className={styles.sidebarBlock}>
              <p className={styles.sidebarBlockTitle}>🏷️ Labels</p>
              {(board?.labels || []).map(l => (
                <button
                  key={l.id}
                  className={`${styles.labelOption} ${cardLabelIds.has(l.id) ? styles.labelOptionActive : ''}`}
                  onClick={() => toggleLabel(l)}
                  style={{ '--label-color': l.color }}
                >
                  <span className={styles.labelDot} style={{ background: l.color }} />
                  <span>{l.name}</span>
                  {cardLabelIds.has(l.id) && <span className={styles.checkmark}>✓</span>}
                </button>
              ))}
            </div>

            {/* Due Date */}
            <div className={styles.sidebarBlock}>
              <p className={styles.sidebarBlockTitle}>📅 Due Date</p>
              <input
                type="date"
                className={`input ${styles.dateInput}`}
                value={dueDate}
                onChange={e => saveDueDate(e.target.value)}
              />
              {dueDate && (
                <button
                  className={`btn btn-ghost btn-sm ${styles.clearDue}`}
                  onClick={() => saveDueDate('')}
                >
                  Remove
                </button>
              )}
            </div>

            {/* Cover Color */}
            <div className={styles.sidebarBlock}>
              <p className={styles.sidebarBlockTitle}>🎨 Cover</p>
              <div className={styles.coverPicker}>
                {COVER_COLORS.map((color, i) =>
                  color ? (
                    <button
                      key={color}
                      className={`${styles.coverSwatch} ${card.cover_color === color ? styles.coverSwatchActive : ''}`}
                      style={{ background: color }}
                      onClick={() => setCoverColor(color)}
                    />
                  ) : (
                    <button
                      key="none"
                      className={styles.coverNone}
                      onClick={() => setCoverColor(null)}
                      title="Remove cover"
                    >
                      ✕
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Checklist */}
            <div className={styles.sidebarBlock}>
              <p className={styles.sidebarBlockTitle}>☑ Checklist</p>
              <form onSubmit={addChecklist} className={styles.addCheckForm}>
                <input
                  className="input"
                  placeholder="Checklist title"
                  value={newCheckTitle}
                  onChange={e => setNewCheckTitle(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm mt-2 w-full">Add</button>
              </form>
            </div>

            {/* Danger zone */}
            <div className={styles.sidebarBlock}>
              <p className={styles.sidebarBlockTitle}>Actions</p>
              <button className="btn btn-ghost btn-sm w-full" onClick={archiveCard} style={{ marginBottom: 6 }}>
                📦 Archive
              </button>
              <button className="btn btn-danger btn-sm w-full" onClick={deleteCard}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/components/SearchBar.jsx
// Provides title search and filtering by label, member, and due date.

import { useState } from 'react';
import styles from './SearchBar.module.css';

export default function SearchBar({ board, onSearch, onClear }) {
  const [query,    setQuery]    = useState('');
  const [label,    setLabel]    = useState('');
  const [member,   setMember]   = useState('');
  const [due,      setDue]      = useState('');
  const [expanded, setExpanded] = useState(false);

  function handleSearch(e) {
    e?.preventDefault();
    onSearch({ q: query, label, member, due });
  }

  function handleClear() {
    setQuery(''); setLabel(''); setMember(''); setDue('');
    onClear();
  }

  return (
    <div className={styles.container}>
      <form className={styles.searchRow} onSubmit={handleSearch}>
        <div className={styles.inputWrap}>
          <span className={styles.icon}>🔍</span>
          <input
            className={styles.input}
            placeholder="Search cards…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <button type="button" className={styles.filterToggle} onClick={() => setExpanded(v => !v)}>
          ⚙ Filters
        </button>
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
        {(query || label || member || due) && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>Clear</button>
        )}
      </form>

      {expanded && (
        <div className={styles.filtersPanel}>
          {/* Label filter */}
          <select
            className={`input ${styles.select}`}
            value={label}
            onChange={e => setLabel(e.target.value)}
          >
            <option value="">Any label</option>
            {(board?.labels || []).map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {/* Member filter */}
          <select
            className={`input ${styles.select}`}
            value={member}
            onChange={e => setMember(e.target.value)}
          >
            <option value="">Any member</option>
            {(board?.members || []).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Due date filter */}
          <select
            className={`input ${styles.select}`}
            value={due}
            onChange={e => setDue(e.target.value)}
          >
            <option value="">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="soon">Due soon (3 days)</option>
          </select>
        </div>
      )}
    </div>
  );
}

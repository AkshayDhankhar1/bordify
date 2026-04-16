// src/components/Navbar.jsx
// Top navigation bar — shows Boardify logo and back button when inside a board.

import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Navbar() {
  const location = useLocation();
  const isBoard = location.pathname.startsWith('/board/');

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>Boardify</span>
        </Link>

        {/* Center tagline — only on home */}
        {!isBoard && (
          <span className={styles.tagline}>Your workspace, organized.</span>
        )}

        {/* Right side */}
        <div className={styles.right}>
          <div className={styles.userChip}>
            <div className={styles.userAvatar}>A</div>
            <span>Alice</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

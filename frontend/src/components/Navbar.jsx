// src/components/Navbar.jsx
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.logo}>
        <div className={styles.logoIcon}>🗂️</div>
        <span className={styles.logoText}>Boardify</span>
      </Link>

      <div className={styles.spacer} />

      <Link to="/" className={styles.navAction}>
        + New Board
      </Link>

      <div className={styles.navAvatar} title="Alice Johnson">AJ</div>
    </nav>
  );
}

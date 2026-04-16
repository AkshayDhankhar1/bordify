// src/App.jsx
// Root component — sets up routing between Home (board list) and Board view.

import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home   from './pages/Home.jsx';
import Board  from './pages/Board.jsx';
import './App.css';

export default function App() {
  return (
    // The outer wrapper ensures the app fills the full viewport height
    <div className="app-shell">
      <Navbar />
      <Routes>
        {/* Home page — shows all boards */}
        <Route path="/"          element={<Home />} />
        {/* Board page — shows a single board's lists and cards */}
        <Route path="/board/:id" element={<Board />} />
      </Routes>
    </div>
  );
}

# Boardify — Kanban Project Management Tool

A full-stack Trello clone built as an SDE Intern assignment. Features a beautiful dark-mode UI, smooth drag-and-drop, and all core Trello features.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 19 + Vite + CSS Modules       |
| Backend  | Node.js + Express 4                 |
| Database | PostgreSQL (Neon DB — serverless)   |
| DnD      | @hello-pangea/dnd                   |
| HTTP     | Axios                               |

## Features

- ✅ Multiple boards with custom backgrounds
- ✅ Create, rename, delete Lists (columns)
- ✅ Create, edit, delete Cards
- ✅ **Drag & drop** — reorder lists and cards, move cards between lists
- ✅ Card details: description, due date, cover color
- ✅ Labels (colored tags) on cards
- ✅ Assign members to cards
- ✅ Checklists with progress bar
- ✅ Comments / activity log
- ✅ Search cards by title
- ✅ Filter by label, member, or due date
- ✅ Archive cards
- ✅ Responsive design

## Project Structure

```
Boardify/
├── backend/
│   ├── controllers/          # Business logic
│   │   ├── boardController.js
│   │   ├── listController.js
│   │   ├── cardController.js
│   │   └── memberController.js
│   ├── routes/               # Express route definitions
│   │   ├── boards.js
│   │   ├── lists.js
│   │   ├── cards.js
│   │   └── members.js
│   ├── db/
│   │   ├── pool.js           # PostgreSQL connection pool
│   │   ├── schema.sql        # Database schema
│   │   └── seed.js           # Sample data seeder
│   ├── app.js                # Express app setup
│   ├── server.js             # Server entry point
│   └── .env.example          # Environment variables template
└── frontend/
    ├── src/
    │   ├── api/index.js      # Axios API service (all HTTP calls)
    │   ├── components/
    │   │   ├── Navbar.jsx    # Top navigation
    │   │   ├── List.jsx      # Kanban list column
    │   │   ├── CardItem.jsx  # Card on board (compact)
    │   │   ├── CardModal.jsx # Full card detail modal
    │   │   └── SearchBar.jsx # Search + filter bar
    │   ├── pages/
    │   │   ├── Home.jsx      # Board list page
    │   │   └── Board.jsx     # Main kanban board page
    │   ├── App.jsx           # Routing
    │   └── index.css         # Global CSS design system
    └── index.html
```

## Database Schema

```
members → board_members ← boards → labels
                   ↓
                 lists
                   ↓
                 cards → card_labels
                   ↓    → card_members
               checklists
                   ↓
            checklist_items
                   ↓
               comments
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- A [Neon DB](https://neon.tech) account (free tier works)

### 1. Clone the repository
```bash
git clone https://github.com/AkshayDhankhar1/bordify.git
cd bordify
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
# Fill in your Neon DB DATABASE_URL in .env
npm install
npm run seed      # Creates schema + sample data
npm run dev       # Starts dev server on port 5000
```

### 3. Frontend setup
```bash
cd frontend
cp .env.example .env.local
# VITE_API_URL should point to your backend (default: http://localhost:5000/api)
npm install
npm run dev       # Starts Vite on port 5173
```

### 4. Open the app
Visit **http://localhost:5173**

## Assumptions
- No authentication — Alice Johnson (member ID 1) is treated as the default logged-in user
- Sample data is seeded via `npm run seed` in the backend
- Board backgrounds are preset gradient themes

## Author
Akshay Dhankhar — SDE Intern Assignment 2026

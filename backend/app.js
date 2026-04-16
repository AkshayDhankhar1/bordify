// app.js
// Sets up the Express application: middleware, routes, and error handling.
// server.js is the entry point that imports this and starts listening.

import express   from 'express';
import cors      from 'cors';
import dotenv    from 'dotenv';

import boardRoutes  from './routes/boards.js';
import listRoutes   from './routes/lists.js';
import cardRoutes   from './routes/cards.js';
import memberRoutes from './routes/members.js';

dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────────
// Parse incoming JSON request bodies
app.use(express.json());

// CORS: allow React dev server (port 5173) and production origin
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL || ''
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

// ── Routes ──────────────────────────────────────────────────
// All routes are prefixed with /api
app.use('/api/boards',  boardRoutes);   // /api/boards/*
app.use('/api/lists',   listRoutes);    // /api/lists/*
app.use('/api/cards',   cardRoutes);    // /api/cards/*
app.use('/api/members', memberRoutes);  // /api/members

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', project: 'Boardify', timestamp: new Date().toISOString() });
});

// ── 404 Handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────
// Express calls this when next(err) is called with an error
app.use((err, _req, res, _next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;

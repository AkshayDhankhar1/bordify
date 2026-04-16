// src/api/index.js
// Centralized API service using axios.
// All HTTP calls go through here — one place to update the base URL.
// This makes it very easy to explain: "all backend calls live in /api/index.js"

import axios from 'axios';

// The backend URL comes from Vite environment variables.
// In dev: VITE_API_URL is set in .env.local. Falls back to localhost.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create an axios instance so we don't repeat config
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 second timeout
});

// ─────────────────────────────────────────
// BOARDS
// ─────────────────────────────────────────
export const boardsApi = {
  getAll:   ()           => api.get('/boards'),
  getById:  (id)         => api.get(`/boards/${id}`),
  create:   (data)       => api.post('/boards', data),
  update:   (id, data)   => api.patch(`/boards/${id}`, data),
  delete:   (id)         => api.delete(`/boards/${id}`),
  search:   (id, params) => api.get(`/boards/${id}/search`, { params }),
};

// ─────────────────────────────────────────
// LISTS
// ─────────────────────────────────────────
export const listsApi = {
  create:  (boardId, data)   => api.post(`/boards/${boardId}/lists`, data),
  update:  (id, data)        => api.patch(`/lists/${id}`, data),
  delete:  (id)              => api.delete(`/lists/${id}`),
  reorder: (boardId, data)   => api.put(`/boards/${boardId}/lists/reorder`, data),
};

// ─────────────────────────────────────────
// CARDS
// ─────────────────────────────────────────
export const cardsApi = {
  create:       (listId, data)             => api.post(`/lists/${listId}/cards`, data),
  getById:      (id)                       => api.get(`/cards/${id}`),
  update:       (id, data)                 => api.patch(`/cards/${id}`, data),
  delete:       (id)                       => api.delete(`/cards/${id}`),
  reorder:      (listId, data)             => api.put(`/lists/${listId}/cards/reorder`, data),
  addLabel:     (id, data)                 => api.post(`/cards/${id}/labels`, data),
  removeLabel:  (id, labelId)              => api.delete(`/cards/${id}/labels/${labelId}`),
  addMember:    (id, data)                 => api.post(`/cards/${id}/members`, data),
  removeMember: (id, memberId)             => api.delete(`/cards/${id}/members/${memberId}`),
  createChecklist:     (id, data)          => api.post(`/cards/${id}/checklists`, data),
  deleteChecklist:     (checklistId)       => api.delete(`/cards/checklists/${checklistId}`),
  addChecklistItem:    (checklistId, data) => api.post(`/cards/checklists/${checklistId}/items`, data),
  updateChecklistItem: (itemId, data)      => api.patch(`/cards/checklist-items/${itemId}`, data),
  deleteChecklistItem: (itemId)            => api.delete(`/cards/checklist-items/${itemId}`),
  addComment:   (id, data)                 => api.post(`/cards/${id}/comments`, data),
  deleteComment:(commentId)                => api.delete(`/cards/comments/${commentId}`),
};

// ─────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────
export const membersApi = {
  getAll: () => api.get('/members'),
};

export default api;

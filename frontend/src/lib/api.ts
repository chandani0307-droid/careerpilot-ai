// src/lib/api.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://careerpilot-ai-1-cvit.onrender.com/api';

// Unique session ID for persistent user state across pages
const getSessionId = () => {
  let id = localStorage.getItem('cp_session_id');
  if (!id) {
    id = 'session_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('cp_session_id', id);
  }
  return id;
};

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'x-session-id': getSessionId(),
      },
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  },

  async upload<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'x-session-id': getSessionId(), // Must pass session ID here!
      },
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Upload failed with status ${res.status}`);
    }
    return res.json();
  },
};
import { create } from 'zustand';
import { ChatSession } from '../types/chat';

interface SessionState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  setSessions: (sessions: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => void;
  addSession: (session: ChatSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  updateSessionTitle: (id: string, title: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  activeSessionId: null,

  // Accepts either a plain array or a functional updater
  setSessions: (sessions) =>
    set((state) => ({
      sessions: typeof sessions === 'function' ? sessions(state.sessions) : sessions,
    })),

  addSession: (session) =>
    set((s) => ({ sessions: [session, ...s.sessions] })),

  removeSession: (id) =>
    set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),

  setActiveSession: (id) => set({ activeSessionId: id }),

  // Only updates the title field — never replaces the whole session object
  updateSessionTitle: (id, title) =>
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === id ? { ...x, title } : x
      ),
    })),
}));

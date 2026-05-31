import { create } from 'zustand';
import { AgentEvent } from '../types/chat';

interface ChatState {
  streamingContent: string;
  isStreaming: boolean;
  currentStep: string;
  tokensUsed: number;
  costUsd: number;
  hitlRequired: boolean;
  hitlReason: string;
  emergencyDetected: boolean;
  riskLevel: string;
  sessionId: string | null;
  newSessionTitle: string | null;

  setSessionId: (id: string | null) => void;
  handleAgentEvent: (event: AgentEvent) => void;
  startStreaming: () => void;
  stopStreaming: () => void;
  resetChat: () => void;
  clearHITL: () => void;
  clearNewTitle: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  streamingContent: '',
  isStreaming: false,
  currentStep: '',
  tokensUsed: 0,
  costUsd: 0,
  hitlRequired: false,
  hitlReason: '',
  emergencyDetected: false,
  riskLevel: 'low',
  sessionId: null,
  newSessionTitle: null,

  setSessionId: (id) => set({ sessionId: id }),

  handleAgentEvent: (event: AgentEvent) => {
    switch (event.type) {
      case 'thinking':
        set({ currentStep: event.message || 'Thinking...' });
        break;
      case 'tool_start':
        set({ currentStep: `Using tool: ${event.tool}...` });
        break;
      case 'tool_result':
        set({ currentStep: `${event.tool} complete ✓` });
        break;
      case 'message':
        set((s) => ({ streamingContent: s.streamingContent + (event.content || '') }));
        break;
      case 'risk_update':
        set({ riskLevel: event.risk_level || 'low' });
        break;
      case 'hitl_required':
        set({ hitlRequired: true, hitlReason: event.reason || '', isStreaming: false });
        break;
      case 'emergency':
        set({ emergencyDetected: true, riskLevel: event.risk_level || 'critical' });
        break;
      case 'token_update':
        set({ tokensUsed: event.tokens || 0, costUsd: event.cost || 0 });
        break;
      case 'done':
        set((s) => ({
          isStreaming: false,
          streamingContent: '',
          currentStep: '',
          sessionId: event.session_id || s.sessionId,
          newSessionTitle: event.title || null,
          // Preserve risk from done event — never reset to low here
          riskLevel: event.risk_level || s.riskLevel,
        }));
        break;
      case 'error':
        set({ isStreaming: false, currentStep: '', streamingContent: '' });
        break;
    }
  },

  startStreaming: () => set({
    isStreaming: true,
    streamingContent: '',
    currentStep: '',
    emergencyDetected: false,
    newSessionTitle: null,
    riskLevel: 'low',
  }),
  stopStreaming: () => set({ isStreaming: false, streamingContent: '', currentStep: '' }),
  resetChat: () => set({
    streamingContent: '',
    isStreaming: false,
    currentStep: '',
    hitlRequired: false,
    hitlReason: '',
    emergencyDetected: false,
    riskLevel: 'low',
    tokensUsed: 0,
    costUsd: 0,
    newSessionTitle: null,
  }),
  clearHITL: () => set({ hitlRequired: false, hitlReason: '' }),
  clearNewTitle: () => set({ newSessionTitle: null }),
}));

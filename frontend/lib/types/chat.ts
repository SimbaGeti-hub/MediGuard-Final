export type Role = 'user' | 'assistant' | 'system' | 'tool';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgentStep {
  iteration: number;
  thought: string;
  tool_calls: string[];
  observation?: string;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  role: Role;
  content: string;
  tool_calls: string[];
  agent_steps: AgentStep[];
  tokens_used: number;
  cost_usd: number;
  model_used: string;
  risk_level: RiskLevel;
  hitl_triggered: boolean;
  feedback_rating?: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  summary?: string;
  is_archived: boolean;
  risk_level: RiskLevel;
  created_at: string;
  updated_at: string;
}

export type AgentEventType =
  | 'thinking' | 'tool_start' | 'tool_result' | 'message'
  | 'hitl_required' | 'emergency' | 'token_update' | 'risk_update' | 'done' | 'error';

export interface AgentEvent {
  type: AgentEventType;
  message?: string;
  content?: string;
  tool?: string;
  status?: string;
  reason?: string;
  session_id?: string;
  title?: string;
  risk_level?: string;
  tokens?: number;
  cost?: number;
  done?: boolean;
  error?: string;
}

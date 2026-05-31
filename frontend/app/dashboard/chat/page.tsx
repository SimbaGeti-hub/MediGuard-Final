'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAccessToken } from '@/lib/supabase/client';
import { streamChat, approveHITL, getMessages, submitFeedback } from '@/lib/api/chat';
import { fetchSessions, createSession, deleteSession } from '@/lib/api/sessions';
import { useLanguage } from '@/components/LanguageProvider';
import { useTranslation } from '@/lib/i18n/useTranslation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/lib/types/chat';

const riskColors: Record<string, string> = {
  low: 'var(--success)',
  medium: 'var(--warning)',
  high: '#f97316',
  critical: 'var(--danger)',
};

function MdMessage({ content }: { content: string }) {
  return (
    <div className="prose-medical">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '4px 2px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="typing-dot"
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--brand)',
            display: 'inline-block',
            animationDelay: `${i * 0.16}s`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

function MessageBubble({
  msg, onFeedback,
}: {
  msg: Message & { id?: string; session_id?: string };
  onFeedback?: (id: string, rating: number) => void;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<number | null>(null);
  const isUser = msg.role === 'user';

  const copy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 18,
      gap: 10,
      alignItems: 'flex-start',
    }}>
      {!isUser && (
        <div className="brand-icon animate-scale-bounce" style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
      )}

      <div style={{ maxWidth: '76%', minWidth: 60 }}>
        <div style={{
          padding: isUser ? '11px 16px' : '13px 17px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          background: isUser
            ? 'linear-gradient(135deg, var(--brand) 0%, #6355e8 100%)'
            : 'var(--bg-card)',
          border: isUser ? 'none' : '1px solid var(--border)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          fontSize: 14,
          lineHeight: 1.65,
          boxShadow: isUser ? 'var(--shadow-brand)' : 'var(--shadow-sm)',
        }}>
          {isUser
            ? <span style={{ fontWeight: 450 }}>{msg.content}</span>
            : <MdMessage content={msg.content} />
          }
        </div>

        {/* Risk badge */}
        {!isUser && msg.risk_level && msg.risk_level !== 'low' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            marginTop: 6,
            background: `${riskColors[msg.risk_level]}12`,
            border: `1px solid ${riskColors[msg.risk_level]}35`,
            borderRadius: 99, padding: '3px 10px',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: riskColors[msg.risk_level], display: 'block',
              boxShadow: `0 0 6px ${riskColors[msg.risk_level]}`,
            }} />
            <span style={{
              fontSize: 10.5, fontWeight: 700, color: riskColors[msg.risk_level],
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {msg.risk_level} {t('risk')}
            </span>
          </div>
        )}

        {/* Action row */}
        {!isUser && (
          <div style={{ display: 'flex', gap: 2, marginTop: 6, alignItems: 'center' }}>
            <button
              onClick={copy}
              className="btn-ghost btn-xs"
              style={{
                fontSize: 11.5, color: 'var(--text-muted)',
                padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
                borderRadius: 6,
              }}
            >
              {copied ? t('copied') : t('copy')}
            </button>
            {msg.id && onFeedback && (
              <>
                <button
                  onClick={() => { setFeedbackGiven(1); onFeedback(msg.id!, 1); }}
                  className="btn-ghost btn-xs"
                  style={{
                    color: feedbackGiven === 1 ? 'var(--success)' : 'var(--text-muted)',
                    padding: '4px 7px', borderRadius: 6, fontSize: 13,
                  }}
                >
                  👍
                </button>
                <button
                  onClick={() => { setFeedbackGiven(-1); onFeedback(msg.id!, -1); }}
                  className="btn-ghost btn-xs"
                  style={{
                    color: feedbackGiven === -1 ? 'var(--danger)' : 'var(--text-muted)',
                    padding: '4px 7px', borderRadius: 6, fontSize: 13,
                  }}
                >
                  👎
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: 'var(--bg-hover)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 2, color: 'var(--text-muted)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { t } = useTranslation();

  const [sessionId, setSessionId] = useState<string | null>(searchParams.get('session'));
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<(Message & { id?: string; session_id?: string })[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [thinking, setThinking] = useState('');
  const [hitl, setHitl] = useState<{ required: boolean; reason: string; sessionId: string } | null>(null);
  const [emergency, setEmergency] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [riskLevel, setRiskLevel] = useState('low');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const getToken = useCallback(() => getAccessToken(), []);

  const SUGGESTED_PROMPTS = [
    "I've had a headache for 3 days",
    "Is it safe to take ibuprofen with blood thinners?",
    "What are signs of dehydration?",
    "I've been feeling anxious lately",
  ];

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const data = await fetchSessions(token);
      setSessions(data.sessions || []);
    })();
  }, [getToken]);

  useEffect(() => {
    if (!sessionId) { setMessages([]); return; }
    (async () => {
      setLoadingMsgs(true);
      const token = await getToken();
      if (!token) { setLoadingMsgs(false); return; }
      const data = await getMessages(sessionId, token);
      setMessages(data.messages || []);
      setLoadingMsgs(false);
    })();
  }, [sessionId, getToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleNewChat = async () => {
    const token = await getToken();
    if (!token) return;
    const session = await createSession(token);
    if (session?.id) {
      setSessions(prev => [session, ...prev]);
      setSessionId(session.id);
      setMessages([]);
      router.replace(`/dashboard/chat?session=${session.id}`, { scroll: false });
    }
    setShowSessions(false);
  };

  const handleSelectSession = (id: string) => {
    setSessionId(id);
    router.replace(`/dashboard/chat?session=${id}`, { scroll: false });
    setShowSessions(false);
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const token = await getToken();
    if (!token) return;
    await deleteSession(id, token);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (id === sessionId) {
      setSessionId(null);
      setMessages([]);
      router.replace('/dashboard/chat', { scroll: false });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg = input.trim();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsStreaming(true);
    setStreamingContent('');
    setThinking('');
    setEmergency(false);
    setHitl(null);
    setRiskLevel('low');

    setMessages(prev => [...prev, {
      role: 'user', content: userMsg, created_at: new Date().toISOString(),
    } as any]);

    const token = await getToken();
    if (!token) { setIsStreaming(false); return; }

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const session = await createSession(token);
      if (session?.id) {
        currentSessionId = session.id;
        setSessionId(session.id);
        setSessions(prev => [session, ...prev]);
        router.replace(`/dashboard/chat?session=${session.id}`, { scroll: false });
      }
    }

    let accumulated = '';
    let finalRisk = 'low';
    try {
      for await (const event of streamChat(userMsg, currentSessionId, token, lang)) {
        if (event.type === 'thinking')      setThinking(event.message || 'Thinking...');
        else if (event.type === 'message') {
          setThinking('');
          accumulated += event.content || '';
          setStreamingContent(accumulated);
        }
        else if (event.type === 'emergency')    { setEmergency(true); finalRisk = 'critical'; setRiskLevel('critical'); }
        else if (event.type === 'risk_update')  { finalRisk = event.risk_level || 'low'; setRiskLevel(finalRisk); }
        else if (event.type === 'hitl_required') {
          setHitl({ required: true, reason: event.reason || '', sessionId: event.session_id || currentSessionId || '' });
        }
        else if (event.type === 'done') {
          if (event.session_id && !sessionId) setSessionId(event.session_id);
          if (event.title) setSessions(prev => prev.map(s => s.id === event.session_id ? { ...s, title: event.title } : s));
        }
      }
    } catch (e) { console.error(e); }

    if (accumulated) {
      setMessages(prev => [...prev, {
        role: 'assistant', content: accumulated, risk_level: finalRisk,
        created_at: new Date().toISOString(),
      } as any]);
    }
    setStreamingContent('');
    setThinking('');
    setIsStreaming(false);
  };

  const handleHITL = async (approved: boolean) => {
    if (!hitl) return;
    const token = await getToken();
    if (!token) return;
    await approveHITL(hitl.sessionId, approved, token);
    setHitl(null);
  };

  const handleFeedback = async (msgId: string, rating: number) => {
    const token = await getToken();
    if (!token || !sessionId) return;
    await submitFeedback({ message_id: msgId, session_id: sessionId, rating }, token);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const currentSession = sessions.find(s => s.id === sessionId);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Sessions drawer ─────────────────────────────────────────── */}
      {showSessions && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 30 }}
            onClick={() => setShowSessions(false)}
          />
          <div
            className="animate-slide-in-l"
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 292, zIndex: 40,
              background: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {t('chatHistory')}
              </span>
              <button onClick={handleNewChat} className="btn btn-primary btn-sm">
                {t('newChat')}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              {sessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
                  {t('noConversations')}
                </div>
              ) : sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    marginBottom: 3,
                    background: s.id === sessionId ? 'var(--brand-light)' : 'transparent',
                    border: `1.5px solid ${s.id === sessionId ? 'var(--brand)' : 'transparent'}`,
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                  className={s.id !== sessionId ? 'btn-ghost' : ''}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600,
                      color: s.id === sessionId ? 'var(--brand)' : 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      letterSpacing: '-0.01em',
                    }}>
                      {s.title || 'New Conversation'}
                    </div>
                    {s.risk_level && s.risk_level !== 'low' && (
                      <div style={{
                        fontSize: 10, color: riskColors[s.risk_level],
                        marginTop: 2, fontWeight: 700, letterSpacing: '0.04em',
                      }}>
                        ● {s.risk_level.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="btn-ghost btn-icon-sm"
                    style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Main chat area ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(12px)',
        }}>
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            {t('history')}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {currentSession?.title || 'AI Health Chat'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {t('yourHealthAssistant')}
            </div>
          </div>

          <button onClick={handleNewChat} className="btn btn-primary btn-sm" style={{ fontWeight: 600 }}>
            {t('newChat')}
          </button>
        </div>

        {/* Emergency banner */}
        {emergency && (
          <div
            className="emergency-pulse"
            style={{
              background: 'var(--danger)',
              color: '#fff',
              padding: '13px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 22 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{t('emergencyDetected')}</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 1 }}>{t('callEmergency')}</div>
            </div>
            <a
              href="tel:911"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: 10,
                padding: '7px 16px',
                textDecoration: 'none', fontWeight: 800, fontSize: 13.5,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {t('callNow')}
            </a>
          </div>
        )}

        {/* HITL review */}
        {hitl?.required && (
          <div style={{
            margin: '12px 18px',
            padding: '15px 18px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--warning-bg)',
            border: '1.5px solid var(--warning-border)',
            flexShrink: 0,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--warning)', marginBottom: 6 }}>
              {t('reviewRequested')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
              {hitl.reason || t('highRiskConcern')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleHITL(true)} className="btn btn-primary btn-sm">
                {t('continueBtn')}
              </button>
              <button onClick={() => handleHITL(false)} className="btn btn-secondary btn-sm">
                {t('cancelBtn')}
              </button>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>

          {loadingMsgs && (
            <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
              <TypingIndicator />
            </div>
          )}

          {/* Empty state */}
          {!loadingMsgs && messages.length === 0 && !isStreaming && (
            <div style={{ textAlign: 'center', padding: '50px 20px' }} className="animate-fade-in">
              <div
                className="brand-icon animate-float"
                style={{
                  width: 64, height: 64, borderRadius: 20,
                  margin: '0 auto 20px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h2 style={{
                fontSize: 22, fontWeight: 800, color: 'var(--text-primary)',
                marginBottom: 10, letterSpacing: '-0.03em',
              }}>
                {t('howCanIHelp')}
              </h2>
              <p style={{
                fontSize: 14, color: 'var(--text-muted)', maxWidth: 380,
                margin: '0 auto 28px', lineHeight: 1.65,
              }}>
                {t('chatSubtitle')}
              </p>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
                maxWidth: 500, margin: '0 auto',
              }}>
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                    className="btn btn-secondary"
                    style={{
                      fontSize: 13, maxWidth: 240, textAlign: 'left',
                      whiteSpace: 'normal', height: 'auto', padding: '9px 14px',
                      borderRadius: 'var(--radius)',
                      lineHeight: 1.4, fontWeight: 500,
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} onFeedback={handleFeedback} />
          ))}

          {/* Streaming */}
          {isStreaming && streamingContent && (
            <MessageBubble
              msg={{ role: 'assistant', content: streamingContent, created_at: new Date().toISOString() } as any}
            />
          )}

          {/* Thinking */}
          {isStreaming && !streamingContent && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 18 }}>
              <div className="brand-icon" style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, marginTop: 2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <TypingIndicator />
                  {thinking && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{thinking}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: '12px 18px 20px', flexShrink: 0,
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
        }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '8px 8px 8px 16px',
            boxShadow: 'var(--shadow)',
            transition: 'border-color 0.18s, box-shadow 0.18s',
          }}
            onFocusCapture={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--brand)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 4px var(--brand-glow)';
            }}
            onBlurCapture={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow)';
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('askAboutHealth')}
              disabled={isStreaming}
              rows={1}
              style={{
                flex: 1, resize: 'none', border: 'none', outline: 'none',
                background: 'transparent', color: 'var(--text-primary)',
                fontSize: 14.5, lineHeight: 1.55, maxHeight: 160,
                overflowY: 'auto', fontFamily: 'var(--font-sans)',
                paddingTop: 7, paddingBottom: 7, fontWeight: 400,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              style={{
                width: 40, height: 40, borderRadius: 14, flexShrink: 0,
                background: input.trim() && !isStreaming
                  ? 'linear-gradient(135deg, var(--brand) 0%, #6355e8 100%)'
                  : 'var(--bg-hover)',
                border: 'none',
                cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s ease',
                color: input.trim() && !isStreaming ? '#fff' : 'var(--text-muted)',
                boxShadow: input.trim() && !isStreaming ? 'var(--shadow-brand)' : 'none',
                transform: input.trim() && !isStreaming ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              {isStreaming ? (
                <div style={{
                  width: 14, height: 14, border: '2px solid currentColor',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
          <div style={{
            textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
            marginTop: 8, letterSpacing: '0.01em',
          }}>
            {t('chatDisclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}

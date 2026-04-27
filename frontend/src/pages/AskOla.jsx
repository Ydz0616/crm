import { useState, useRef, useEffect, useCallback } from 'react';
import { notification } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import request from '@/request/request';
import { useAppContext } from '@/context/appContext';
import MessageBubble from '@/components/AskOla/MessageBubble';
import ChatInput from '@/components/AskOla/ChatInput';
import ThinkingPanel from '@/components/AskOla/ThinkingPanel';
import TextBlock from '@/components/AskOla/blocks/TextBlock';
import { consumeSSEStream } from '@/components/AskOla/consumeSSEStream';

export default function AskOla() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  // Live streaming UI state — replaces hardcoded "Ola is thinking..." placeholder.
  // liveLabel: current friendly thinking-step label, or null when text is streaming
  //            or the panel should not render. Cleared on stream end.
  // streamingText: assistant reply accumulated token-by-token while the SSE stream
  //                is in flight; replaced by the final blocks-based MessageBubble
  //                when the `done` frame arrives.
  const [liveLabel, setLiveLabel] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef(null);
  const { state: stateApp, appContextAction } = useAppContext();
  const { activeSessionId } = stateApp;
  const { chatSession } = appContextAction;

  // Auto-scroll to bottom on new messages or while streaming chunks arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveLabel, streamingText]);

  // Load messages when activeSessionId changes
  const loadMessages = useCallback(async (sessionId) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    const response = await request.get({ entity: `ola/session/messages/${sessionId}` });
    if (response.success) {
      const loaded = response.result.map((msg) => ({
        id: msg._id,
        role: msg.role,
        timestamp: msg.created,
        blocks: msg.blocks || [{ type: 'text', content: msg.content }],
      }));
      setMessages(loaded);
    }
  }, []);

  useEffect(() => {
    loadMessages(activeSessionId);
  }, [activeSessionId, loadMessages]);

  // Refresh session list — no deps on chatSession to avoid infinite re-render
  const refreshSessionList = async () => {
    const response = await request.get({ entity: 'ola/session/list' });
    if (response.success) {
      chatSession.setList(response.result);
    }
  };

  const handleNewChat = () => {
    chatSession.setActive(null);
    setMessages([]);
  };

  const handleSend = async (messageContent) => {
    const text = messageContent.text;

    const userMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      timestamp: new Date().toISOString(),
      blocks: [{ type: 'text', content: text }],
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setLiveLabel('Ola is thinking...');  // STAGE_LABELS.__init__ (kept in sync with backend)
    setStreamingText('');

    try {
      const body = { message: text };
      if (activeSessionId) body.sessionId = activeSessionId;

      // EventSource doesn't support POST bodies, so we use fetch + manual SSE
      // parsing. Same approach the OpenAI / Anthropic / Google JS SDKs use.
      const resp = await fetch('/api/ola/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        // Non-SSE failure (validation 400, auth 401, session-not-found 404).
        // Backend returned a JSON error envelope.
        let errMsg = `HTTP ${resp.status}`;
        try {
          const j = await resp.json();
          if (j && j.message) errMsg = j.message;
        } catch { /* keep default */ }
        notification.error({ message: 'Ola 响应失败', description: errMsg });
        return;
      }

      let finalSessionId = null;
      let finalBlocks = null;
      let errored = false;

      await consumeSSEStream(resp, {
        thinking_step: (data) => {
          if (data && data.label) setLiveLabel(data.label);
        },
        text_token: (data) => {
          if (!data || typeof data.delta !== 'string') return;
          // Once text starts streaming, hide the live thinking panel — the
          // streaming text bubble takes over visually.
          setLiveLabel(null);
          setStreamingText((prev) => prev + data.delta);
        },
        done: (data) => {
          if (!data) return;
          finalSessionId = data.sessionId || null;
          finalBlocks = Array.isArray(data.blocks) ? data.blocks : null;
        },
        error: (data) => {
          errored = true;
          notification.error({
            message: 'Ola 响应失败',
            description: (data && data.message) || '未知错误',
          });
        },
      });

      // Commit final assistant message from `done` payload (which has
      // thinking_trace + text + widget blocks already assembled by the backend).
      if (!errored && finalBlocks) {
        const assistantMessage = {
          id: `msg_assistant_${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          blocks: finalBlocks,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (!activeSessionId && finalSessionId) {
          chatSession.setActive(finalSessionId);
        }
        refreshSessionList();
      }
    } catch (err) {
      notification.error({
        message: '无法连接 Ola',
        description: err.message || '请确认后端服务和 NanoBot 是否正常运行',
      });
    } finally {
      setLoading(false);
      setLiveLabel(null);
      setStreamingText('');
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className={`askola-chat-page ${isEmpty ? 'askola-chat-page--empty' : 'askola-chat-page--active'}`}>
      {isEmpty ? (
        <div className="askola-chat-welcome">
          <div className="askola-chat-center">
            <h1 className="askola-chat-greeting">What can I do for you?</h1>
          </div>
          <div className="askola-chat-input-wrapper">
            <ChatInput onSend={handleSend} disabled={loading} />
          </div>
        </div>
      ) : (
        <>
          <div className="askola-chat-messages">
            <div className="askola-chat-messages-inner">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {loading && (liveLabel || streamingText) && (
                <div className="askola-message askola-message--assistant">
                  <div className="askola-message-blocks">
                    {liveLabel && (
                      <ThinkingPanel mode="live" currentLabel={liveLabel} />
                    )}
                    {streamingText && <TextBlock content={streamingText} />}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="askola-chat-input-wrapper">
            <ChatInput onSend={handleSend} disabled={loading} />
          </div>
        </>
      )}

      {/* New Chat button — always visible */}
      <button className="askola-new-chat-btn" onClick={handleNewChat} title="New Chat">
        <PlusOutlined />
      </button>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { notification } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import request from '@/request/request';
import { useAppContext } from '@/context/appContext';
import MessageBubble from '@/components/AskOla/MessageBubble';
import ChatInput from '@/components/AskOla/ChatInput';

export default function AskOla() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const { state: stateApp, appContextAction } = useAppContext();
  const { activeSessionId } = stateApp;
  const { chatSession } = appContextAction;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    try {
      const jsonData = { message: text };
      if (activeSessionId) {
        jsonData.sessionId = activeSessionId;
      }

      const response = await request.post({
        entity: 'ola/chat',
        jsonData,
      });

      if (response.success) {
        // If this was the first message, set the returned sessionId as active
        if (!activeSessionId && response.result.sessionId) {
          chatSession.setActive(response.result.sessionId);
        }

        const assistantMessage = {
          id: `msg_assistant_${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          blocks: [{ type: 'text', content: response.result.content }],
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Refresh session list (new session may have been created)
        refreshSessionList();
      } else {
        notification.error({
          message: 'Ola 响应失败',
          description: response.message || '未知错误',
        });
      }
    } catch (err) {
      notification.error({
        message: '无法连接 Ola',
        description: '请确认后端服务和 NanoBot 是否正常运行',
      });
    } finally {
      setLoading(false);
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
              {loading && (
                <div className="askola-message askola-message--assistant">
                  <div className="askola-message-blocks">
                    <div className="askola-block-text">
                      <p className="askola-typing-indicator">Ola is thinking...</p>
                    </div>
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

import { useState, useRef, useEffect } from 'react';
import { notification } from 'antd';
import request from '@/request/request';
import MessageBubble from '@/components/AskOla/MessageBubble';
import ChatInput from '@/components/AskOla/ChatInput';

export default function AskOla() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageContent) => {
    const text = messageContent.text;

    // 添加用户消息
    const userMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      timestamp: new Date().toISOString(),
      blocks: [{ type: 'text', content: text }],
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await request.post({
        entity: 'ola/chat',
        jsonData: { message: text },
      });

      if (response.success) {
        const assistantMessage = {
          id: `msg_assistant_${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          blocks: [{ type: 'text', content: response.result.content }],
        };
        setMessages((prev) => [...prev, assistantMessage]);
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
          {/* Scrollable message area */}
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

          {/* Sticky input at bottom */}
          <div className="askola-chat-input-wrapper">
            <ChatInput onSend={handleSend} disabled={loading} />
          </div>
        </>
      )}
    </div>
  );
}

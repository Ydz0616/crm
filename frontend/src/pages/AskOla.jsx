import { useState, useRef, useEffect } from 'react';
import MOCK_MESSAGES from '@/mock/askOlaMockData';
import MessageBubble from '@/components/AskOla/MessageBubble';
import ChatInput from '@/components/AskOla/ChatInput';

export default function AskOla() {
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (messageContent) => {
    const newMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      timestamp: new Date().toISOString(),
      blocks: [{ type: 'text', content: messageContent.text }],
    };
    setMessages((prev) => [...prev, newMessage]);
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
            <ChatInput onSend={handleSend} />
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
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Sticky input at bottom */}
          <div className="askola-chat-input-wrapper">
            <ChatInput onSend={handleSend} />
          </div>
        </>
      )}
    </div>
  );
}

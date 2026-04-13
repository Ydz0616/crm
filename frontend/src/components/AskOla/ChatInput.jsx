import { useState, useRef, useEffect } from 'react';
import { Input } from 'antd';
import {
  PlusOutlined,
  AudioOutlined,
  ArrowUpOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';

const PLUS_MENU_ITEMS = [
  { icon: <PaperClipOutlined />, label: 'Upload photos & files' },
];

/**
 * Independent chat input component.
 * @param {function} onSend - Callback: onSend({ text: string, mentions: [], attachments: [] })
 */
export default function ChatInput({ onSend }) {
  const [inputValue, setInputValue] = useState('');
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        plusMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setPlusMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [plusMenuOpen]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    onSend({ text, mentions: [], attachments: [] });
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="askola-chat-input-bar">
      <Input.TextArea
        className="askola-chat-input"
        placeholder="Ask anything"
        autoSize={{ minRows: 1, maxRows: 5 }}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="askola-chat-input-footer">
        <div className="askola-plus-container">
          <button
            ref={btnRef}
            className="askola-chat-plus-btn"
            onClick={() => setPlusMenuOpen(!plusMenuOpen)}
          >
            <PlusOutlined />
          </button>
          {plusMenuOpen && (
            <div ref={menuRef} className="askola-plus-menu">
              {PLUS_MENU_ITEMS.map((item, i) => (
                <button key={i} className="askola-plus-menu-item">
                  <span className="askola-plus-menu-icon">{item.icon}</span>
                  <span className="askola-plus-menu-label">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="askola-chat-footer-right">
          <button className="askola-chat-mic-btn">
            <AudioOutlined />
          </button>
          <button className="askola-chat-send-btn" onClick={handleSend}>
            <ArrowUpOutlined />
          </button>
        </div>
      </div>
    </div>
  );
}

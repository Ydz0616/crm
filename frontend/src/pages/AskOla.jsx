import { useState, useRef, useEffect } from 'react';
import {
  PlusOutlined,
  AudioOutlined,
  SoundOutlined,
  PaperClipOutlined,
  PictureOutlined,
  BulbOutlined,
  ExperimentOutlined,
  ShoppingCartOutlined,
  EllipsisOutlined,
  RightOutlined,
} from '@ant-design/icons';

const PLUS_MENU_ITEMS = [
  { icon: <PaperClipOutlined />, label: 'Upload photos & files' },
  { icon: <PictureOutlined />, label: 'Create image' },
  { icon: <BulbOutlined />, label: 'Thinking' },
  { icon: <ExperimentOutlined />, label: 'Deep research' },
  { icon: <ShoppingCartOutlined />, label: 'Shopping research' },
  { icon: <EllipsisOutlined />, label: 'More', hasArrow: true },
];

export default function AskOla() {
  const [inputValue, setInputValue] = useState('');
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // Close on outside click
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

  return (
    <div
      style={{
        margin: '40px auto 30px',
        padding: '0 40px',
        maxWidth: 1200,
        width: '100%',
      }}
    >
      <div className="askola-chat-page">
      {/* Center greeting */}
      <div className="askola-chat-center">
        <h1 className="askola-chat-greeting">What's on the agenda today?</h1>
      </div>

      {/* Input bar */}
      <div className="askola-chat-input-wrapper">
        <div className="askola-chat-input-bar">
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
                    {item.hasArrow && (
                      <RightOutlined className="askola-plus-menu-arrow" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            className="askola-chat-input"
            type="text"
            placeholder="Ask anything"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button className="askola-chat-mic-btn">
            <AudioOutlined />
          </button>
          <button className="askola-chat-send-btn">
            <SoundOutlined />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

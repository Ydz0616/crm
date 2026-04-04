import { useState, useRef, useEffect } from 'react';
import { Input } from 'antd';
import {
  PlusOutlined,
  AudioOutlined,
  ArrowUpOutlined,
  PaperClipOutlined,
  ApiOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const PLUS_MENU_ITEMS = [
  { icon: <PaperClipOutlined />, label: 'Upload photos & files' },
];

export default function AskOla() {
  const [inputValue, setInputValue] = useState('');
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
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
        <h1 className="askola-chat-greeting">What can I do for you?</h1>
      </div>

      {/* Input bar */}
      <div className="askola-chat-input-wrapper">
        <div className="askola-chat-input-bar">
          <Input.TextArea
            className="askola-chat-input"
            placeholder="Ask anything"
            autoSize={{ minRows: 1, maxRows: 10 }}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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
              <button className="askola-chat-send-btn">
                <ArrowUpOutlined />
              </button>
            </div>
          </div>

          {showBanner && (
            <div className="askola-chat-banner">
              <div className="askola-banner-left">
                <ApiOutlined />
                <span>Connect your tools to Ola</span>
              </div>
              <button className="askola-banner-close" onClick={() => setShowBanner(false)}>
                <CloseOutlined />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

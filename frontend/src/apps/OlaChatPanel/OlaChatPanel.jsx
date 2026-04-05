import { useState } from 'react';
import { Input } from 'antd';
import { CloseOutlined, ArrowUpOutlined, HistoryOutlined, EllipsisOutlined } from '@ant-design/icons';
import { useAppContext } from '@/context/appContext';

const DEFAULT_CHAT_TITLE = 'Untitled chat';

export default function OlaChatPanel() {
  const [inputValue, setInputValue] = useState('');
  const [chatTitle, setChatTitle] = useState(DEFAULT_CHAT_TITLE);
  const { appContextAction } = useAppContext();
  const { olaPanel } = appContextAction;

  return (
    <div className="ola-panel">
      {/* Panel Header */}
      <div className="ola-panel-header">
        <span className="ola-panel-title">{chatTitle}</span>
        <div className="ola-panel-header-actions">
          <button className="ola-panel-header-btn" title="History">
            <HistoryOutlined />
          </button>
          <button className="ola-panel-header-btn" title="Ask Ola Setting">
            <EllipsisOutlined rotate={90} />
          </button>
          <button className="ola-panel-close" onClick={() => olaPanel.close()}>
            <CloseOutlined />
          </button>
        </div>
      </div>

      {/* Chat Body */}
      <div className="ola-panel-body">
        {/* Empty – placeholder for future messages */}
      </div>

      {/* Input Bar */}
      <div className="ola-panel-input-wrapper">
        <div className="ola-panel-input-bar">
          <Input.TextArea
            className="ola-panel-input"
            placeholder="Ask anything..."
            autoSize={{ minRows: 1, maxRows: 6 }}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="ola-panel-input-footer">
            <div />
            <button className="ola-panel-send-btn">
              <ArrowUpOutlined />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

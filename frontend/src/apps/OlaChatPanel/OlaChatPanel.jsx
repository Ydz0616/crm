import { useState } from 'react';
import { CloseOutlined, HistoryOutlined, EllipsisOutlined, PlusOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useAppContext } from '@/context/appContext';
import { useNavigate } from 'react-router-dom';
import ChatInput from '@/components/AskOla/ChatInput';

const DEFAULT_CHAT_TITLE = 'Untitled chat';

export default function OlaChatPanel() {
  const [chatTitle, setChatTitle] = useState(DEFAULT_CHAT_TITLE);
  const { appContextAction } = useAppContext();
  const { olaPanel } = appContextAction;
  const navigate = useNavigate();

  return (
    <div className="ola-panel">
      {/* Panel Header */}
      <div className="ola-panel-header">
        <span className="ola-panel-title">{chatTitle}</span>
        <div className="ola-panel-header-actions">
          <button className="ola-panel-header-btn" title="Add Chat">
            <PlusOutlined />
          </button>
          <button className="ola-panel-header-btn" title="History" onClick={() => appContextAction.historyModal.open()}>
            <HistoryOutlined />
          </button>
          <button 
            className="ola-panel-header-btn" 
            onClick={() => navigate('/settings/edit/ask_ola')}
          >
            <Tooltip title="Setting" placement="bottom">
              <EllipsisOutlined rotate={90} />
            </Tooltip>
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
        <ChatInput onSend={(payload) => { /* handle message send later */ }} />
      </div>
    </div>
  );
}

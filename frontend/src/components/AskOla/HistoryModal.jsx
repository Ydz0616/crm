import { useEffect, useCallback } from 'react';
import { Modal } from 'antd';
import { DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import { useAppContext } from '@/context/appContext';
import request from '@/request/request';

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function HistoryModal() {
  const { state: stateApp, appContextAction } = useAppContext();
  const { isHistoryModalOpen, sessionList, activeSessionId } = stateApp;
  const { historyModal, chatSession } = appContextAction;

  const fetchSessions = useCallback(async () => {
    const response = await request.get({ entity: 'ola/session/list' });
    if (response.success) {
      chatSession.setList(response.result);
    }
  }, [chatSession]);

  useEffect(() => {
    if (isHistoryModalOpen) {
      fetchSessions();
    }
  }, [isHistoryModalOpen, fetchSessions]);

  const handleClose = () => {
    historyModal.close();
  };

  const handleSelect = (sessionId) => {
    chatSession.setActive(sessionId);
    historyModal.close();
  };

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    await request.delete({ entity: 'ola/session', id: sessionId });
    // If deleting the active session, clear it
    if (activeSessionId === sessionId) {
      chatSession.setActive(null);
    }
    fetchSessions();
  };

  return (
    <Modal
      open={isHistoryModalOpen}
      onCancel={handleClose}
      footer={null}
      closable={false}
      width={520}
      className="history-modal"
      styles={{ body: { padding: 0 } }}
      centered
    >
      <div className="history-modal-container">
        <div className="history-modal-search">
          <input type="text" placeholder="Select a conversation" className="history-modal-input" />
          <button className="history-modal-close" onClick={handleClose}>
            <CloseOutlined />
          </button>
        </div>

        <div className="history-modal-content">
          <div className="history-items-list">
            {sessionList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8c8c8c' }}>
                No conversations yet
              </div>
            ) : (
              sessionList.map((session) => (
                <div
                  key={session._id}
                  className={`history-item ${session._id === activeSessionId ? 'history-item--current' : ''}`}
                  onClick={() => handleSelect(session._id)}
                >
                  <span className="history-item-title">{session.title}</span>
                  <div className="history-item-actions">
                    <span className="history-item-time">
                      {formatTimeAgo(session.lastMessageAt || session.created)}
                    </span>
                    <button
                      className="history-item-delete"
                      onClick={(e) => handleDelete(e, session._id)}
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

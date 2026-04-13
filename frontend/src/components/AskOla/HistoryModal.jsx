import { Modal } from 'antd';
import { DeleteOutlined, CloseOutlined } from '@ant-design/icons';
import { useAppContext } from '@/context/appContext';

const MOCK_HISTORY_DATA = [
  { id: '1', title: 'Ola Agent Onboarding', timeAgo: '5 mins ago', category: 'Current' },
  { id: '2', title: 'Deploy and Preview Project', timeAgo: '2 wks ago', category: 'Running in crm' },
  { id: '3', title: 'Deploy and Preview Project', timeAgo: '2 wks ago', category: 'Recent in crm' },
  { id: '4', title: 'This version of Antigravity is no longer...', timeAgo: '1 mo ago', category: 'Other Conversations' },
  { id: '5', title: 'Setup Frontend Project', timeAgo: '2 mos ago', category: 'Other Conversations' },
];

export default function HistoryModal() {
  const { state: stateApp, appContextAction } = useAppContext();
  const { isHistoryModalOpen } = stateApp;
  const { historyModal } = appContextAction;

  const handleClose = () => {
    historyModal.close();
  };

  // Group data by category
  const categories = [...new Set(MOCK_HISTORY_DATA.map((item) => item.category))];

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

        {/* Content List */}
        <div className="history-modal-content">
          {categories.map((category) => {
            const items = MOCK_HISTORY_DATA.filter((item) => item.category === category);
            return (
              <div key={category} className="history-category-group">
                <div className="history-category-title">{category}</div>
                <div className="history-items-list">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`history-item ${item.category === 'Current' ? 'history-item--current' : ''}`}
                    >
                      <span className="history-item-title">{item.title}</span>
                      <div className="history-item-actions">
                        <span className="history-item-time">{item.timeAgo}</span>
                        <button className="history-item-delete">
                          <DeleteOutlined />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

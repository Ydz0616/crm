import { useState } from 'react';
import { Select, Modal, Input } from 'antd';
import { InfoCircleOutlined, CameraOutlined, CloseOutlined } from '@ant-design/icons';

export default function SettingsProfile() {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  return (
    <div className="profile-section">
      {/* Title */}
      <h1 className="profile-title">Profile</h1>
      <p className="profile-subtitle">Manage your personal details</p>

      {/* Info banner */}
      <div className="profile-info-banner">
        <InfoCircleOutlined />
        <span>Changes to your profile will apply to all of your workspaces.</span>
      </div>

      {/* Profile Picture */}
      <div className="profile-picture-section">
        <div className="profile-avatar">W</div>
        <div className="profile-picture-info">
          <span className="profile-picture-label">Profile Picture</span>
          <span className="profile-picture-hint">
            We only support PNGs, JPEGs and GIFs under 10MB
          </span>
          <button className="profile-upload-btn">
            <CameraOutlined />
            Upload Image
          </button>
        </div>
      </div>

      {/* Name fields */}
      <div className="profile-form-row">
        <div className="profile-form-group">
          <label className="profile-form-label">First Name</label>
          <input className="profile-form-input" type="text" defaultValue="Will" />
        </div>
        <div className="profile-form-group">
          <label className="profile-form-label">Last Name</label>
          <input className="profile-form-input" type="text" defaultValue="Wang" />
        </div>
      </div>

      {/* Email */}
      <div className="profile-email-row">
        <div className="profile-form-group">
          <label className="profile-form-label">Primary email address</label>
          <input
            className="profile-form-input"
            type="email"
            defaultValue="hi@seekmi.cn"
            readOnly
          />
        </div>
        <button className="profile-edit-btn" onClick={() => setIsEmailModalOpen(true)}>
          Edit
        </button>
      </div>

      {/* Divider */}
      <hr className="profile-divider" />

      {/* Time Preferences */}
      <h2 className="profile-time-title">Time preferences</h2>
      <p className="profile-time-subtitle">Manage your time preferences</p>

      <div className="profile-time-row">
        <div className="profile-time-group">
          <label className="profile-time-label">Preferred Timezone</label>
          <Select
            className="profile-time-select"
            defaultValue="Asia/Shanghai"
            popupClassName="profile-time-dropdown"
            options={[
              { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
              { value: 'America/New_York', label: 'America/New_York' },
              { value: 'Europe/London', label: 'Europe/London' },
              { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
            ]}
          />
        </div>
        <div className="profile-time-group">
          <label className="profile-time-label">Start week on</label>
          <Select
            className="profile-time-select"
            defaultValue="Monday"
            popupClassName="profile-time-dropdown"
            options={[
              { value: 'Monday', label: 'Monday' },
              { value: 'Sunday', label: 'Sunday' },
              { value: 'Saturday', label: 'Saturday' },
            ]}
          />
        </div>
      </div>

      {/* Change Email Modal */}
      <Modal
        open={isEmailModalOpen}
        onCancel={() => setIsEmailModalOpen(false)}
        footer={null}
        closable={false}
        width={520}
        centered
        className="email-change-modal"
      >
        <div className="email-modal-header">
          <span className="email-modal-title">Change email address</span>
          <button
            className="email-modal-close"
            onClick={() => setIsEmailModalOpen(false)}
          >
            <CloseOutlined />
          </button>
        </div>
        <div className="email-modal-divider" />
        <div className="email-modal-body">
          <label className="email-modal-label">New email address</label>
          <Input
            className="email-modal-input"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder=""
          />
        </div>
        <div className="email-modal-divider" />
        <div className="email-modal-footer">
          <button
            className="email-modal-cancel-btn"
            onClick={() => setIsEmailModalOpen(false)}
          >
            Cancel
            <span className="email-modal-esc">ESC</span>
          </button>
          <button className="email-modal-submit-btn">
            Change email address
            <span className="email-modal-enter">↵</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}

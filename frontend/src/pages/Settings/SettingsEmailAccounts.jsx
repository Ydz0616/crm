import { useState } from 'react';
import { Switch } from 'antd';
import {
  GoogleOutlined,
  WindowsOutlined,
  ThunderboltOutlined,
  MoreOutlined,
} from '@ant-design/icons';

export default function SettingsEmailAccounts() {
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);

  return (
    <div className="email-accounts-section">
      <h1 className="email-accounts-title">Email Accounts</h1>
      <p className="email-accounts-subtitle">
        Manage and sync your email accounts to stay organized
      </p>

      <hr className="email-accounts-divider" />

      {/* Connected accounts */}
      <div className="email-accounts-block">
        <h2 className="email-accounts-block-title">Connected accounts</h2>
        <p className="email-accounts-block-desc">
          We take your privacy very seriously. Read our{' '}
          <a href="#" className="email-accounts-link">Privacy Policy ↗</a>
        </p>

        <div className="email-accounts-connect-buttons">
          <button className="email-accounts-connect-btn">
            <GoogleOutlined />
            <span>Connect Google Account</span>
          </button>
          <button className="email-accounts-connect-btn">
            <WindowsOutlined />
            <span>Connect Microsoft Account</span>
          </button>
        </div>
      </div>

      {/* Forwarding address */}
      <div className="email-accounts-block">
        <h2 className="email-accounts-block-title">Forwarding address</h2>
        <p className="email-accounts-block-desc">
          Learn more about forwarding email{' '}
          <a href="#" className="email-accounts-link">↗</a>
        </p>

        <div className="email-accounts-forwarding-item">
          <div className="email-accounts-forwarding-left">
            <div className="email-accounts-forwarding-icon">
              <ThunderboltOutlined />
            </div>
            <div className="email-accounts-forwarding-info">
              <span className="email-accounts-forwarding-email">olaclaw@ola.email</span>
              <span className="email-accounts-forwarding-type">Email</span>
            </div>
          </div>
          <div className="email-accounts-forwarding-right">
            <span className="email-accounts-sync-badge">
              <ThunderboltOutlined />
              In Sync
            </span>
            <button className="email-accounts-more-btn">
              <MoreOutlined />
            </button>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div className="email-accounts-block">
        <h2 className="email-accounts-block-title">Ola watermark</h2>

        <div className="email-accounts-watermark-row">
          <div className="email-accounts-watermark-text">
            <span className="email-accounts-watermark-label">Enable Ola watermark</span>
            <span className="email-accounts-watermark-desc">
              Automatically add "Sent with Ola" to the end of the emails sent from Ola.
            </span>
          </div>
          <Switch
            checked={watermarkEnabled}
            onChange={setWatermarkEnabled}
            size="small"
          />
        </div>
      </div>
    </div>
  );
}

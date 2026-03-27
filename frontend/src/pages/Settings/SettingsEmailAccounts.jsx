import { Switch, message } from 'antd';
import {
  GoogleOutlined,
  WindowsOutlined,
  WhatsAppOutlined,
  ThunderboltOutlined,
  MoreOutlined,
} from '@ant-design/icons';

export default function SettingsEmailAccounts() {
  const handleComingSoon = () => {
    message.info('Coming soon');
  };

  return (
    <div className="email-accounts-section">
      <h1 className="email-accounts-title">Accounts</h1>
      <p className="email-accounts-subtitle">
        Connect and manage your communication accounts
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
          <button className="email-accounts-connect-btn" onClick={handleComingSoon}>
            <WhatsAppOutlined />
            <span>Connect WhatsApp</span>
          </button>
          <button className="email-accounts-connect-btn" onClick={handleComingSoon}>
            <GoogleOutlined />
            <span>Connect Google Account</span>
          </button>
          <button className="email-accounts-connect-btn" onClick={handleComingSoon}>
            <WindowsOutlined />
            <span>Connect Microsoft Account</span>
          </button>
        </div>
      </div>

      {/* === MVP-HIDDEN: Forwarding address — 需要邮件系统实现后恢复 ===
      <div className="email-accounts-block">
        <h2 className="email-accounts-block-title">Forwarding address</h2>
        ...
      </div>
      === END MVP-HIDDEN === */}

      {/* === MVP-HIDDEN: Watermark — 需要邮件系统实现后恢复 ===
      <div className="email-accounts-block">
        <h2 className="email-accounts-block-title">Ola watermark</h2>
        ...
      </div>
      === END MVP-HIDDEN === */}
    </div>
  );
}

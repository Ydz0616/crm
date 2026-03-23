import { Switch } from 'antd';
import {
  UserOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

export default function SettingsAskOlaUsage() {
  return (
    <div className="olausage-section">
      <h1 className="olausage-title">Ask Ola usage</h1>
      <p className="olausage-subtitle">View and configure use for Ask Ola</p>

      {/* Stats cards */}
      <div className="olausage-stats">
        <div className="olausage-stat-card">
          <span className="olausage-stat-label">Credits available per member</span>
          <div className="olausage-stat-value-row">
            <span className="olausage-stat-value">1,000</span>
            <span className="olausage-stat-hint">Resets on Apr 13, 2026</span>
          </div>
        </div>
        <div className="olausage-stat-card">
          <span className="olausage-stat-label">Members using Ask Ola</span>
          <span className="olausage-stat-value">0 <span className="olausage-stat-frac">/ 1</span></span>
        </div>
        <div className="olausage-stat-card">
          <span className="olausage-stat-label">Members reached personal limit</span>
          <span className="olausage-stat-value">0 <span className="olausage-stat-frac">/ 1</span></span>
        </div>
      </div>

      {/* Workspace credits progress */}
      <div className="olausage-progress-block">
        <span className="olausage-progress-label">Workspace credits used for Ask Ola</span>
        <div className="olausage-progress-bar">
          <div className="olausage-progress-fill" style={{ width: '0%' }} />
        </div>
        <span className="olausage-progress-text">0 / 10,000 workspace credits</span>
      </div>

      {/* Set a limit */}
      <div className="olausage-limit-row">
        <span className="olausage-limit-label">
          Set a limit <InfoCircleOutlined style={{ fontSize: 12, color: '#999' }} />
        </span>
        <Switch size="small" />
      </div>

      {/* Member usage table */}
      <div className="olausage-table">
        <div className="olausage-table-header">
          <span className="olausage-col olausage-col--member">
            <UserOutlined /> Member
          </span>
          <span className="olausage-col olausage-col--usage">
            <InfoCircleOutlined /> Usage
          </span>
        </div>
        <div className="olausage-table-row">
          <span className="olausage-col olausage-col--member">
            <span className="olausage-member-avatar" style={{ background: '#4A7BF7' }}>W</span>
            <span className="olausage-member-name">Will Wang</span>
            <span className="olausage-member-you">(You)</span>
            <span className="olausage-member-email">hi@seekmi.cn</span>
          </span>
          <span className="olausage-col olausage-col--usage">0</span>
        </div>
      </div>
    </div>
  );
}

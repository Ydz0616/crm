import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  SettingOutlined,
  CreditCardOutlined,
  DollarOutlined,
  UserOutlined,
  BgColorsOutlined,
  MailOutlined,
  CloudServerOutlined,
  BellOutlined,
  SmileOutlined,
  LeftOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Input } from 'antd';

import useLanguage from '@/locale/useLanguage';

import SettingsProfile from './SettingsProfile';
import SettingsAppearance from './SettingsAppearance';
import SettingsEmailAccounts from './SettingsEmailAccounts';
import SettingsStorageAccounts from './SettingsStorageAccounts';
import SettingsNotifications from './SettingsNotifications';
import SettingsAskOla from './SettingsAskOla';
import SettingsGeneralNew from './SettingsGeneralNew';
import MoneyFormatSettings from './MoneyFormatSettings';
import FinanceSettings from './FinanceSettings';

export default function Settings() {
  const translate = useLanguage();
  const navigate = useNavigate();
  const [activeKey, setActiveKey] = useState('profile');

  // Sidebar menu structure
  const sidebarSections = [
    {
      label: 'Personal',
      items: [
        { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
        { key: 'appearance', icon: <BgColorsOutlined />, label: 'Appearance' },
        { key: 'email_accounts', icon: <MailOutlined />, label: 'Email Accounts' },
        { key: 'storage_accounts', icon: <CloudServerOutlined />, label: 'Storage Accounts' },
        { key: 'notifications_settings', icon: <BellOutlined />, label: 'Notifications' },
        { key: 'ask_ola', icon: <SmileOutlined />, label: 'Ask Ola' },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { key: 'general_settings', icon: <SettingOutlined />, label: 'General' },
        { key: 'currency_settings', icon: <DollarOutlined />, label: translate('Currency Settings') },
        { key: 'finance_settings', icon: <CreditCardOutlined />, label: translate('Finance Settings') },
      ],
    },
  ];

  // Content panel header info
  const panelHeaders = {
    profile: { icon: <UserOutlined />, label: 'Profile' },
    appearance: { icon: <BgColorsOutlined />, label: 'Appearance' },
    email_accounts: { icon: <MailOutlined />, label: 'Email Accounts' },
    storage_accounts: { icon: <CloudServerOutlined />, label: 'Storage Accounts' },
    notifications_settings: { icon: <BellOutlined />, label: 'Notifications' },
    ask_ola: { icon: <SmileOutlined />, label: 'Ask Ola' },
    general_settings: { icon: <SettingOutlined />, label: 'General' },
    currency_settings: { icon: <DollarOutlined />, label: translate('Currency Settings') },
    finance_settings: { icon: <CreditCardOutlined />, label: translate('Finance Settings') },
  };

  // Render content based on activeKey
  const renderContent = () => {
    switch (activeKey) {
      case 'profile':
        return <SettingsProfile />;
      case 'appearance':
        return <SettingsAppearance />;
      case 'email_accounts':
        return <SettingsEmailAccounts />;
      case 'storage_accounts':
        return <SettingsStorageAccounts />;
      case 'notifications_settings':
        return <SettingsNotifications />;
      case 'ask_ola':
        return <SettingsAskOla />;
      case 'general_settings':
        return <SettingsGeneralNew />;
      case 'currency_settings':
        return (
          <div className="settings-existing-panel">
            <MoneyFormatSettings />
          </div>
        );
      case 'finance_settings':
        return (
          <div className="settings-existing-panel">
            <FinanceSettings />
          </div>
        );
      default:
        return <SettingsProfile />;
    }
  };

  const currentPanel = panelHeaders[activeKey] || panelHeaders.profile;

  return (
    <div className="settings-page-wrapper">
      {/* Top bar with back button */}
      <div className="settings-top-bar">
        <button className="settings-back-btn" onClick={() => navigate('/')}>
          <LeftOutlined />
          <span>{translate('Settings')}</span>
        </button>
      </div>

      {/* Body: sidebar + content */}
      <div className="settings-body">
        {/* Sidebar */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-search">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search settings..."
              allowClear
            />
          </div>

          {sidebarSections.map((section) => (
            <div key={section.label} className="settings-sidebar-group">
              <div className="settings-sidebar-group-label">{section.label}</div>
              {section.items.map((item) => (
                <div
                  key={item.key}
                  className={`settings-sidebar-item ${activeKey === item.key ? 'active' : ''}`}
                  onClick={() => setActiveKey(item.key)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Content area */}
        <div className="settings-content">
          <div className="settings-content-header">
            {currentPanel.icon}
            <span>{currentPanel.label}</span>
          </div>
          <div className="settings-content-body">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

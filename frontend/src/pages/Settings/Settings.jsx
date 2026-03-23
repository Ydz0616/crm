import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  SettingOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileImageOutlined,
  TrophyOutlined,
  UserOutlined,
  BgColorsOutlined,
  LeftOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Input } from 'antd';

import useLanguage from '@/locale/useLanguage';

import SettingsProfile from './SettingsProfile';
import SettingsAppearance from './SettingsAppearance';
import GeneralSettings from './GeneralSettings';
import CompanySettings from './CompanySettings';
import CompanyLogoSettings from './CompanyLogoSettings';
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
      ],
    },
    {
      label: 'Workspace',
      items: [
        { key: 'general_settings', icon: <SettingOutlined />, label: translate('General Settings') },
        { key: 'company_settings', icon: <TrophyOutlined />, label: translate('Company Settings') },
        { key: 'company_logo', icon: <FileImageOutlined />, label: translate('Company Logo') },
        { key: 'currency_settings', icon: <DollarOutlined />, label: translate('Currency Settings') },
        { key: 'finance_settings', icon: <CreditCardOutlined />, label: translate('Finance Settings') },
      ],
    },
  ];

  // Content panel header info
  const panelHeaders = {
    profile: { icon: <UserOutlined />, label: 'Profile' },
    appearance: { icon: <BgColorsOutlined />, label: 'Appearance' },
    general_settings: { icon: <SettingOutlined />, label: translate('General Settings') },
    company_settings: { icon: <TrophyOutlined />, label: translate('Company Settings') },
    company_logo: { icon: <FileImageOutlined />, label: translate('Company Logo') },
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
      case 'general_settings':
        return (
          <div className="settings-existing-panel">
            <GeneralSettings />
          </div>
        );
      case 'company_settings':
        return (
          <div className="settings-existing-panel">
            <CompanySettings />
          </div>
        );
      case 'company_logo':
        return (
          <div className="settings-existing-panel">
            <CompanyLogoSettings />
          </div>
        );
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

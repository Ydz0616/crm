import { Layout, Tooltip } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppContext } from '@/context/appContext';

import {
  QuestionCircleOutlined,
  SmileOutlined,
  DashboardOutlined,
  // === MVP-HIDDEN: 以下 icon 对应已隐藏的页面 ===
  // BellOutlined,
  // RobotOutlined,
  // ThunderboltOutlined,
  // ApartmentOutlined,
  // MessageOutlined,
  WalletOutlined,
  // DollarOutlined,
  // SearchOutlined,
  // BarChartOutlined,
  // === END MVP-HIDDEN ===
  FileOutlined,
  CustomerServiceOutlined,
  GiftOutlined,
  BuildOutlined,
  ContainerOutlined,
  FileSyncOutlined,
  CreditCardOutlined,
  SettingOutlined,
  UserOutlined,
  CheckSquareOutlined,
  HistoryOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';

const PAGE_MAP = {
  '/': { icon: <DashboardOutlined />, label: 'Dashboard' },
  '/askola': { icon: <SmileOutlined />, label: 'Ask Ola' },
  // === MVP-HIDDEN: 以下页面已从导航中隐藏 ===
  // '/notifications': { icon: <BellOutlined />, label: 'Notifications' },
  // '/messages': { icon: <MessageOutlined />, label: 'Messages' },
  // '/file': { icon: <FileOutlined />, label: 'File' },
  // '/agents': { icon: <RobotOutlined />, label: 'Agents' },
  // '/sequences': { icon: <ThunderboltOutlined />, label: 'Sequences' },
  // '/workflows': { icon: <ApartmentOutlined />, label: 'Workflows' },
  // === END MVP-HIDDEN ===
  '/customer': { icon: <CustomerServiceOutlined />, label: 'Customers' },
  '/merchandise': { icon: <GiftOutlined />, label: 'Merchandise' },
  '/factory': { icon: <BuildOutlined />, label: 'Factory' },
  '/invoice': { icon: <ContainerOutlined />, label: 'Invoice' },
  '/quote': { icon: <FileSyncOutlined />, label: 'Quote' },
  '/purchaseorder': { icon: <FileOutlined />, label: 'Purchase Orders' },
  '/payment': { icon: <CreditCardOutlined />, label: 'Payment' },
  // === MVP-HIDDEN: 配置页/定制功能，已从导航中隐藏 ===
  '/payment/mode': { icon: <WalletOutlined />, label: 'Payment Mode' },
  // '/currencies': { icon: <DollarOutlined />, label: 'Currencies' },
  // '/pricesearch': { icon: <SearchOutlined />, label: 'Price Search' },
  // '/comparison': { icon: <BarChartOutlined />, label: 'Comparison' },
  // === END MVP-HIDDEN ===
  '/settings': { icon: <SettingOutlined />, label: 'Settings' },
  '/profile': { icon: <UserOutlined />, label: 'Profile' },
};

function getPageInfo(pathname) {
  // Try exact match first
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname];
  // Try matching prefix (for sub-routes like /invoice/create)
  const base = '/' + pathname.split('/').filter(Boolean)[0];
  if (PAGE_MAP[base]) return PAGE_MAP[base];
  return { icon: <CheckSquareOutlined />, label: 'Tasks' };
}

export default function HeaderContent() {
  const { Header } = Layout;
  const location = useLocation();
  const navigate = useNavigate();
  const pageInfo = getPageInfo(location.pathname);
  const { state: stateApp, appContextAction } = useAppContext();
  const { isOlaPanelOpen } = stateApp;
  const { olaPanel } = appContextAction;

  // Auto-close the side panel when navigating to the Ask Ola page
  useEffect(() => {
    if (location.pathname === '/askola' && isOlaPanelOpen) {
      olaPanel.close();
    }
  }, [location.pathname]);

  return (
    <Header
      style={{
        padding: '0 24px',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
        lineHeight: '56px',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div className="header-page-title">
        <span className="header-page-icon">{pageInfo.icon}</span>
        <span className="header-page-label">{pageInfo.label}</span>
      </div>

      <div className="header-right-actions">
        {location.pathname === '/askola' ? (
          <>
            <button className="header-action-btn">
              <QuestionCircleOutlined />
              <span>Help</span>
            </button>
            <button className="header-action-btn header-action-btn--ola" onClick={() => appContextAction.historyModal.open()}>
              <HistoryOutlined />
              <span>History</span>
            </button>
            <button
              className="header-action-btn"
              onClick={() => navigate('/settings/edit/ask_ola')}
              style={{ padding: '0 8px', minWidth: 'auto', border: 'none', background: 'transparent', boxShadow: 'none' }}
            >
              <Tooltip title="Setting" placement="bottom">
                <EllipsisOutlined rotate={90} style={{ fontSize: '18px', color: '#8c8c8c' }} />
              </Tooltip>
            </button>
          </>
        ) : (
          <>
            <button className="header-action-btn">
              <QuestionCircleOutlined />
              <span>Help</span>
            </button>
            {!isOlaPanelOpen && (
              <button className="header-action-btn header-action-btn--ola" onClick={() => olaPanel.open()}>
                <SmileOutlined />
                <span>Ask Ola</span>
              </button>
            )}
          </>
        )}
      </div>
    </Header>
  );
}

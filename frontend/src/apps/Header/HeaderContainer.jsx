import { Layout } from 'antd';
import { useLocation } from 'react-router-dom';

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
  const pageInfo = getPageInfo(location.pathname);

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
        <button className="header-action-btn">
          <QuestionCircleOutlined />
          <span>Help</span>
        </button>
        <button className="header-action-btn header-action-btn--ola">
          <SmileOutlined />
          <span>Ask Ola</span>
        </button>
      </div>
    </Header>
  );
}

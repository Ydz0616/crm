// Note: Yuandong, you will use this page to add navigation

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';

import { useAppContext } from '@/context/appContext';

import useLanguage from '@/locale/useLanguage';
import logo from '@/style/images/aola.png';
import collapsedLogo from '@/style/images/collapsed-logo.svg';

import useResponsive from '@/hooks/useResponsive';

import {
  SettingOutlined,
  BuildOutlined,
  CustomerServiceOutlined,
  ContainerOutlined,
  FileSyncOutlined,
  DashboardOutlined,
  TagOutlined,
  TagsOutlined,
  UserOutlined,
  CreditCardOutlined,
  MenuOutlined,
  FileOutlined,
  ShopOutlined,
  FilterOutlined,
  WalletOutlined,
  ReconciliationOutlined,
  GiftOutlined,
  DollarOutlined,
  BarChartOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Navigation() {
  const { isMobile } = useResponsive();

  return isMobile ? <MobileSidebar /> : <Sidebar collapsible={true} />;
}

function Sidebar({ collapsible, isMobile = false }) {
  let location = useLocation();

  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose } = stateApp;
  const { navMenu } = appContextAction;
  const [showLogoApp, setLogoApp] = useState(isNavMenuClose);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));

  const translate = useLanguage();
  const navigate = useNavigate();

  const items = [
    {
      type: 'group',
      label: '',
      children: [
        {
          key: 'dashboard',
          icon: <DashboardOutlined />,
          label: <Link to={'/'}>{translate('dashboard')}</Link>,
        },
        {
          key: 'customer',
          icon: <CustomerServiceOutlined />,
          label: <Link to={'/customer'}>{translate('customers')}</Link>,
        },
        {
          key: 'Merchandise',
          label: <Link to={'/merchandise'}>{translate('Merchandise')}</Link>,
          icon: <GiftOutlined />,
        },
        {
          key: 'factory',
          icon: <BuildOutlined />,
          label: <Link to={'/factory'}>{translate('factory')}</Link>,
        },
      ],
    },
    {
      type: 'group',
      label: translate('Finance'),
      children: [
        {
          key: 'invoice',
          icon: <ContainerOutlined />,
          label: <Link to={'/invoice'}>{translate('invoices')}</Link>,
        },
        {
          key: 'quote',
          icon: <FileSyncOutlined />,
          label: <Link to={'/quote'}>{translate('quote')}</Link>,
        },
        {
          key: 'purchaseorder',
          icon: <FileOutlined />,
          label: <Link to={'/purchaseorder'}>{translate('purchase_order')}</Link>,
        },
        {
          key: 'payment',
          icon: <CreditCardOutlined />,
          label: <Link to={'/payment'}>{translate('payments')}</Link>,
        },
        {
          key: 'paymentMode',
          label: <Link to={'/payment/mode'}>{translate('payments_mode')}</Link>,
          icon: <WalletOutlined />,
        },
        {
          key: 'currencies',
          label: <Link to={'/currencies'}>{translate('currencies')}</Link>,
          icon: <DollarOutlined />,
        },
      ],
    },
    {
      type: 'group',
      label: translate('Tools'),
      children: [
        {
          key: 'pricesearch',
          icon: <SearchOutlined />,
          label: <Link to={'/pricesearch'}>{translate('price_search')}</Link>,
        },
        {
          key: 'fullcomparison',
          icon: <BarChartOutlined />,
          label: <Link to={'/comparison/full'}>{translate('full_comparison')}</Link>,
        },
      ],
    },
    {
      type: 'group',
      label: '',
      children: [
        {
          key: 'generalSettings',
          label: <Link to={'/settings'}>{translate('settings')}</Link>,
          icon: <SettingOutlined />,
        },
        {
          key: 'about',
          label: <Link to={'/about'}>{translate('about')}</Link>,
          icon: <ReconciliationOutlined />,
        },
      ],
    },
  ];

  useEffect(() => {
    if (location)
      if (currentPath !== location.pathname) {
        if (location.pathname === '/') {
          setCurrentPath('dashboard');
        } else setCurrentPath(location.pathname.slice(1));
      }
  }, [location, currentPath]);

  useEffect(() => {
    if (isNavMenuClose) {
      setLogoApp(isNavMenuClose);
    }
    const timer = setTimeout(() => {
      if (!isNavMenuClose) {
        setLogoApp(isNavMenuClose);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isNavMenuClose]);
  const onCollapse = () => {
    navMenu.collapse();
  };

  return (
    <Sider
      trigger={null}
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : false}
      collapsedWidth={60}
      onCollapse={onCollapse}
      className="navigation"
      width={220}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: isMobile ? 'absolute' : 'relative',
        bottom: 0,
        left: 0,
        top: 0,
      }}
      theme={'light'}
    >
      <div
        className="logo"
        onMouseEnter={() => setIsLogoHovered(true)}
        onMouseLeave={() => setIsLogoHovered(false)}
        onClick={() => {
          if (showLogoApp) {
            onCollapse();
          }
        }}
        style={{
          display: 'flex',
          justifyContent: showLogoApp ? 'center' : 'space-between',
          alignItems: 'center',
          paddingRight: showLogoApp ? '0px' : '16px',
        }}
      >
        <div
          onClick={(e) => {
            if (!showLogoApp) {
              navigate('/');
            }
          }}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {showLogoApp && isLogoHovered ? (
            <MenuUnfoldOutlined style={{ fontSize: '18px', color: '#1a1a1a' }} />
          ) : (
            <img
              src={showLogoApp ? collapsedLogo : logo}
              alt="Logo"
              style={{
                height: '18px',
                objectFit: 'contain',
                ...(showLogoApp && { width: '18px', marginLeft: 0 }),
              }}
            />
          )}
        </div>
        {!showLogoApp && (
          <Button
            type="text"
            icon={<MenuFoldOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onCollapse();
            }}
            style={{ fontSize: '16px', color: '#999' }}
          />
        )}
      </div>
      <Menu
        items={items}
        mode="inline"
        theme={'light'}
        selectedKeys={[currentPath]}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
        }}
      />
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);
  const showDrawer = () => {
    setVisible(true);
  };
  const onClose = () => {
    setVisible(false);
  };

  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={showDrawer}
        className="mobile-sidebar-btn"
        style={{ ['marginLeft']: 25 }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>
      <Drawer
        width={250}
        // style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}
        placement={'left'}
        closable={false}
        onClose={onClose}
        open={visible}
      >
        <Sidebar collapsible={false} isMobile={true} />
      </Drawer>
    </>
  );
}

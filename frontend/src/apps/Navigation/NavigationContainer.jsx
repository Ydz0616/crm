// Note: Yuandong, you will use this page to add navigation

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu, Avatar } from 'antd';

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
  MenuUnfoldOutlined,
  StarOutlined,
  SmileOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
  RightOutlined,
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
  const [isExpandTriggerHovered, setIsExpandTriggerHovered] = useState(false);
  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileWrapperRef = useRef(null);

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
      ],
    },
    {
      type: 'group',
      label: translate('Business'),
      children: [
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
      setIsLogoHovered(false);
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

  // Close profile popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        isProfileMenuOpen &&
        profileWrapperRef.current &&
        !profileWrapperRef.current.contains(e.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

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
        display: 'flex',
        flexDirection: 'column',
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
          style={{ display: 'flex', alignItems: 'center' }}
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
            className="collapse-toggle-btn"
            icon={<MenuFoldOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onCollapse();
            }}
            style={{ fontSize: '16px', color: '#999', cursor: 'pointer' }}
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
          paddingBottom: '80px', // Give space for absolute footer
        }}
      />
      <div className="sidebar-user-profile-wrapper" ref={profileWrapperRef}>
        {/* Profile Popup Menu */}
        {isProfileMenuOpen && !showLogoApp && (
          <div className="profile-popup-menu">
            <div className="profile-popup-header">
              <Avatar size={28} src="https://api.dicebear.com/7.x/miniavs/svg?seed=8" />
              <div className="profile-popup-header-text">
                <span className="profile-popup-name">Will</span>
                <span className="profile-popup-handle">@ziheng.will</span>
              </div>
            </div>
            <div className="profile-popup-divider" />
            <div className="profile-popup-item">
              <StarOutlined className="profile-popup-item-icon" />
              <span>Upgrade plan</span>
            </div>
            <div className="profile-popup-item">
              <SmileOutlined className="profile-popup-item-icon" />
              <span>Personalization</span>
            </div>
            <div
              className="profile-popup-item"
              onClick={() => {
                navigate('/settings');
                setIsProfileMenuOpen(false);
              }}
            >
              <SettingOutlined className="profile-popup-item-icon" />
              <span>{translate('settings')}</span>
            </div>
            <div className="profile-popup-divider" />
            <div className="profile-popup-item profile-popup-item-with-arrow">
              <QuestionCircleOutlined className="profile-popup-item-icon" />
              <span>Help</span>
              <RightOutlined className="profile-popup-item-arrow" />
            </div>
            <div className="profile-popup-item">
              <LogoutOutlined className="profile-popup-item-icon" />
              <span>Log out</span>
            </div>
          </div>
        )}
        <div
          className="sidebar-user-profile"
          onClick={(e) => {
            // Don't toggle if clicking Upgrade button
            if (e.target.closest('.user-profile-upgrade-btn')) return;
            setIsProfileMenuOpen((prev) => !prev);
          }}
        >
          <div className="user-profile-info">
            <Avatar size={28} src="https://api.dicebear.com/7.x/miniavs/svg?seed=8" />
            {!showLogoApp && (
              <div className="user-profile-text">
                <span className="user-profile-name">Will</span>
                <span className="user-profile-plan">Free</span>
              </div>
            )}
          </div>
          {!showLogoApp && (
            <Button
              className="user-profile-upgrade-btn"
              size="small"
              onClick={(e) => e.stopPropagation()}
            >
              Upgrade
            </Button>
          )}
        </div>
      </div>
      {showLogoApp && (
        <div
          className="expand-trigger-zone"
          onClick={onCollapse}
        />
      )}
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

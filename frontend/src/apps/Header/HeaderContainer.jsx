import { Layout, Input } from 'antd';

import { SearchOutlined } from '@ant-design/icons';

import useLanguage from '@/locale/useLanguage';

export default function HeaderContent() {
  const { Header } = Layout;

  const translate = useLanguage();

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
      <div className="header-search" style={{ flex: 1, maxWidth: 400 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder={translate('search') || 'Search...'}
          style={{
            width: '100%',
          }}
        />
      </div>
    </Header>
  );
}


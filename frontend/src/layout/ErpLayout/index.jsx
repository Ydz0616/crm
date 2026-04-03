import { ErpContextProvider } from '@/context/erp';

import { Layout } from 'antd';
import { useSelector } from 'react-redux';

const { Content } = Layout;

export default function ErpLayout({ children }) {
  return (
    <ErpContextProvider>
      <Content
        className="whiteBox"
        style={{
          margin: '0 auto',
          padding: '0 10px',
          width: '100%',
          maxWidth: 'none',
          minHeight: '600px',
          borderRadius: 0,
        }}
      >
        {children}
      </Content>
    </ErpContextProvider>
  );
}

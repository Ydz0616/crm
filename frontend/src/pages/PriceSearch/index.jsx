import React, { useState } from 'react';
import { Layout, Typography, Card } from 'antd';
import useLanguage from '@/locale/useLanguage';
import PriceSearchForm from './PriceSearchForm';
import PriceSearchResults from './PriceSearchResults';
import DefaultLayout from '@/layout/DefaultLayout';

const { Content } = Layout;
const { Title } = Typography;

const PriceSearch = () => {
  const translate = useLanguage();
  const [searchResults, setSearchResults] = useState(null);
  const [searchLogs, setSearchLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearchResults = (results, logs) => {
    setSearchResults(results);
    setSearchLogs(logs);
  };

  return (
    <DefaultLayout>
      <Content style={{ padding: '0 24px', minHeight: 280 }}>
        <Card bordered={false} style={{ marginTop: 24 }}>
          <Title level={3}>{translate('search_price_history')}</Title>
          
          <PriceSearchForm 
            onSearchResults={handleSearchResults}
            setLoading={setLoading}
          />
          
          {searchResults && (
            <PriceSearchResults 
              results={searchResults}
              logs={searchLogs}
              loading={loading}
            />
          )}
        </Card>
      </Content>
    </DefaultLayout>
  );
};

export default PriceSearch; 
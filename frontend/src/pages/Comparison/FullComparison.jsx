import React, { useState } from 'react';
import { Layout, Typography, Card } from 'antd';
import useLanguage from '@/locale/useLanguage';
import FullComparisonForm from '@/modules/ComparisonModule/FullComparisonModule/FullComparisonForm';
import FullComparisonResults from '@/modules/ComparisonModule/FullComparisonModule/FullComparisonResults';
import DefaultLayout from '@/layout/DefaultLayout';

const { Content } = Layout;
const { Title } = Typography;

const FullComparison = () => {
  const translate = useLanguage();
  const [comparisonResults, setComparisonResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleComparisonResults = (results) => {
    setComparisonResults(results);
  };

  return (
    <DefaultLayout>
      <Content style={{ padding: '0 24px', minHeight: 280 }}>
        <Card bordered={false} style={{ marginTop: 24 }}>
          <Title level={3}>{translate('full_comparison')}</Title>
          
          <FullComparisonForm 
            onComparisonResults={handleComparisonResults}
            setLoading={setLoading}
          />
          
          {comparisonResults && (
            <FullComparisonResults 
              results={comparisonResults}
              loading={loading}
            />
          )}
        </Card>
      </Content>
    </DefaultLayout>
  );
};

export default FullComparison; 
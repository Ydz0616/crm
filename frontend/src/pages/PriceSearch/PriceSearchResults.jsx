import React from 'react';
import { Table, Typography, Card, Divider, Empty, Spin } from 'antd';
import useLanguage from '@/locale/useLanguage';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PriceSearchResults = ({ results, logs, loading }) => {
  const translate = useLanguage();
  
  // Check if useCny is enabled from the first result
  const useCny = results && Object.values(results).length > 0 
    ? Object.values(results)[0].useCny 
    : false;
  
  // 将结果对象转换为数组以便表格显示
  const dataSource = results ? 
    Object.keys(results).map(itemName => {
      const item = results[itemName];
      return {
        key: itemName,
        itemName: itemName,
        sellPrice: item.found ? item.latestPrice : null,
        purchasePrice: item.found ? item.purchasePrice : null,
        usdCost: item.found ? item.usdCost : null,
        profitMargin: item.found ? item.profitMargin : null,
        invoiceNumber: item.found ? item.invoiceNumber : null,
        purchaseOrderNumber: item.found ? item.purchaseOrderNumber : null,
        invoiceDate: item.found ? item.invoiceDate : null,
        currency: item.found ? item.currency : null,
        found: item.found
      };
    }) : [];
  
  // Base columns that are always shown
  const baseColumns = [
    {
      title: translate('item_serial_number'),
      dataIndex: 'itemName',
      key: 'itemName',
    },
    {
      title: translate('sell_price'),
      dataIndex: 'sellPrice',
      key: 'sellPrice',
      render: (text, record) => {
        if (record.found && text !== null) {
          return `${text} ${useCny ? 'CNY' : record.currency}`;
        }
        return <Text type="secondary">{translate('no_price_found')}</Text>;
      }
    },
    {
      title: translate('purchase_price'),
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      render: (text, record) => {
        if (record.found && text !== null) {
          return `${text} CNY`;
        }
        return <Text type="secondary">-</Text>;
      }
    }
  ];
  
  // Conditional columns based on useCny flag
  const usdColumns = [
    {
      title: translate('usd_cost'),
      dataIndex: 'usdCost',
      key: 'usdCost',
      render: (text, record) => {
        if (record.found && text !== null) {
          return `${text} USD`;
        }
        return <Text type="secondary">-</Text>;
      }
    }
  ];
  
  // Profit margin column is always shown but calculation differs
  const profitMarginColumn = [
    {
      title: translate('profit_margin'),
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (text, record) => {
        if (record.found && text !== null) {
          // 将小数转换为百分比
          const percentage = (text * 100).toFixed(2);
          
          // 根据毛利率高低设置不同颜色
          let color = 'black';
          if (text >= 0.3) {
            color = 'green';
          } else if (text < 0.15) {
            color = 'red';
          } else if (text < 0) {
            color = 'darkred';
          }
          
          return <Text style={{ color }}>{percentage}%</Text>;
        }
        return <Text type="secondary">-</Text>;
      }
    }
  ];
  
  // Combine columns based on useCny flag
  const columns = useCny 
    ? [...baseColumns, ...profitMarginColumn]
    : [...baseColumns, ...usdColumns, ...profitMarginColumn];
  
  return (
    <Spin spinning={loading}>
      <Divider />
      <Title level={4}>
        {translate('search_results')} 
        {useCny && <Text type="secondary" style={{ fontSize: '14px', marginLeft: '10px' }}>
          ({translate('using_cny_calculation')})
        </Text>}
      </Title>
      
      {dataSource.length > 0 ? (
        <Table 
          dataSource={dataSource} 
          columns={columns} 
          pagination={false}
          style={{ marginBottom: 24 }}
        />
      ) : (
        <Empty description={translate('No results')} />
      )}
      
      {logs && logs.length > 0 && (
        <>
          <Divider />
          <Title level={4}>{translate('search_log')}</Title>
          <Card>
            {logs.map((log, index) => (
              <div key={index} style={{ marginBottom: 8 }}>
                {log}
              </div>
            ))}
          </Card>
        </>
      )}
    </Spin>
  );
};

export default PriceSearchResults; 
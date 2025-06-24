import React from 'react';
import { Table, Typography, Card, Divider, Empty, Spin } from 'antd';
import useLanguage from '@/locale/useLanguage';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PriceSearchResults = ({ results, logs, loading }) => {
  const translate = useLanguage();
  
  // 将结果对象转换为数组以便表格显示
  const dataSource = results ? 
    Object.keys(results).map(itemName => {
      const item = results[itemName];
      return {
        key: itemName,
        itemName: itemName,
        sellPrice: item.found ? item.latestPrice : null,
        purchasePrice: item.found ? item.purchasePrice : null,
        invoiceNumber: item.found ? item.invoiceNumber : null,
        purchaseOrderNumber: item.found ? item.purchaseOrderNumber : null,
        invoiceDate: item.found ? item.invoiceDate : null,
        currency: item.found ? item.currency : null,
        found: item.found
      };
    }) : [];
  
  const columns = [
    {
      title: translate('item_name'),
      dataIndex: 'itemName',
      key: 'itemName',
    },
    {
      title: translate('sell_price'),
      dataIndex: 'sellPrice',
      key: 'sellPrice',
      render: (text, record) => {
        if (record.found && text !== null) {
          return `${text} ${record.currency}`;
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
          return `${text} ${record.currency}`;
        }
        return <Text type="secondary">-</Text>;
      }
    },
    {
      title: translate('invoice_number'),
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: translate('purchase_order'),
      dataIndex: 'purchaseOrderNumber',
      key: 'purchaseOrderNumber',
      render: (text) => text || '-'
    },
    {
      title: translate('invoice_date'),
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD') : '-'
    }
  ];
  
  return (
    <Spin spinning={loading}>
      <Divider />
      <Title level={4}>{translate('search_results')}</Title>
      
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
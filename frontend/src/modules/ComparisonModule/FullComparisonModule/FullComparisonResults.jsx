import React from 'react';
import { Table, Typography, Card, Divider, Empty, Spin, Row, Col, Statistic, Progress, Collapse } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';
import useLanguage from '@/locale/useLanguage';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const FullComparisonResults = ({ results, loading }) => {
  const translate = useLanguage();
  
  if (!results) {
    return <Empty description={translate('No results')} />;
  }
  
  const { items, poSummary, summary, invoice, useCny, logs } = results;
  
  // 确定是否使用人民币计算
  const isUsingCny = useCny;
  
  // 商品明细表格列定义
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
        if (text !== null) {
          return `${text} ${record.currency}`;
        }
        return <Text type="secondary">{translate('no_price_found')}</Text>;
      }
    },
    {
      title: translate('purchase_price'),
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      render: (text) => {
        if (text !== null) {
          return `${text} CNY`;
        }
        return <Text type="secondary">-</Text>;
      }
    },
    {
      title: translate('tax_refund'),
      dataIndex: 'taxRefund',
      key: 'taxRefund',
      render: (text) => {
        if (text !== null) {
          return `${text} CNY`;
        }
        return <Text type="secondary">-</Text>;
      }
    }
  ];
  
  // 根据是否使用人民币计算，添加不同的列
  const usdColumns = [
    {
      title: translate('usd_cost'),
      dataIndex: 'usdCost',
      key: 'usdCost',
      render: (text) => {
        if (text !== null) {
          return `${text} USD`;
        }
        return <Text type="secondary">-</Text>;
      }
    }
  ];
  
  // 毛利率列
  const profitMarginColumn = [
    {
      title: translate('profit_margin'),
      dataIndex: 'profitMargin',
      key: 'profitMargin',
      render: (text) => {
        if (text !== null) {
          // 将小数转换为百分比，只保留两位小数
          const percentage = Number(text * 100).toFixed(2);
          
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
  
  // 组合列
  const columns = isUsingCny 
    ? [...baseColumns, ...profitMarginColumn]
    : [...baseColumns, ...usdColumns, ...profitMarginColumn];
  
  // 获取利润率百分比值，用于进度条
  const profitMarginPercentage = summary.profitMargin * 100;
  
  // 确定进度条颜色
  let progressColor = '#52c41a'; // 默认绿色
  if (profitMarginPercentage < 15) {
    progressColor = '#f5222d'; // 红色
  } else if (profitMarginPercentage < 30) {
    progressColor = '#faad14'; // 黄色
  }
  
  return (
    <Spin spinning={loading}>
      <Divider />
      
      {/* 发票基本信息 */}
      <Card bordered={false} style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic 
              title={translate('invoice_number')} 
              value={invoice.number} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title={translate('invoice_date')} 
              value={dayjs(invoice.date).format('YYYY-MM-DD')} 
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title={translate('invoice_total')} 
              value={`${invoice.total} ${invoice.currency}`} 
            />
          </Col>
        </Row>
      </Card>
      
      {/* 商品明细表格 */}
      <Title level={4}>{translate('item_details')}</Title>
      <Table 
        dataSource={items} 
        columns={columns} 
        rowKey="itemName"
        pagination={false}
        style={{ marginBottom: 24 }}
      />
      
      {/* 采购订单摘要 */}
      <Divider />
      <Title level={4}>{translate('purchase_order_summary')}</Title>
      
      <Collapse
        bordered={false}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        style={{ backgroundColor: '#f7f7f7', marginBottom: 24 }}
      >
        {poSummary.map((po) => (
          <Panel 
            header={`${translate('purchase_order')}: ${po.poNumber} - ${translate('total')}: ${po.totalAmount} CNY - ${translate('tax_refund')}: ${po.totalTaxRefund} CNY`} 
            key={po.poNumber}
          >
            <Table
              dataSource={po.items}
              columns={[
                {
                  title: translate('item_serial_number'),
                  dataIndex: 'itemName',
                  key: 'itemName',
                },
                {
                  title: translate('price'),
                  dataIndex: 'price',
                  key: 'price',
                  render: (text) => `${text} CNY`,
                },
                {
                  title: translate('tax_refund'),
                  dataIndex: 'taxRefund',
                  key: 'taxRefund',
                  render: (text) => `${text} CNY`,
                }
              ]}
              rowKey="itemName"
              pagination={false}
              size="small"
            />
          </Panel>
        ))}
      </Collapse>
      
      {/* 总体摘要 */}
      <Divider />
      <Title level={4}>{translate('overall_summary')}</Title>
      
      <Card bordered={false}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic 
              title={translate('invoice_total_cny')} 
              value={summary.invoiceTotalCny} 
              precision={2}
              suffix="CNY"
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title={translate('purchase_total')} 
              value={summary.purchaseTotal} 
              precision={2}
              suffix="CNY"
            />
          </Col>
          <Col span={8}>
            <Statistic 
              title={translate('tax_refund_total')} 
              value={summary.taxRefundTotal} 
              precision={2}
              suffix="CNY"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
        </Row>
        
        <Divider style={{ margin: '24px 0' }} />
        
        <Row gutter={24}>
          <Col span={12}>
            <Statistic 
              title={translate('profit')} 
              value={summary.profit} 
              precision={2}
              suffix="CNY"
              valueStyle={{ color: summary.profit >= 0 ? '#52c41a' : '#f5222d' }}
            />
          </Col>
          <Col span={12}>
            <Statistic 
              title={translate('profit_margin')} 
              value={profitMarginPercentage} 
              precision={2}
              suffix="%"
              valueStyle={{ color: progressColor }}
            />
            <Progress 
              percent={profitMarginPercentage > 0 ? Math.min(profitMarginPercentage, 100) : 0} 
              status={summary.profitMargin < 0 ? 'exception' : 'normal'}
              strokeColor={progressColor}
              showInfo={false}
            />
          </Col>
        </Row>
      </Card>
      
      {/* 日志信息 */}
      {logs && logs.length > 0 && (
        <>
          <Divider />
          <Title level={4}>{translate('calculation_log')}</Title>
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

export default FullComparisonResults; 
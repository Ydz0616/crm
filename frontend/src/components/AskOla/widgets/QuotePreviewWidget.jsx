import { Table } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const CURRENCY_SYMBOL = { USD: '$', CNY: '¥' };

function formatMoney(amount, currency) {
  const symbol = CURRENCY_SYMBOL[currency] || '';
  if (amount == null || Number.isNaN(Number(amount))) return `${symbol}-`;
  return `${symbol}${Number(amount).toFixed(2)}`;
}

export default function QuotePreviewWidget({ data }) {
  const { quoteNumber, currency, items = [], subTotal, total } = data || {};

  const columns = [
    { title: 'S/N', dataIndex: 'itemName', key: 'itemName', width: 120 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      render: (val, row) => (row.unit ? `${val} ${row.unit}` : val),
    },
    {
      title: '小计',
      dataIndex: 'subTotal',
      key: 'subTotal',
      width: 110,
      render: (val) => formatMoney(val, currency),
    },
  ];

  return (
    <div className="askola-widget-card">
      <div className="askola-widget-header">
        <FileTextOutlined style={{ color: '#1890ff' }} />
        <span>报价单预览</span>
      </div>
      <div className="askola-widget-meta">
        <span>报价单号: <strong>{quoteNumber || '-'}</strong></span>
        <span>币种: <strong>{currency || '-'}</strong></span>
      </div>
      <Table
        dataSource={items}
        columns={columns}
        rowKey={(row, i) => `${row.itemName || ''}-${i}`}
        pagination={false}
        size="small"
      />
      <div className="askola-widget-total">
        合计：<strong>{formatMoney(total != null ? total : subTotal, currency)}</strong>
      </div>
    </div>
  );
}

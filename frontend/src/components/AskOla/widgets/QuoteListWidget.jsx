import { Table, Tag } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';

const CURRENCY_SYMBOL = { USD: '$', CNY: '¥' };

const STATUS_COLOR = {
  draft: 'default',
  pending: 'orange',
  sent: 'blue',
  declined: 'red',
  accepted: 'green',
  expired: 'volcano',
};

function formatMoney(amount, currency) {
  const symbol = CURRENCY_SYMBOL[currency] ?? (currency || '');
  if (amount == null || Number.isNaN(Number(amount))) return `${symbol}-`;
  return `${symbol}${Number(amount).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().slice(0, 10);
}

export default function QuoteListWidget({ data }) {
  const results = Array.isArray(data?.results) ? data.results : [];

  const columns = [
    { title: 'Quote #', dataIndex: 'quoteNumber', key: 'quoteNumber', width: 110 },
    { title: 'Customer', dataIndex: 'client', key: 'client', ellipsis: true },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (val) => formatDate(val),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 110,
      render: (val, row) => formatMoney(val, row.currency),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (val) => <Tag color={STATUS_COLOR[val] || 'default'}>{val || '-'}</Tag>,
    },
  ];

  return (
    <div className="askola-widget-card">
      <div className="askola-widget-header">
        <UnorderedListOutlined style={{ color: '#1890ff' }} />
        <span>Matching Quotes ({results.length})</span>
      </div>
      <Table
        dataSource={results}
        columns={columns}
        rowKey="quoteId"
        pagination={false}
        size="small"
      />
    </div>
  );
}

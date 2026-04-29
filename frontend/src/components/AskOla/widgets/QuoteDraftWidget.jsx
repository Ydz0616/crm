import { Table } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

export default function QuoteDraftWidget({ data }) {
  const { quoteNumber, clientName, items } = data;

  const columns = [
    { title: 'S/N', dataIndex: 'serialNumber', key: 'serialNumber', width: 110 },
    { title: 'Product', dataIndex: 'name', key: 'name' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80, render: (val, row) => `${val} ${row.unit || ''}` },
    { title: 'Unit price', dataIndex: 'price', key: 'price', width: 100, render: (val) => `¥${val.toFixed(2)}` },
    {
      title: 'Subtotal',
      key: 'subtotal',
      width: 110,
      render: (_, row) => `¥${(row.quantity * row.price).toFixed(2)}`,
    },
  ];

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <div className="askola-widget-card">
      <div className="askola-widget-header">
        <FileTextOutlined style={{ color: '#1890ff' }} />
        <span>Quote Draft</span>
      </div>
      <div className="askola-widget-meta">
        <span>Quote #: <strong>{quoteNumber}</strong></span>
        <span>Customer: <strong>{clientName}</strong></span>
      </div>
      <Table
        dataSource={items}
        columns={columns}
        rowKey="serialNumber"
        pagination={false}
        size="small"
      />
      <div className="askola-widget-total">
        Total: <strong>¥{total.toFixed(2)}</strong>
      </div>
    </div>
  );
}

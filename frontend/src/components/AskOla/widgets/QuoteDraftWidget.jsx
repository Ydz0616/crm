import { Table } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

export default function QuoteDraftWidget({ data }) {
  const { quoteNumber, clientName, items } = data;

  const columns = [
    { title: '编号', dataIndex: 'serialNumber', key: 'serialNumber', width: 110 },
    { title: '商品名称', dataIndex: 'name', key: 'name' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80, render: (val, row) => `${val} ${row.unit || ''}` },
    { title: '单价 (¥)', dataIndex: 'price', key: 'price', width: 100, render: (val) => `¥${val.toFixed(2)}` },
    {
      title: '小计 (¥)',
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
        <span>报价单草稿</span>
      </div>
      <div className="askola-widget-meta">
        <span>报价单号: <strong>{quoteNumber}</strong></span>
        <span>客户: <strong>{clientName}</strong></span>
      </div>
      <Table
        dataSource={items}
        columns={columns}
        rowKey="serialNumber"
        pagination={false}
        size="small"
      />
      <div className="askola-widget-total">
        合计：<strong>¥{total.toFixed(2)}</strong>
      </div>
    </div>
  );
}

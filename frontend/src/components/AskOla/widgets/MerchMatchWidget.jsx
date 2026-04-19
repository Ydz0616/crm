import { Table, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

export default function MerchMatchWidget({ data }) {
  const { matched, unmatched } = data;

  const columns = [
    { title: '编号', dataIndex: 'serialNumber', key: 'serialNumber', width: 110 },
    { title: '商品名称', dataIndex: 'name', key: 'name' },
    {
      title: '匹配度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (val) => (
        <Tag color={val >= 95 ? 'green' : val >= 90 ? 'blue' : 'orange'}>{val}%</Tag>
      ),
    },
  ];

  return (
    <div className="askola-widget-card">
      <div className="askola-widget-header">
        <CheckCircleOutlined style={{ color: '#52c41a' }} />
        <span>商品匹配结果</span>
      </div>
      <Table
        dataSource={matched}
        columns={columns}
        rowKey="serialNumber"
        pagination={false}
        size="small"
        style={{ marginBottom: unmatched?.length ? 12 : 0 }}
      />
      {unmatched?.length > 0 && (
        <div className="askola-widget-unmatched">
          <div className="askola-widget-unmatched-header">
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>未匹配商品 ({unmatched.length})</span>
          </div>
          <ul className="askola-widget-unmatched-list">
            {unmatched.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

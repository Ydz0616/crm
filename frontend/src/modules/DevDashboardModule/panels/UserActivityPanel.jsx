import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Segmented, Spin, Statistic, Table, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

import { request } from '@/request';

const WINDOWS = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '1 hour', value: 60 },
];

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function UserActivityPanel() {
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    request
      .get({ entity: `/internal/dashboard/users/active?windowMinutes=${windowMinutes}&limit=20` })
      .then((res) => {
        if (cancelled) return;
        if (res && res.success) setData(res.result);
        else setError(res?.message || 'Failed to load user activity');
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Network error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [windowMinutes]);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Segmented options={WINDOWS} value={windowMinutes} onChange={setWindowMinutes} />
        {data && (
          <span style={{ color: '#888', fontSize: 12 }}>
            Window starts: {data.windowStart}
          </span>
        )}
      </div>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>{data ? <ActivityBody data={data} /> : null}</Spin>
    </div>
  );
}

function ActivityBody({ data }) {
  const sessionColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Last Activity',
      dataIndex: 'lastActivity', key: 'lastActivity',
      render: fmtTime,
      sorter: (a, b) => new Date(a.lastActivity) - new Date(b.lastActivity),
      defaultSortOrder: 'descend',
    },
  ];
  const aiUserColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
  ];

  const sessionTip = `Number of admins (removed:false, enabled:true) whose lastActivity timestamp falls within the window. lastActivity is updated by the trackActivity middleware on any authenticated API call, throttled to ≥60s per admin.`;
  const aiTip = `Distinct admin _ids that appear in the LlmUsage collection within the window. Reflects Ask Ola usage and (eventually) email-channel agent traffic. A user can be in one set but not the other.`;

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title={
                <span>
                  Active sessions{' '}
                  <Tooltip title={sessionTip}>
                    <InfoCircleOutlined style={{ color: '#888' }} />
                  </Tooltip>
                </span>
              }
              value={data.activeSessionsLast || 0}
              suffix={`in last ${data.windowMinutes}m`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title={
                <span>
                  AI active users{' '}
                  <Tooltip title={aiTip}>
                    <InfoCircleOutlined style={{ color: '#888' }} />
                  </Tooltip>
                </span>
              }
              value={data.aiActiveUsersLast || 0}
              suffix={`in last ${data.windowMinutes}m`}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Active sessions (by API call)" size="small" style={{ marginBottom: 16 }}>
        <Table
          dataSource={data.sessions}
          columns={sessionColumns}
          rowKey={(r) => String(r.userId)}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No active sessions in window' }}
        />
      </Card>

      <Card title="AI active users (askola / email)" size="small">
        <Table
          dataSource={data.aiUsers}
          columns={aiUserColumns}
          rowKey={(r) => String(r.userId)}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No AI activity in window' }}
        />
      </Card>
    </>
  );
}

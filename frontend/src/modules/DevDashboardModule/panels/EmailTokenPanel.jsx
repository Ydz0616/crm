import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Segmented, Spin, Statistic, Table, Tag } from 'antd';

import { request } from '@/request';

const RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

const fmtInt = (n) => (n || 0).toLocaleString();
const fmtCost = (n) => `$${(n || 0).toFixed(4)}`;

export default function EmailTokenPanel() {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    request
      .get({ entity: `/internal/dashboard/email-token-usage?range=${range}` })
      .then((res) => {
        if (cancelled) return;
        if (res && res.success) {
          setData(res.result);
        } else {
          setError(res?.message || 'Failed to load email token usage');
        }
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
  }, [range]);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Segmented options={RANGES} value={range} onChange={setRange} />
        {data && (
          <span style={{ color: '#888', fontSize: 12 }}>
            Window: {data.windowStart} → {data.windowEnd}
          </span>
        )}
      </div>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        {data ? (data.empty ? <EmptyHint hint={data.hint} /> : <UsageBody data={data} />) : null}
      </Spin>
    </div>
  );
}

function EmptyHint({ hint }) {
  return (
    <Alert
      type="info"
      showIcon
      message="No email channel data"
      description={hint || 'Email channel not yet instrumented.'}
    />
  );
}

function UsageBody({ data }) {
  const totals = data.totals || {};

  const bySenderColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v) => v || <em style={{ color: '#999' }}>(unknown)</em> },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Requests', dataIndex: 'requests', key: 'requests' },
    {
      title: 'Total Tokens', dataIndex: 'totalTokens', key: 'totalTokens',
      render: fmtInt, sorter: (a, b) => a.totalTokens - b.totalTokens,
      defaultSortOrder: 'descend',
    },
    { title: 'Cost (USD)', dataIndex: 'costUsd', key: 'costUsd', render: fmtCost },
  ];

  const byModelColumns = [
    { title: 'Provider', dataIndex: 'provider', key: 'provider' },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { title: 'Requests', dataIndex: 'count', key: 'count' },
    {
      title: 'Total Tokens', dataIndex: 'totalTokens', key: 'totalTokens',
      render: fmtInt, sorter: (a, b) => a.totalTokens - b.totalTokens,
      defaultSortOrder: 'descend',
    },
    { title: 'Cost (USD)', dataIndex: 'costUsd', key: 'costUsd', render: fmtCost },
  ];

  const byChannelColumns = [
    {
      title: 'Channel', dataIndex: 'channel', key: 'channel',
      render: (c) => <Tag>{c || '(none)'}</Tag>,
    },
    { title: 'Requests', dataIndex: 'count', key: 'count' },
    { title: 'Total Tokens', dataIndex: 'totalTokens', key: 'totalTokens', render: fmtInt },
    { title: 'Cost (USD)', dataIndex: 'costUsd', key: 'costUsd', render: fmtCost },
  ];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title="Email Records" value={totals.records || 0} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title="Input Tokens" value={totals.input || 0} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title="Output Tokens" value={totals.output || 0} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title="Cached Tokens" value={totals.cached || 0} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card><Statistic title="Total Tokens" value={totals.total || 0} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card>
            <Statistic
              title="Cost (USD)"
              value={totals.costUsd || 0}
              precision={4}
              prefix="$"
            />
          </Card>
        </Col>
      </Row>

      {data.erroredCount > 0 && (
        <Alert
          type="warning"
          message={`${data.erroredCount} errored email requests in window`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title="By Email Channel" size="small" style={{ marginBottom: 16 }}>
        <Table
          dataSource={data.byChannel}
          columns={byChannelColumns}
          rowKey={(r) => r.channel || 'unknown'}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No data' }}
        />
      </Card>

      <Card title="By Provider × Model" size="small" style={{ marginBottom: 16 }}>
        <Table
          dataSource={data.byProviderModel}
          columns={byModelColumns}
          rowKey={(r) => `${r.provider}/${r.model}`}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No data' }}
        />
      </Card>

      <Card title="Top Senders (by Total Tokens)" size="small">
        <Table
          dataSource={data.topUsers}
          columns={bySenderColumns}
          rowKey={(r) => String(r.userId)}
          pagination={false}
          size="small"
          locale={{ emptyText: 'No data' }}
        />
      </Card>
    </>
  );
}

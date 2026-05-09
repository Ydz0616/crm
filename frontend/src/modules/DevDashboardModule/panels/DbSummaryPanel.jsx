import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Space, Spin, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { request } from '@/request';

const MONO = {
  fontFamily: 'SFMono-Regular, Consolas, Menlo, monospace',
  fontSize: 12,
};

function fmtTs(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString();
}

export default function DbSummaryPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    request
      .get({ entity: '/internal/dashboard/db-summary' })
      .then((res) => {
        if (cancelled) return;
        if (res && res.success) setData(res.result);
        else setError(res?.message || 'Failed to load DB summary');
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
  }, [tick]);

  const columns = [
    {
      title: 'Collection',
      dataIndex: 'name',
      key: 'name',
      render: (v) => <span style={MONO}>{v}</span>,
      sorter: (a, b) => a.name.localeCompare(b.name),
      width: 280,
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      width: 140,
      render: (v, row) => {
        if (v === null || v === undefined) {
          return <Tag color="red">{row.countError || 'unknown'}</Tag>;
        }
        return (v || 0).toLocaleString();
      },
      sorter: (a, b) => (a.count || 0) - (b.count || 0),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Last Inserted',
      dataIndex: 'lastInsertedAt',
      key: 'lastInsertedAt',
      width: 200,
      render: (ts, row) => {
        if (row.lastInsertedError) {
          return <Tag color="red">{row.lastInsertedError}</Tag>;
        }
        if (!ts) return <span style={{ color: '#bbb' }}>—</span>;
        return <span style={MONO}>{fmtTs(ts)}</span>;
      },
      sorter: (a, b) => {
        const ta = a.lastInsertedAt ? Date.parse(a.lastInsertedAt) : 0;
        const tb = b.lastInsertedAt ? Date.parse(b.lastInsertedAt) : 0;
        return ta - tb;
      },
    },
    {
      title: 'Last _id',
      dataIndex: 'lastInsertedId',
      key: 'lastInsertedId',
      ellipsis: true,
      render: (v) => (v ? <span style={MONO}>{v}</span> : <span style={{ color: '#bbb' }}>—</span>),
    },
    {
      title: 'Last doc removed?',
      dataIndex: 'lastDocRemoved',
      key: 'lastDocRemoved',
      width: 150,
      render: (v) => {
        if (v === undefined) return <span style={{ color: '#bbb' }}>—</span>;
        return v ? <Tag color="orange">soft-deleted</Tag> : <Tag color="green">active</Tag>;
      },
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={refresh} disabled={loading}>
          Refresh
        </Button>
        {data && (
          <span style={{ color: '#888', fontSize: 12 }}>
            {data.collectionCount} collections · generated {fmtTs(data.generatedAt)}
          </span>
        )}
      </Space>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        <Table
          dataSource={data?.collections || []}
          columns={columns}
          rowKey={(r) => r.name}
          pagination={{ pageSize: 50, showSizeChanger: false }}
          size="small"
          locale={{ emptyText: 'No collections' }}
          rowClassName={(r) => (r.countError || r.lastInsertedError ? 'db-row-error' : '')}
        />
      </Spin>
    </div>
  );
}

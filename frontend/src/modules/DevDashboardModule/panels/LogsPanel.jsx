import { useEffect, useMemo, useState, useCallback } from 'react';
import { Alert, Button, Select, Space, Spin, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { request } from '@/request';

const LIMIT_OPTIONS = [50, 100, 200, 500];

const MONO = {
  fontFamily: 'SFMono-Regular, Consolas, Menlo, monospace',
  fontSize: 12,
};

function fmtTs(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

export default function LogsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(100);
  const [codeFilter, setCodeFilter] = useState(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    request
      .get({ entity: `/internal/dashboard/logs?source=mcp&limit=${limit}` })
      .then((res) => {
        if (cancelled) return;
        if (res && res.success) setData(res.result);
        else setError(res?.message || 'Failed to load logs');
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
  }, [limit, tick]);

  const codeOptions = useMemo(() => {
    if (!data || !Array.isArray(data.logs)) return [];
    const set = new Set();
    for (const r of data.logs) if (r.code) set.add(r.code);
    return Array.from(set).map((c) => ({ value: c, label: c }));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data || !Array.isArray(data.logs)) return [];
    if (!codeFilter) return data.logs;
    return data.logs.filter((r) => r.code === codeFilter);
  }, [data, codeFilter]);

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'ts',
      key: 'ts',
      width: 200,
      render: (ts) => <span style={MONO}>{fmtTs(ts)}</span>,
      sorter: (a, b) => new Date(a.ts) - new Date(b.ts),
      defaultSortOrder: 'descend',
    },
    {
      title: 'OK',
      dataIndex: 'ok',
      key: 'ok',
      width: 80,
      render: (ok) => (
        <Tag color={ok ? 'green' : 'red'}>{ok ? 'OK' : 'FAIL'}</Tag>
      ),
      filters: [
        { text: 'OK', value: true },
        { text: 'FAIL', value: false },
      ],
      onFilter: (value, record) => record.ok === value,
    },
    {
      title: 'Tool',
      dataIndex: 'tool',
      key: 'tool',
      width: 220,
      render: (v) => <span style={MONO}>{v}</span>,
    },
    {
      title: 'Latency (ms)',
      dataIndex: 'latency_ms',
      key: 'latency_ms',
      width: 110,
      sorter: (a, b) => (a.latency_ms || 0) - (b.latency_ms || 0),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v) => v || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (v) => (v ? <span style={MONO}>{v}</span> : <span style={{ color: '#bbb' }}>—</span>),
    },
    {
      title: 'Input Hash',
      dataIndex: 'input_hash',
      key: 'input_hash',
      width: 110,
      render: (v) => <span style={MONO}>{v}</span>,
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ReloadOutlined />} onClick={refresh} disabled={loading}>
          Refresh
        </Button>
        <span style={{ color: '#888', fontSize: 12 }}>Limit:</span>
        <Select
          value={limit}
          onChange={setLimit}
          options={LIMIT_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
          style={{ width: 100 }}
        />
        <span style={{ color: '#888', fontSize: 12 }}>Filter by code:</span>
        <Select
          value={codeFilter}
          onChange={setCodeFilter}
          options={codeOptions}
          allowClear
          placeholder="(any)"
          style={{ width: 200 }}
        />
        {data && (
          <span style={{ color: '#888', fontSize: 12 }}>
            Source: <code>{data.source}</code> · Returned: {filtered.length} / {data.logs?.length || 0}
            {data.totalLinesScanned ? ` · scanned ${data.totalLinesScanned}` : ''}
          </span>
        )}
      </Space>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey={(_, i) => `${data?.source || 'mcp'}-${i}`}
          pagination={{ pageSize: 50, showSizeChanger: false }}
          size="small"
          scroll={{ x: 1200 }}
          locale={{ emptyText: 'No log entries' }}
          rowClassName={(r) => (r.ok ? 'log-row-ok' : 'log-row-fail')}
        />
      </Spin>
    </div>
  );
}

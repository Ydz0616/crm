import { useEffect, useState, useCallback } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { request } from '@/request';

const SERVICE_LABELS = {
  mcp: 'MCP Server',
  nanobotServe: 'Nanobot Serve',
  nanobotGateway: 'Nanobot Gateway',
};

export default function McpHealthPanel() {
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
      .get({ entity: '/internal/dashboard/mcp-health' })
      .then((res) => {
        if (cancelled) return;
        if (res && res.success) setData(res.result);
        else setError(res?.message || 'Failed to load MCP health');
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

  const keys = ['mcp', 'nanobotServe', 'nanobotGateway'];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={refresh} disabled={loading}>
          Refresh probe
        </Button>
        <span style={{ color: '#888', fontSize: 12 }}>
          Probes 127.0.0.1:8889 (MCP), :8900 (nanobot serve), :8901 (nanobot gateway).
          Each probe times out at 1 second.
        </span>
      </div>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        {data ? (
          <Row gutter={[16, 16]}>
            {keys.map((k) => (
              <Col xs={24} md={8} key={k}>
                <ServiceCard label={SERVICE_LABELS[k]} svc={data[k]} />
              </Col>
            ))}
          </Row>
        ) : null}
      </Spin>
    </div>
  );
}

function ServiceCard({ label, svc }) {
  if (!svc) return <Card title={label}><span style={{ color: '#888' }}>No data</span></Card>;
  const ok = svc.ok;
  return (
    <Card
      title={
        <span>
          {label}{' '}
          <Tag color={ok ? 'green' : 'red'} style={{ marginLeft: 8 }}>
            {ok ? 'UP' : 'DOWN'}
          </Tag>
        </span>
      }
      size="small"
    >
      <div style={{ marginBottom: 8, color: '#888', fontSize: 12, fontFamily: 'monospace' }}>
        {svc.url}
      </div>
      <Statistic
        title="Latency"
        value={svc.latencyMs ?? 0}
        suffix="ms"
        valueStyle={{ color: ok ? '#3f8600' : '#cf1322' }}
      />
      {!ok && svc.error && (
        <Alert
          type="error"
          message={svc.error}
          style={{ marginTop: 12 }}
          showIcon
        />
      )}
      {ok && svc.body && (
        <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
          {Object.entries(svc.body).map(([k, v]) => (
            <div key={k}>
              <strong>{k}</strong>: {String(v)}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

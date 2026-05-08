import { Tabs, Typography } from 'antd';
import useLanguage from '@/locale/useLanguage';

import LlmUsagePanel from './panels/LlmUsagePanel';
import EmailTokenPanel from './panels/EmailTokenPanel';

const { Title } = Typography;

const PANELS = [
  { key: 'llm-usage', label: 'LLM Usage', component: <LlmUsagePanel /> },
  { key: 'email-token', label: 'Email Token', component: <EmailTokenPanel /> },
  { key: 'user-activity', label: 'User Activity' },
  { key: 'mcp-health', label: 'MCP Health' },
  { key: 'logs', label: 'Logs' },
  { key: 'db-summary', label: 'DB Summary' },
];

export default function DevDashboardModule() {
  const translate = useLanguage();

  const items = PANELS.map(({ key, label, component }) => ({
    key,
    label,
    children: component || (
      <div style={{ padding: '24px 8px', color: '#888' }}>
        {label} — {translate('coming_soon')}
      </div>
    ),
  }));

  return (
    <div>
      <Title level={3} style={{ marginBottom: 4 }}>
        {translate('dev_dashboard')}
      </Title>
      <div style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
        {translate('internal_only')}
      </div>
      <Tabs defaultActiveKey="llm-usage" items={items} />
    </div>
  );
}

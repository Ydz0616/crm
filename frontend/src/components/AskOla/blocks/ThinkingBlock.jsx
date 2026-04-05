import { useState } from 'react';
import { LoadingOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';

export default function ThinkingBlock({ content }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="askola-block-thinking" onClick={() => setExpanded(!expanded)}>
      <div className="askola-thinking-header">
        <LoadingOutlined spin={!expanded} style={{ fontSize: 13, color: '#8c8c8c' }} />
        <span className="askola-thinking-label">
          {expanded ? 'Ola 思考过程' : 'Ola 思考中...'}
        </span>
        <span className="askola-thinking-toggle">
          {expanded ? <UpOutlined /> : <DownOutlined />}
        </span>
      </div>
      {expanded && (
        <pre className="askola-thinking-content">{content}</pre>
      )}
    </div>
  );
}

import { Button } from 'antd';

export default function ActionBlock({ actions }) {
  return (
    <div className="askola-block-action">
      {actions.map((action) => (
        <Button
          key={action.actionId}
          type={action.primary ? 'primary' : 'default'}
          onClick={() => console.log('[AskOla Action]', action.actionId, action.label)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

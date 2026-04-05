import TextBlock from './blocks/TextBlock';
import FileBlock from './blocks/FileBlock';
import ThinkingBlock from './blocks/ThinkingBlock';
import ActionBlock from './blocks/ActionBlock';
import WidgetBlock from './blocks/WidgetBlock';

/**
 * Block component mapping table — extend here for new block types
 */
const BLOCK_MAP = {
  text: (block, i) => <TextBlock key={i} content={block.content} />,
  file: (block, i) => (
    <FileBlock
      key={i}
      filename={block.filename}
      fileType={block.fileType}
      size={block.size}
      url={block.url}
    />
  ),
  thinking: (block, i) => <ThinkingBlock key={i} content={block.content} />,
  action: (block, i) => <ActionBlock key={i} actions={block.actions} />,
  widget: (block, i) => (
    <WidgetBlock key={i} widgetType={block.widgetType} data={block.data} />
  ),
};

export default function MessageBubble({ message }) {
  const { role, blocks } = message;
  const isUser = role === 'user';

  return (
    <div className={`askola-message ${isUser ? 'askola-message--user' : 'askola-message--assistant'}`}>
      <div className="askola-message-blocks">
        {blocks.map((block, i) => {
          const renderer = BLOCK_MAP[block.type];
          if (renderer) return renderer(block, i);
          return (
            <div key={i} className="askola-block-unknown">
              [不支持的内容类型: {block.type}]
            </div>
          );
        })}
      </div>
    </div>
  );
}

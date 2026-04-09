import ReactMarkdown from 'react-markdown';

/**
 * Render a text block. For user messages we render plain pre-wrapped text
 * (no markdown parsing) — user input is typed, not authored, so accidental
 * indentation or special characters should not be reinterpreted as code
 * blocks / lists / emphasis. Markdown rendering is reserved for assistant
 * output, which is intentionally formatted.
 */
export default function TextBlock({ content, plain = false }) {
  if (plain) {
    return (
      <div className="askola-block-text askola-block-text--plain">
        {content}
      </div>
    );
  }
  return (
    <div className="askola-block-text">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

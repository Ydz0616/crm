import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// remark-gfm: linkifies bare URLs (e.g. http://...) so tool-returned URLs
// render as clickable <a> tags instead of plain text. Without it, only
// markdown-formatted [text](url) and <url> autolinks become hyperlinks
// — Gemini's hallucinated markdown URLs were blue, real tool URLs were not.
const REMARK_PLUGINS = [remarkGfm];

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
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS}>{content}</ReactMarkdown>
    </div>
  );
}

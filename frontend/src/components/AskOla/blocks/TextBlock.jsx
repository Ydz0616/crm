import ReactMarkdown from 'react-markdown';

export default function TextBlock({ content }) {
  return (
    <div className="askola-block-text">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

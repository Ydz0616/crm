import {
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FileOutlined,
} from '@ant-design/icons';

const ICON_MAP = {
  pdf: <FilePdfOutlined />,
  image: <FileImageOutlined />,
  excel: <FileExcelOutlined />,
  csv: <FileTextOutlined />,
};

export default function FileBlock({ filename, fileType, size, url }) {
  const icon = ICON_MAP[fileType] || <FileOutlined />;

  return (
    <a href={url} className="askola-block-file" target="_blank" rel="noopener noreferrer">
      <span className="askola-file-icon">{icon}</span>
      <div className="askola-file-info">
        <span className="askola-file-name">{filename}</span>
        <span className="askola-file-size">{size}</span>
      </div>
    </a>
  );
}

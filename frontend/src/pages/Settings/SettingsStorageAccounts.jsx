import {
  CloudOutlined,
  FolderOutlined,
  GoogleOutlined,
  WindowsOutlined,
  DropboxOutlined,
} from '@ant-design/icons';

export default function SettingsStorageAccounts() {
  return (
    <div className="storage-accounts-section">
      <h1 className="storage-accounts-title">Storage Accounts</h1>
      <p className="storage-accounts-subtitle">
        Learn more about storage integrations{' '}
        <a href="#" className="storage-accounts-link">↗</a>
      </p>

      <hr className="storage-accounts-divider" />

      {/* Empty state */}
      <div className="storage-accounts-empty">
        <div className="storage-accounts-empty-icon">
          <FolderOutlined />
        </div>
        <h3 className="storage-accounts-empty-title">No connected accounts</h3>
        <p className="storage-accounts-empty-desc">
          You can connect multiple storage accounts to Ola
        </p>
      </div>

      {/* Connect buttons */}
      <div className="storage-accounts-buttons">
        <button className="storage-accounts-btn">
          <DropboxOutlined />
          <span>Dropbox</span>
        </button>
        <button className="storage-accounts-btn">
          <CloudOutlined />
          <span>Box</span>
        </button>
        <button className="storage-accounts-btn">
          <GoogleOutlined />
          <span>Google Drive</span>
        </button>
        <button className="storage-accounts-btn">
          <WindowsOutlined />
          <span>Microsoft OneDrive</span>
        </button>
      </div>
    </div>
  );
}

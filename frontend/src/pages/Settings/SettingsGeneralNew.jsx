import {
  CameraOutlined,
  DownloadOutlined,
  CopyOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleFilled,
} from '@ant-design/icons';

export default function SettingsGeneral() {
  return (
    <div className="general-settings-section">
      <h1 className="general-settings-title">General</h1>
      <p className="general-settings-subtitle">
        Change the settings for your current workspace
      </p>

      <hr className="general-settings-divider" />

      {/* Workspace logo */}
      <div className="general-logo-block">
        <div className="general-logo-avatar">O</div>
        <div className="general-logo-info">
          <span className="general-logo-label">Workspace logo</span>
          <span className="general-logo-hint">
            We only support PNGs, JPEGs and GIFs under 10MB
          </span>
          <button className="general-logo-upload-btn">
            <CameraOutlined />
            Upload logo
          </button>
        </div>
      </div>

      {/* Name and Slug fields */}
      <div className="general-fields-row">
        <div className="general-field-group">
          <label className="general-field-label">Name</label>
          <input
            className="general-field-input"
            type="text"
            defaultValue="OLACLAW"
          />
        </div>
        <div className="general-field-group">
          <label className="general-field-label">Slug</label>
          <div className="general-slug-wrapper">
            <input
              className="general-field-input"
              type="text"
              defaultValue="olaclaw"
              readOnly
            />
            <button className="general-copy-btn">
              <CopyOutlined />
            </button>
          </div>
        </div>
      </div>

      {/* Company details */}
      <div className="general-company-block">
        <h2 className="general-block-title">Company details</h2>
        <p className="general-block-desc">
          Manage your company information
        </p>

        <div className="general-fields-row">
          <div className="general-field-group">
            <label className="general-field-label">Company Name</label>
            <input
              className="general-field-input"
              type="text"
              defaultValue=""
              placeholder="Enter company name"
            />
          </div>
          <div className="general-field-group">
            <label className="general-field-label">Company Email</label>
            <input
              className="general-field-input"
              type="email"
              defaultValue=""
              placeholder="Enter company email"
            />
          </div>
        </div>

        <div className="general-fields-row">
          <div className="general-field-group">
            <label className="general-field-label">Company Phone</label>
            <input
              className="general-field-input"
              type="text"
              defaultValue=""
              placeholder="Enter phone number"
            />
          </div>
          <div className="general-field-group">
            <label className="general-field-label">Company Website</label>
            <input
              className="general-field-input"
              type="text"
              defaultValue=""
              placeholder="Enter website URL"
            />
          </div>
        </div>

        <div className="general-fields-row">
          <div className="general-field-group">
            <label className="general-field-label">Company Address</label>
            <input
              className="general-field-input"
              type="text"
              defaultValue=""
              placeholder="Enter address"
            />
          </div>
          <div className="general-field-group">
            <label className="general-field-label">State</label>
            <input
              className="general-field-input"
              type="text"
              defaultValue=""
              placeholder="Enter state"
            />
          </div>
        </div>

        <div className="general-fields-row">
          <div className="general-field-group">
            <label className="general-field-label">Country</label>
            <input
              className="general-field-input"
              type="text"
              defaultValue=""
              placeholder="Enter country"
            />
          </div>
          <div className="general-field-group">
            <label className="general-field-label">Tax Number</label>
            <input
              className="general-field-input"
              type="text"
              defaultValue=""
              placeholder="Enter tax number"
            />
          </div>
        </div>

        <div className="general-fields-row">
          <div className="general-field-group">
            <label className="general-field-label">VAT Number</label>
            <input
              className="general-field-input"
              type="text"
              defaultValue=""
              placeholder="Enter VAT number"
            />
          </div>
          <div className="general-field-group">
            <label className="general-field-label">Registration Number</label>
            <input
              className="general-field-input"
              type="text"
              defaultValue=""
              placeholder="Enter registration number"
            />
          </div>
        </div>
      </div>

      {/* === MVP-HIDDEN: Export workspace data — MVP 不需要 ===
      <div className="general-export-block">
        <div className="general-export-header">
          <div>
            <h2 className="general-block-title">Export workspace data</h2>
            <p className="general-block-desc">
              Exports are in CSV format and can be downloaded within 7 days
            </p>
          </div>
          <button className="general-export-btn">
            <DownloadOutlined />
            Start new export
          </button>
        </div>

        <div className="general-export-table">
          <div className="general-export-table-header">
            <span className="general-export-col general-export-col--type">
              <AppstoreOutlined /> Type
            </span>
            <span className="general-export-col general-export-col--date">
              <CalendarOutlined /> Date
            </span>
            <span className="general-export-col general-export-col--status" />
            <span className="general-export-col general-export-col--action" />
          </div>
          <div className="general-export-table-row">
            <span className="general-export-col general-export-col--type">
              CSV Export
            </span>
            <span className="general-export-col general-export-col--date">
              Mar 23, 2026
            </span>
            <span className="general-export-col general-export-col--status">
              Completed <CheckCircleFilled style={{ color: '#52c41a', fontSize: 12 }} />
            </span>
            <span className="general-export-col general-export-col--action">
              <button className="general-download-btn">
                <DownloadOutlined />
              </button>
            </span>
          </div>
        </div>
      </div>
      === END MVP-HIDDEN === */}

      {/* === MVP-HIDDEN: Danger zone — MVP 不需要删除 workspace ===
      <div className="general-danger-block">
        <h2 className="general-block-title">Danger zone</h2>

        <div className="general-danger-row">
          <div className="general-danger-text">
            <span className="general-danger-label">Delete workspace</span>
            <span className="general-danger-desc">
              Once deleted, your workspace cannot be recovered
            </span>
          </div>
          <button className="general-delete-btn">
            <DeleteOutlined />
            Delete workspace
          </button>
        </div>
      </div>
      === END MVP-HIDDEN === */}
    </div>
  );
}

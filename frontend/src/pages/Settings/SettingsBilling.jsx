import {
  EditOutlined,
  PlusOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  RightOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  DesktopOutlined,
} from '@ant-design/icons';

export default function SettingsBilling() {
  return (
    <div className="billing-section">
      <h1 className="billing-title">Billing</h1>
      <p className="billing-subtitle">
        Explore plans and manage your subscription, usage, and billing information
      </p>

      <hr className="billing-divider" />

      {/* Trial banner */}
      <div className="billing-trial-banner">
        <span className="billing-trial-text">
          <DesktopOutlined style={{ marginRight: 8 }} />
          There are 4 days left on your trial
        </span>
        <button className="billing-add-billing-btn">Add billing details</button>
      </div>

      {/* Current plan */}
      <div className="billing-plan-block">
        <h2 className="billing-block-title">Current plan</h2>
        <p className="billing-block-desc">Starts March 27th, 2026</p>

        <div className="billing-plan-card">
          <div className="billing-plan-icon">⬡</div>
          <div className="billing-plan-info">
            <span className="billing-plan-name">Pro</span>
            <span className="billing-plan-price">$86.00/mo per seat, billed monthly</span>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="billing-usage-block">
        <h2 className="billing-block-title">Usage</h2>
        <p className="billing-block-desc">Manage your seats and credits</p>

        <div className="billing-usage-cards">
          <div className="billing-usage-card">
            <div className="billing-usage-card-header">
              <CreditCardOutlined style={{ color: '#4A7BF7', marginRight: 6 }} />
              <span className="billing-usage-card-label">Seats</span>
            </div>
            <div className="billing-usage-count">2 / 2</div>
            <div className="billing-usage-bar">
              <div className="billing-usage-bar-fill billing-usage-bar-fill--warning" style={{ width: '100%' }} />
            </div>
            <button className="billing-usage-link">Manage seats</button>
          </div>

          <div className="billing-usage-card">
            <div className="billing-usage-card-header">
              <DatabaseOutlined style={{ color: '#4A7BF7', marginRight: 6 }} />
              <span className="billing-usage-card-label">Records</span>
            </div>
            <div className="billing-usage-count">10 / 1,000,000</div>
            <div className="billing-usage-bar">
              <div className="billing-usage-bar-fill" style={{ width: '0.001%' }} />
            </div>
            <button className="billing-usage-link">Usage <RightOutlined style={{ fontSize: 10 }} /></button>
          </div>

          <div className="billing-usage-card">
            <div className="billing-usage-card-header">
              <ThunderboltOutlined style={{ color: '#4A7BF7', marginRight: 6 }} />
              <span className="billing-usage-card-label">Credits</span>
              <InfoCircleOutlined style={{ fontSize: 11, color: '#bbb', marginLeft: 4 }} />
            </div>
            <div className="billing-usage-count">0 / 10,000</div>
            <div className="billing-usage-bar">
              <div className="billing-usage-bar-fill" style={{ width: '0%' }} />
            </div>
            <button className="billing-usage-link">Usage <RightOutlined style={{ fontSize: 10 }} /></button>
          </div>
        </div>
      </div>

      {/* Billing details */}
      <div className="billing-details-block">
        <h2 className="billing-block-title">Billing details</h2>
        <p className="billing-block-desc">Manage your payment methods and billing information.</p>

        <div className="billing-details-cards">
          <div className="billing-details-card">
            <div className="billing-details-card-header">
              <div>
                <span className="billing-details-card-title">Address</span>
                <span className="billing-details-card-hint">Update your billing address</span>
              </div>
              <button className="billing-details-edit-btn"><EditOutlined /></button>
            </div>
            <div className="billing-details-rows">
              <div className="billing-details-row">
                <span className="billing-details-key">Email</span>
                <span className="billing-details-val">hi@seekmi.cn</span>
              </div>
              <div className="billing-details-row">
                <span className="billing-details-key">Company name</span>
                <span className="billing-details-val">OLACLAW</span>
              </div>
              <div className="billing-details-row">
                <span className="billing-details-key">Address</span>
                <span className="billing-details-val">China</span>
              </div>
              <div className="billing-details-row">
                <span className="billing-details-key">VAT Number</span>
                <span className="billing-details-val billing-details-val--muted">Not provided</span>
              </div>
            </div>
          </div>

          <div className="billing-details-card">
            <div className="billing-details-card-header">
              <div>
                <span className="billing-details-card-title">Payment</span>
                <span className="billing-details-card-hint">Manage your payment methods</span>
              </div>
              <button className="billing-details-edit-btn"><PlusOutlined /></button>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="billing-history-block">
        <h2 className="billing-block-title">History</h2>
        <p className="billing-block-desc">View and track your past invoices and payment history</p>

        <div className="billing-history-table">
          <div className="billing-history-header">
            <span className="billing-history-col billing-history-col--ref">Reference</span>
            <span className="billing-history-col billing-history-col--total">Total incl. tax</span>
            <span className="billing-history-col billing-history-col--date">Date</span>
            <span className="billing-history-col billing-history-col--status" />
            <span className="billing-history-col billing-history-col--action" />
          </div>
          <div className="billing-history-row">
            <span className="billing-history-col billing-history-col--ref">R1AEULA3-0001</span>
            <span className="billing-history-col billing-history-col--total">$0.00</span>
            <span className="billing-history-col billing-history-col--date">13th Mar 2026</span>
            <span className="billing-history-col billing-history-col--status">
              <span className="billing-paid-badge">Paid</span>
            </span>
            <span className="billing-history-col billing-history-col--action">
              <button className="billing-download-btn"><DownloadOutlined /></button>
            </span>
          </div>
        </div>
      </div>

      {/* Cancel subscription */}
      <button className="billing-cancel-btn">Cancel subscription</button>
    </div>
  );
}

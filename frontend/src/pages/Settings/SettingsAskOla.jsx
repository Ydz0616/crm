import { useState } from 'react';
import { Select, Modal, Input, Checkbox } from 'antd';
import {
  PlusOutlined,
  MailOutlined,
  SunOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  SearchOutlined,
  SmileOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  SendOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  FileTextOutlined,
  StarOutlined,
  TagOutlined,
  LeftOutlined,
  EditOutlined,
} from '@ant-design/icons';

const SAVED_PROMPTS = [
  {
    icon: <MailOutlined />,
    iconBg: '#e6f7ee',
    iconColor: '#52c41a',
    title: 'Follow-up email',
    desc: 'Draft a follow-up email to keep the conversation rolling after a meeting.',
  },
  {
    icon: <SunOutlined />,
    iconBg: '#fff7e6',
    iconColor: '#fa8c16',
    title: 'Daily brief',
    desc: 'Prepare for your day with a daily briefing of your meetings.',
  },
  {
    icon: <CalendarOutlined />,
    iconBg: '#e6f0ff',
    iconColor: '#4A7BF7',
    title: 'Meeting prep',
    desc: 'Get the full context on your next meeting so you can show up prepared.',
  },
];

const BROWSE_CATEGORIES = ['Sales', 'Success', 'Product', 'Marketing'];

const BROWSE_PROMPTS = [
  { icon: <SmileOutlined />, iconBg: '#fff0e6', iconColor: '#e8590c', title: 'Sales coach', desc: 'Get coaching on your sales skills.', author: 'Ola', count: 77 },
  { icon: <SearchOutlined />, iconBg: '#e6f0ff', iconColor: '#4A7BF7', title: 'Run account research', desc: 'Run deep web research on a company to capture key information.', author: 'Ola', count: 74 },
  { icon: <CheckCircleOutlined />, iconBg: '#e6f7ee', iconColor: '#52c41a', title: 'Update deal', desc: 'Automatically update a deal record based on a recorded call.', author: 'Ola', count: 50 },
  { icon: <FileTextOutlined />, iconBg: '#e6f0ff', iconColor: '#4A7BF7', title: 'Deal brief', desc: 'Create a comprehensive deal briefing.', author: 'Ola', count: 41 },
  { icon: <BulbOutlined />, iconBg: '#e6f7ee', iconColor: '#52c41a', title: 'Product feedback', desc: 'Extract product feedback from a call recording.', author: 'Ola', count: 36 },
  { icon: <MessageOutlined />, iconBg: '#f3e6ff', iconColor: '#9b59b6', title: 'Recap call', desc: 'Get a structured recap of a recorded meeting.', author: 'Ola', count: 34 },
  { icon: <RocketOutlined />, iconBg: '#e6f0ff', iconColor: '#4A7BF7', title: 'Suggest next steps', desc: 'Create actionable follow-up tasks from a meeting.', author: 'Ola', count: 29 },
  { icon: <ThunderboltOutlined />, iconBg: '#ffe6e6', iconColor: '#e74c3c', title: 'Objection handling', desc: 'Prepare targeted responses to anticipated objections in your next call.', author: 'Ola', count: 25 },
  { icon: <StarOutlined />, iconBg: '#e6f7ee', iconColor: '#52c41a', title: 'Onboarding prep', desc: 'Create a concise brief to prep for a customer onboarding call.', author: 'Ola', count: 14 },
  { icon: <SendOutlined />, iconBg: '#e6f7ee', iconColor: '#27ae60', title: 'Shipped feature outreach', desc: 'Find customers who requested a specific feature and draft individualize email to th...', author: 'Ola', count: 14 },
  { icon: <FileTextOutlined />, iconBg: '#e6f0ff', iconColor: '#4A7BF7', title: 'QBR Prep', desc: 'Create an account brief for your next quarterly business review call.', author: 'Ola', count: 8 },
  { icon: <TagOutlined />, iconBg: '#fff7e6', iconColor: '#f39c12', title: 'What did I miss?', desc: "Get a real-time summary of what you've missed in an ongoing meeting.", author: 'Ola', count: 6 },
];

export default function SettingsAskOla() {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptContent, setPromptContent] = useState('');

  return (
    <div className="askola-settings-section">
      <h1 className="askola-settings-title">Ask Ola</h1>
      <p className="askola-settings-subtitle">
        Manage your Ask Ola settings and prompts.{' '}
        <a href="#" className="askola-settings-link">Learn more ↗</a>
      </p>

      {/* My Prompts — placed first as most important */}
      <div className="askola-prompts-block">
        <div className="askola-prompts-header">
          <div>
            <h2 className="askola-block-title">My prompts</h2>
            <p className="askola-block-desc">
              View and configure your prompts.{' '}
              <a href="#" className="askola-settings-link">Learn more ↗</a>
            </p>
          </div>
          <div className="askola-prompts-actions">
            <button className="askola-browse-btn" onClick={() => setBrowseOpen(true)}>
              Browse prompts
            </button>
            <button className="askola-create-btn" onClick={() => setCreateOpen(true)}>
              <PlusOutlined />
              Create prompt
            </button>
          </div>
        </div>

        <h3 className="askola-saved-title">Saved prompts</h3>
        <div className="askola-saved-cards">
          {SAVED_PROMPTS.map((p, i) => (
            <div key={i} className="askola-saved-card">
              <div
                className="askola-saved-card-icon"
                style={{ background: p.iconBg, color: p.iconColor }}
              >
                {p.icon}
              </div>
              <h4 className="askola-saved-card-title">{p.title}</h4>
              <p className="askola-saved-card-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="askola-block">
        <h2 className="askola-block-title">Privacy</h2>

        <div className="askola-setting-row">
          <div className="askola-setting-text">
            <span className="askola-setting-label">Web search</span>
            <span className="askola-setting-desc">
              Search queries will be shared with external search providers.
            </span>
          </div>
          <Select
            className="askola-select"
            defaultValue="always_ask"
            options={[
              { value: 'always_share', label: 'Always share' },
              { value: 'dont_share', label: "Don't share" },
              { value: 'always_ask', label: 'Always ask' },
            ]}
          />
        </div>

        <div className="askola-setting-row">
          <div className="askola-setting-text">
            <span className="askola-setting-label">Share downvoted messages</span>
            <span className="askola-setting-desc">
              Share conversations to help our team improve Ola.
            </span>
          </div>
          <Select
            className="askola-select"
            defaultValue="always_ask"
            options={[
              { value: 'always_share', label: 'Always share' },
              { value: 'dont_share', label: "Don't share" },
              { value: 'always_ask', label: 'Always ask' },
            ]}
          />
        </div>
      </div>

      {/* Model */}
      <div className="askola-block">
        <h2 className="askola-block-title">Model</h2>

        <div className="askola-setting-row">
          <div className="askola-setting-text">
            <span className="askola-setting-label">Default model</span>
            <span className="askola-setting-desc">
              This model will be used to generate all responses unless it's overridden.
            </span>
          </div>
          <Select
            className="askola-select"
            defaultValue="auto"
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'sonnet46', label: '✳️ Sonnet 4.6' },
              { value: 'opus46', label: '✳️ Opus 4.6' },
              { value: 'gpt54', label: '🌀 GPT 5.4' },
              { value: 'gemini3flash', label: '✦ Gemini 3 Flash' },
              { value: 'gemini31pro', label: '✦ Gemini 3.1 Pro' },
            ]}
          />
        </div>
      </div>

      {/* Credits */}
      <div className="askola-block">
        <h2 className="askola-block-title">Credits</h2>
        <p className="askola-block-desc">View your usage for the current credit period</p>

        <div className="askola-credits-table">
          <div className="askola-credits-row askola-credits-header-row">
            <span className="askola-credits-label">
              <strong>Credits used</strong>{' '}
              <span className="askola-credits-reset">Resets on 13 Apr 2026</span>
            </span>
            <span className="askola-credits-value">0</span>
          </div>
          <div className="askola-credits-row">
            <span className="askola-credits-label">Personal credits used</span>
            <span className="askola-credits-value">0/1,000</span>
          </div>
          <div className="askola-credits-row">
            <span className="askola-credits-label">
              Workspace credits used{' '}
              <InfoCircleOutlined style={{ fontSize: 12, color: '#999' }} />
            </span>
            <span className="askola-credits-value">0</span>
          </div>
        </div>
      </div>

      {/* Browse Prompts Modal */}
      <Modal
        open={browseOpen}
        onCancel={() => setBrowseOpen(false)}
        footer={null}
        closable={false}
        width={960}
        centered
        className="browse-prompts-modal"
      >
        <div className="bp-modal-header">
          <span className="bp-modal-title">Browse prompts</span>
          <button className="bp-modal-close" onClick={() => setBrowseOpen(false)}>
            <CloseOutlined />
          </button>
        </div>

        <div className="bp-modal-body">
          <div className="bp-top">
            <div>
              <h2 className="bp-title">Browse prompts</h2>
              <p className="bp-subtitle">
                Discover new prompts to help you work better.{' '}
                <a href="#" className="askola-settings-link">Learn more ↗</a>
              </p>
            </div>
            <button className="askola-browse-btn">Start from scratch</button>
          </div>

          <div className="bp-content">
            {/* Left sidebar */}
            <div className="bp-sidebar">
              <Input
                prefix={<SearchOutlined />}
                placeholder="Search"
                className="bp-search"
                allowClear
              />
              <div className="bp-categories">
                {BROWSE_CATEGORIES.map((cat) => (
                  <label key={cat} className="bp-category">
                    <span className="bp-category-icon">
                      {cat === 'Sales' && <SmileOutlined />}
                      {cat === 'Success' && <StarOutlined />}
                      {cat === 'Product' && <BulbOutlined />}
                      {cat === 'Marketing' && <TagOutlined />}
                    </span>
                    <span className="bp-category-label">{cat}</span>
                    <Checkbox />
                  </label>
                ))}
              </div>
            </div>

            {/* Right grid */}
            <div className="bp-grid">
              {BROWSE_PROMPTS.map((p, i) => (
                <div key={i} className="bp-card">
                  <div
                    className="bp-card-icon"
                    style={{ background: p.iconBg, color: p.iconColor }}
                  >
                    {p.icon}
                  </div>
                  <h4 className="bp-card-title">{p.title}</h4>
                  <p className="bp-card-desc">{p.desc}</p>
                  <div className="bp-card-footer">
                    <span className="bp-card-author">
                      <SmileOutlined /> {p.author}
                    </span>
                    <span className="bp-card-count">◇ {p.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Prompt Modal */}
      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        closable={false}
        width={680}
        centered
        className="create-prompt-modal"
      >
        <div className="cp-modal-header">
          <div className="cp-modal-header-left">
            <EditOutlined />
            <span className="cp-modal-title">Create prompt</span>
          </div>
          <button className="cp-modal-close" onClick={() => setCreateOpen(false)}>
            <CloseOutlined />
          </button>
        </div>

        <div className="cp-modal-body">
          <div className="cp-title-row">
            <button className="cp-icon-btn">
              <MessageOutlined />
            </button>
            <input
              className="cp-title-input"
              type="text"
              placeholder="Untitled prompt"
              value={promptTitle}
              onChange={(e) => setPromptTitle(e.target.value)}
            />
          </div>

          <textarea
            className="cp-textarea"
            placeholder="Write your prompt here..."
            value={promptContent}
            onChange={(e) => setPromptContent(e.target.value)}
          />
        </div>

        <div className="cp-modal-footer">
          <div />
          <div className="cp-footer-right">
            <button className="cp-cancel-btn" onClick={() => setCreateOpen(false)}>
              Cancel
              <span className="cp-shortcut">ESC</span>
            </button>
            <button className="cp-submit-btn">
              Create prompt
              <span className="cp-shortcut-light">⌘↵</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

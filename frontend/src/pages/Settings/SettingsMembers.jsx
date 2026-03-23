import { useState } from 'react';
import { Input, Modal } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  UserAddOutlined,
  UserOutlined,
  TeamOutlined,
  MoreOutlined,
  PlusOutlined,
  CloseOutlined,
  CrownOutlined,
} from '@ant-design/icons';

const MEMBERS = [
  {
    avatar: 'Z',
    avatarBg: '#52c41a',
    name: null,
    email: 'ziheng.will@outlook.com',
    role: 'Member',
    roleBadge: false,
    teams: null,
    status: 'Invite pending',
    isYou: false,
  },
  {
    avatar: 'W',
    avatarBg: '#4A7BF7',
    name: 'Will Wang',
    email: 'hi@seekmi.cn',
    role: 'Admin',
    roleBadge: true,
    teams: null,
    status: null,
    isYou: true,
  },
];

export default function SettingsMembers() {
  const [activeTab, setActiveTab] = useState('members');
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  return (
    <div className="members-settings-section">
      <h1 className="members-settings-title">Members and teams</h1>
      <p className="members-settings-subtitle">
        Manage workspace members and teams, set access levels, and invite new users.
      </p>

      {/* Tabs */}
      <div className="members-tabs">
        <button
          className={`members-tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <UserOutlined />
          Members
        </button>
        <button
          className={`members-tab ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          <TeamOutlined />
          Teams
        </button>
      </div>

      {activeTab === 'members' && (
        <>
          {/* Search + Filter + Invite */}
          <div className="members-toolbar">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search name or email"
              className="members-search"
              allowClear
            />
            <button className="members-filter-btn">
              <FilterOutlined />
              Filter
            </button>
            <button className="members-invite-btn">
              <UserAddOutlined />
              Invite team members
            </button>
          </div>

          {/* Members table */}
          <div className="members-table">
            <div className="members-table-header">
              <span className="members-col members-col--user">
                <UserOutlined /> User
              </span>
              <span className="members-col members-col--role">
                <UserOutlined /> Role
              </span>
              <span className="members-col members-col--teams">
                <TeamOutlined /> Teams
              </span>
              <span className="members-col members-col--action" />
            </div>

            {MEMBERS.map((m, i) => (
              <div key={i} className="members-table-row">
                <span className="members-col members-col--user">
                  <span
                    className="members-avatar"
                    style={{ background: m.avatarBg }}
                  >
                    {m.avatar}
                  </span>
                  <span className="members-user-info">
                    {m.name && (
                      <span className="members-user-name">
                        {m.name}
                        {m.isYou && <span className="members-you-badge"> (You)</span>}
                      </span>
                    )}
                    <span className="members-user-email">{m.email}</span>
                  </span>
                </span>
                <span className="members-col members-col--role">
                  {m.roleBadge ? (
                    <span className="members-role-badge">{m.role}</span>
                  ) : (
                    <span className="members-role-text">{m.role}</span>
                  )}
                </span>
                <span className="members-col members-col--teams">
                  {m.status && (
                    <span className="members-invite-badge">{m.status}</span>
                  )}
                </span>
                <span className="members-col members-col--action">
                  <button className="members-more-btn">
                    <MoreOutlined />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'teams' && (
        <div className="teams-empty-state">
          <div className="teams-empty-illustration">
            <svg width="140" height="120" viewBox="0 0 140 120" fill="none">
              {/* Stylized people silhouettes */}
              <circle cx="70" cy="38" r="18" stroke="#d9d9d9" strokeWidth="2" fill="none" />
              <path d="M52 80 C52 64 88 64 88 80" stroke="#d9d9d9" strokeWidth="2" fill="none" />
              <circle cx="40" cy="44" r="14" stroke="#e8e8e8" strokeWidth="2" fill="none" />
              <path d="M26 76 C26 64 54 64 54 76" stroke="#e8e8e8" strokeWidth="2" fill="none" />
              <circle cx="100" cy="44" r="14" stroke="#e8e8e8" strokeWidth="2" fill="none" />
              <path d="M86 76 C86 64 114 64 114 76" stroke="#e8e8e8" strokeWidth="2" fill="none" />
              {/* Small decorative crosses */}
              <line x1="20" y1="20" x2="20" y2="26" stroke="#e8e8e8" strokeWidth="1" />
              <line x1="17" y1="23" x2="23" y2="23" stroke="#e8e8e8" strokeWidth="1" />
              <line x1="120" y1="16" x2="120" y2="22" stroke="#e8e8e8" strokeWidth="1" />
              <line x1="117" y1="19" x2="123" y2="19" stroke="#e8e8e8" strokeWidth="1" />
              <line x1="60" y1="98" x2="60" y2="104" stroke="#e8e8e8" strokeWidth="1" />
              <line x1="57" y1="101" x2="63" y2="101" stroke="#e8e8e8" strokeWidth="1" />
              {/* Dotted arc */}
              <path d="M35 18 Q70 2 105 18" stroke="#e8e8e8" strokeWidth="1" strokeDasharray="3 3" fill="none" />
            </svg>
          </div>
          <h3 className="teams-empty-title">No teams</h3>
          <p className="teams-empty-desc">Keep your workspace organized with teams</p>
          <button className="teams-create-btn" onClick={() => setCreateTeamOpen(true)}>
            <PlusOutlined />
            Create first team
          </button>
        </div>
      )}

      {/* New Team Modal */}
      <Modal
        open={createTeamOpen}
        onCancel={() => setCreateTeamOpen(false)}
        footer={null}
        closable={false}
        width={600}
        centered
        className="new-team-modal"
      >
        <div className="nt-modal-header">
          <span className="nt-modal-title">New team</span>
          <button className="nt-modal-close" onClick={() => setCreateTeamOpen(false)}>
            <CloseOutlined />
          </button>
        </div>

        <div className="nt-modal-body">
          <div className="nt-fields-row">
            <div className="nt-field-group">
              <label className="nt-field-label">Team name</label>
              <div className="nt-name-row">
                <button className="nt-icon-btn">
                  <CrownOutlined />
                </button>
                <input
                  className="nt-field-input"
                  type="text"
                  placeholder="Enter team name"
                />
              </div>
            </div>
            <div className="nt-field-group">
              <label className="nt-field-label">Team description</label>
              <input
                className="nt-field-input"
                type="text"
                placeholder="Enter team description"
              />
            </div>
          </div>
        </div>

        <div className="nt-modal-footer">
          <div />
          <div className="nt-footer-right">
            <button className="nt-cancel-btn" onClick={() => setCreateTeamOpen(false)}>
              Cancel
              <span className="nt-shortcut">ESC</span>
            </button>
            <button className="nt-confirm-btn">
              Confirm
              <span className="nt-shortcut-light">↵</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

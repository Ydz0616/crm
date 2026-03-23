import { useState } from 'react';
import { Switch, Checkbox } from 'antd';
import { BellOutlined, MailOutlined, AppstoreOutlined } from '@ant-design/icons';

const NOTIFICATION_ITEMS = [
  {
    title: 'Mentions',
    desc: 'Notify me when someone cites me with an @mention in notes or comments.',
  },
  {
    title: 'Replies',
    desc: 'Notify me when someone replies to my comments.',
  },
  {
    title: 'Email Grants',
    desc: 'Notify me of email access requested or when my requests are accepted or denied.',
  },
  {
    title: 'Task Assignments',
    desc: 'Notify me when I\'m assigned a task.',
  },
  {
    title: 'Shared Resources',
    desc: 'Notify me when someone shares a resource, such as an email, with me.',
  },
  {
    title: 'Sequence delegated sender invites',
    desc: 'Notify me when someone invites me to be a sequence delegated sender.',
  },
  {
    title: 'Workflow permission requests',
    desc: 'Notify me when someone requests access for a workflow, or when my requests are accepted or denied.',
  },
];

export default function SettingsNotifications() {
  const [dailyDigest, setDailyDigest] = useState(true);
  const [emailStates, setEmailStates] = useState(
    NOTIFICATION_ITEMS.map(() => true)
  );
  const [appStates, setAppStates] = useState(
    NOTIFICATION_ITEMS.map(() => true)
  );

  const toggleEmail = (index) => {
    setEmailStates((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const toggleApp = (index) => {
    setAppStates((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  return (
    <div className="notif-settings-section">
      <h1 className="notif-settings-title">Notifications</h1>
      <p className="notif-settings-subtitle">
        Customize your notification settings to stay informed without being overwhelmed
      </p>

      <hr className="notif-settings-divider" />

      {/* Daily digest */}
      <div className="notif-settings-block">
        <h2 className="notif-settings-block-title">Daily digest</h2>
        <div className="notif-settings-digest-row">
          <div className="notif-settings-digest-text">
            <span className="notif-settings-digest-label">Enable daily digest</span>
            <span className="notif-settings-digest-desc">
              Includes tasks overdue and due today. Sent every morning if any tasks are due or overdue.
            </span>
          </div>
          <Switch checked={dailyDigest} onChange={setDailyDigest} size="small" />
        </div>
      </div>

      {/* Collaboration notifications */}
      <div className="notif-settings-block">
        <h2 className="notif-settings-block-title">Collaboration notifications</h2>

        <div className="notif-settings-table">
          {/* Header */}
          <div className="notif-settings-table-header">
            <div className="notif-settings-table-label">
              <BellOutlined />
              <span>Notify me about</span>
            </div>
            <div className="notif-settings-table-cols">
              <div className="notif-settings-table-col">
                <MailOutlined />
                <span>Email</span>
              </div>
              <div className="notif-settings-table-col">
                <AppstoreOutlined />
                <span>App</span>
              </div>
            </div>
          </div>

          {/* Rows */}
          {NOTIFICATION_ITEMS.map((item, index) => (
            <div key={index} className="notif-settings-table-row">
              <div className="notif-settings-table-row-text">
                <span className="notif-settings-row-title">{item.title}</span>
                <span className="notif-settings-row-desc">{item.desc}</span>
              </div>
              <div className="notif-settings-table-cols">
                <div className="notif-settings-table-col">
                  <Checkbox
                    checked={emailStates[index]}
                    onChange={() => toggleEmail(index)}
                  />
                </div>
                <div className="notif-settings-table-col">
                  <Checkbox
                    checked={appStates[index]}
                    onChange={() => toggleApp(index)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

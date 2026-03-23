import { useState } from 'react';
import { BgColorsOutlined } from '@ant-design/icons';

const THEMES = [
  { key: 'light', label: 'Light', icon: '☀️' },
  { key: 'dark', label: 'Dark', icon: '🌙' },
  { key: 'system', label: 'System', icon: '🖥️' },
];

const ACCENT_COLORS = [
  { key: 'blue', value: '#4A7BF7' },
  { key: 'teal', value: '#1A8CCC' },
  { key: 'yellow', value: '#E5A300' },
  { key: 'orange', value: '#E87B35' },
  { key: 'pink', value: '#E55B8A' },
  { key: 'purple', value: '#9B6DD7' },
  { key: 'green', value: '#2EC9A0' },
];

export default function SettingsAppearance() {
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [selectedColor, setSelectedColor] = useState('blue');

  return (
    <div className="appearance-section">
      <h1 className="appearance-title">Appearance</h1>
      <p className="appearance-subtitle">Customize the look and feel of your platform</p>

      {/* Theme Section */}
      <div className="appearance-theme-section">
        <h2 className="appearance-section-title">Theme</h2>
        <p className="appearance-section-desc">
          Select a theme to personalize your platform's appearance
        </p>

        <div className="appearance-theme-cards">
          {THEMES.map((theme) => (
            <div
              key={theme.key}
              className={`appearance-theme-card ${selectedTheme === theme.key ? 'active' : ''}`}
              onClick={() => setSelectedTheme(theme.key)}
            >
              <div className={`appearance-theme-preview appearance-theme-preview--${theme.key}`}>
                {/* Light theme preview */}
                {theme.key === 'light' && (
                  <div className="theme-preview-light">
                    <div className="tp-sidebar">
                      <div className="tp-sidebar-item tp-sidebar-item--short" />
                      <div className="tp-sidebar-item" />
                      <div className="tp-sidebar-item tp-sidebar-item--active" />
                      <div className="tp-sidebar-item" />
                    </div>
                    <div className="tp-main">
                      <div className="tp-header" />
                      <div className="tp-content">
                        <div className="tp-line tp-line--wide" />
                        <div className="tp-line" />
                        <div className="tp-line tp-line--medium" />
                      </div>
                    </div>
                  </div>
                )}
                {/* Dark theme preview */}
                {theme.key === 'dark' && (
                  <div className="theme-preview-dark">
                    <div className="tp-sidebar">
                      <div className="tp-sidebar-item tp-sidebar-item--short" />
                      <div className="tp-sidebar-item" />
                      <div className="tp-sidebar-item tp-sidebar-item--active" />
                      <div className="tp-sidebar-item" />
                    </div>
                    <div className="tp-main">
                      <div className="tp-header" />
                      <div className="tp-content">
                        <div className="tp-line tp-line--wide" />
                        <div className="tp-line" />
                        <div className="tp-line tp-line--medium" />
                      </div>
                    </div>
                  </div>
                )}
                {/* System theme preview */}
                {theme.key === 'system' && (
                  <div className="theme-preview-system">
                    <div className="theme-preview-system-left">
                      <div className="tp-sidebar">
                        <div className="tp-sidebar-item tp-sidebar-item--short" />
                        <div className="tp-sidebar-item tp-sidebar-item--active" />
                        <div className="tp-sidebar-item" />
                      </div>
                      <div className="tp-main">
                        <div className="tp-header" />
                        <div className="tp-content">
                          <div className="tp-line tp-line--wide" />
                          <div className="tp-line" />
                        </div>
                      </div>
                    </div>
                    <div className="theme-preview-system-right">
                      <div className="tp-sidebar">
                        <div className="tp-sidebar-item tp-sidebar-item--short" />
                        <div className="tp-sidebar-item tp-sidebar-item--active" />
                        <div className="tp-sidebar-item" />
                      </div>
                      <div className="tp-main">
                        <div className="tp-header" />
                        <div className="tp-content">
                          <div className="tp-line tp-line--wide" />
                          <div className="tp-line" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="appearance-theme-label">
                <span className="appearance-theme-icon">{theme.icon}</span>
                <span>{theme.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accent Color Section */}
      <div className="appearance-accent-section">
        <div className="appearance-accent-header">
          <div>
            <h2 className="appearance-section-title">Accent color</h2>
            <p className="appearance-section-desc">
              Choose the main color that defines the overall tone
            </p>
          </div>
          <div className="appearance-color-dots">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.key}
                className={`appearance-color-dot ${selectedColor === color.key ? 'active' : ''}`}
                style={{ background: color.value }}
                onClick={() => setSelectedColor(color.key)}
              >
                {selectedColor === color.key && (
                  <span className="appearance-color-check">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

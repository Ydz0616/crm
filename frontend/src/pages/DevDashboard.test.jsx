// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock external dependencies before importing the SUT.
vi.mock('react-redux', () => ({
  useSelector: (selector) => selector({ auth: { current: { email: 'test@x.com' } } }),
}));

vi.mock('@/redux/auth/selectors', () => ({
  selectCurrentAdmin: (state) => state.auth.current,
}));

vi.mock('@/locale/useLanguage', () => ({
  default: () => (key) => key,
}));

vi.mock('@/modules/DevDashboardModule', () => ({
  default: () => <div data-testid="dev-dashboard-module">Module</div>,
}));

const isInternalUserMock = vi.fn();
vi.mock('@/utils/isInternalUser', () => ({
  default: (admin) => isInternalUserMock(admin),
}));

// Import AFTER mocks so the page picks them up.
const { default: DevDashboard } = await import('./DevDashboard.jsx');

describe('DevDashboard page gate', () => {
  beforeEach(() => {
    cleanup();
    isInternalUserMock.mockReset();
  });

  test('renders 403 Result when admin is NOT internal', () => {
    isInternalUserMock.mockReturnValue(false);
    render(<DevDashboard />);
    expect(screen.getByText('access_denied')).toBeDefined();
    expect(screen.queryByTestId('dev-dashboard-module')).toBeNull();
  });

  test('renders DevDashboardModule when admin IS internal', () => {
    isInternalUserMock.mockReturnValue(true);
    render(<DevDashboard />);
    expect(screen.getByTestId('dev-dashboard-module')).toBeDefined();
    expect(screen.queryByText('access_denied')).toBeNull();
  });

  test('passes the current admin to the gate function', () => {
    isInternalUserMock.mockReturnValue(true);
    render(<DevDashboard />);
    expect(isInternalUserMock).toHaveBeenCalledWith({ email: 'test@x.com' });
  });
});

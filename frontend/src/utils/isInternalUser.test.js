import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('isInternalUser', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  test('returns true for email in allowlist', async () => {
    vi.stubEnv('VITE_INTERNAL_DASHBOARD_EMAILS', 'a@x.com,b@x.com');
    const { default: isInternalUser } = await import('./isInternalUser.js');
    expect(isInternalUser({ email: 'a@x.com' })).toBe(true);
    expect(isInternalUser({ email: 'b@x.com' })).toBe(true);
  });

  test('returns false for email not in allowlist', async () => {
    vi.stubEnv('VITE_INTERNAL_DASHBOARD_EMAILS', 'a@x.com');
    const { default: isInternalUser } = await import('./isInternalUser.js');
    expect(isInternalUser({ email: 'b@x.com' })).toBe(false);
  });

  test('returns false for null/undefined/missing email', async () => {
    vi.stubEnv('VITE_INTERNAL_DASHBOARD_EMAILS', 'a@x.com');
    const { default: isInternalUser } = await import('./isInternalUser.js');
    expect(isInternalUser(null)).toBe(false);
    expect(isInternalUser(undefined)).toBe(false);
    expect(isInternalUser({})).toBe(false);
    expect(isInternalUser({ email: '' })).toBe(false);
  });

  test('matches case-insensitively', async () => {
    vi.stubEnv('VITE_INTERNAL_DASHBOARD_EMAILS', 'A@X.COM, B@X.COM ');
    const { default: isInternalUser } = await import('./isInternalUser.js');
    expect(isInternalUser({ email: 'a@x.com' })).toBe(true);
    expect(isInternalUser({ email: 'B@X.com' })).toBe(true);
  });

  test('fails closed when env is unset', async () => {
    vi.stubEnv('VITE_INTERNAL_DASHBOARD_EMAILS', '');
    const { default: isInternalUser } = await import('./isInternalUser.js');
    expect(isInternalUser({ email: 'anyone@x.com' })).toBe(false);
  });
});

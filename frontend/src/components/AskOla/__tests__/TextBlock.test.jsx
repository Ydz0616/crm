// @vitest-environment jsdom
//
// Tests for TextBlock — verifies remark-gfm autolinks bare URLs (Issue #170
// 真修 Q170-4). Without remark-gfm, react-markdown only links explicit
// markdown [text](url) / <url>; bare URL strings stayed as plain text and
// the user could not click PDF download links the agent emitted.

import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import TextBlock from '../blocks/TextBlock';

afterEach(cleanup);

describe('TextBlock — assistant mode (markdown)', () => {
  test('linkifies a bare URL to <a href>', () => {
    const { container } = render(
      <TextBlock content="Your PDF is at http://localhost:8888/download/quote/quote-25-001.pdf" />
    );
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toBe('http://localhost:8888/download/quote/quote-25-001.pdf');
  });

  test('renders explicit [text](url) markdown links unchanged', () => {
    const { container, getByText } = render(
      <TextBlock content="Click [here](https://example.com/foo) to download." />
    );
    const anchor = container.querySelector('a[href="https://example.com/foo"]');
    expect(anchor).not.toBeNull();
    expect(getByText('here')).toBeTruthy();
  });

  test('linkifies https URL inside a sentence', () => {
    const { container } = render(
      <TextBlock content="See https://app.olatech.ai/api/quote/abc/pdf for the file." />
    );
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toBe('https://app.olatech.ai/api/quote/abc/pdf');
  });
});

describe('TextBlock — user mode (plain, no markdown)', () => {
  test('does NOT parse markdown when plain=true', () => {
    const { container } = render(
      <TextBlock content="See http://example.com/foo" plain />
    );
    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toContain('http://example.com/foo');
  });
});

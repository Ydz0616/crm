// @vitest-environment jsdom
//
// Tests for QuoteListWidget — the lightweight quote_list widget rendered
// after quote.search MCP tool calls (Issue #170 真修).
//
// Per zyd's UX decision: list view shows summary only; user picks one and
// agent calls quote.read for the full preview + PDF — so this widget
// intentionally has NO onClick / no PDF block per row.

import { describe, test, expect, afterEach, beforeAll } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import QuoteListWidget from '../widgets/QuoteListWidget';

// jsdom does not implement matchMedia; AntD Table's responsive observer
// touches it on mount. Stub before any render runs.
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    });
  }
});

afterEach(cleanup);

const SAMPLE_RESULTS = [
  {
    quoteId: 'q1',
    quoteNumber: '25-001',
    client: 'Acme Trading',
    date: '2026-04-15T00:00:00.000Z',
    total: 1234.5,
    currency: 'USD',
    status: 'draft',
  },
  {
    quoteId: 'q2',
    quoteNumber: '25-023',
    client: 'Beijing Steel',
    date: '2026-04-20T00:00:00.000Z',
    total: 8888,
    currency: 'CNY',
    status: 'sent',
  },
  {
    quoteId: 'q3',
    quoteNumber: '25-123',
    client: 'Shanghai Foods',
    date: '2026-05-01T00:00:00.000Z',
    total: 500,
    currency: 'USD',
    status: 'accepted',
  },
];

describe('QuoteListWidget — render', () => {
  test('renders N rows for N results, header shows count', () => {
    const { getByText, getAllByText } = render(
      <QuoteListWidget data={{ results: SAMPLE_RESULTS }} />
    );
    expect(getByText('Matching Quotes (3)')).toBeTruthy();
    expect(getByText('25-001')).toBeTruthy();
    expect(getByText('25-023')).toBeTruthy();
    expect(getByText('25-123')).toBeTruthy();
    // Customer column rendered
    expect(getByText('Acme Trading')).toBeTruthy();
    expect(getByText('Beijing Steel')).toBeTruthy();
    // Status tags rendered (lowercase per Quote schema status enum)
    expect(getAllByText('draft').length).toBeGreaterThan(0);
  });

  test('formats money with currency symbol (USD vs CNY)', () => {
    const { getByText } = render(<QuoteListWidget data={{ results: SAMPLE_RESULTS }} />);
    expect(getByText('$1234.50')).toBeTruthy();
    expect(getByText('¥8888.00')).toBeTruthy();
    expect(getByText('$500.00')).toBeTruthy();
  });

  test('formats date as YYYY-MM-DD', () => {
    const { getByText } = render(<QuoteListWidget data={{ results: SAMPLE_RESULTS }} />);
    expect(getByText('2026-04-15')).toBeTruthy();
    expect(getByText('2026-04-20')).toBeTruthy();
    expect(getByText('2026-05-01')).toBeTruthy();
  });
});

describe('QuoteListWidget — edge cases', () => {
  test('empty results array shows header (count 0) and empty table', () => {
    const { getByText } = render(<QuoteListWidget data={{ results: [] }} />);
    expect(getByText('Matching Quotes (0)')).toBeTruthy();
    expect(getByText(/No data/i)).toBeTruthy();  // AntD Table empty placeholder
  });

  test('null / undefined data does not crash', () => {
    expect(() => render(<QuoteListWidget data={null} />)).not.toThrow();
    cleanup();
    expect(() => render(<QuoteListWidget data={undefined} />)).not.toThrow();
    cleanup();
    expect(() => render(<QuoteListWidget data={{}} />)).not.toThrow();
  });

  test('malformed money values fall back to dash with currency symbol', () => {
    const bad = [
      { quoteId: 'qx', quoteNumber: '25-X', client: 'X', date: null, total: null, currency: 'USD', status: 'draft' },
    ];
    const { getByText } = render(<QuoteListWidget data={{ results: bad }} />);
    expect(getByText('$-')).toBeTruthy();
    expect(getByText('-')).toBeTruthy();  // date fallback
  });
});

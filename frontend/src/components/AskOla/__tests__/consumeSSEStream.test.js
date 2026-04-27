// Unit tests for consumeSSEStream (Issue #131, backlog L5).
// Pure logic — no DOM needed, default vitest node environment is fine.

import { describe, test, expect, vi } from 'vitest';
import { consumeSSEStream } from '../consumeSSEStream';

// Build a Fetch-like Response whose body is a ReadableStream that emits the
// given byte chunks in sequence. Lets us simulate SSE delivery patterns
// (whole-frame chunks, mid-frame chunks, multi-frame chunks) without a real
// HTTP server.
function makeMockResponse(chunks) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return { body };
}

describe('consumeSSEStream', () => {
  test('routes named events to matching handlers with parsed JSON data', async () => {
    const calls = [];
    const handlers = {
      thinking_step: (d) => calls.push(['thinking_step', d]),
      text_token:    (d) => calls.push(['text_token', d]),
      done:          (d) => calls.push(['done', d]),
    };
    const sse = [
      'event: thinking_step\ndata: {"label":"Searching products...","ts":1}\n\n',
      'event: text_token\ndata: {"delta":"Hi"}\n\n',
      'event: done\ndata: {"sessionId":"abc","blocks":[]}\n\n',
    ].join('');
    await consumeSSEStream(makeMockResponse([sse]), handlers);
    expect(calls).toEqual([
      ['thinking_step', { label: 'Searching products...', ts: 1 }],
      ['text_token', { delta: 'Hi' }],
      ['done', { sessionId: 'abc', blocks: [] }],
    ]);
  });

  test('handles frames split across chunk boundaries', async () => {
    const handler = vi.fn();
    // The "data:" line is split mid-string between two ReadableStream chunks.
    await consumeSSEStream(
      makeMockResponse([
        'event: text_token\ndata: {"delt',
        'a":"hello"}\n\n',
      ]),
      { text_token: handler },
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ delta: 'hello' });
  });

  test('handles multiple frames arriving in a single chunk', async () => {
    const seen = [];
    const sse =
      'event: text_token\ndata: {"delta":"a"}\n\n' +
      'event: text_token\ndata: {"delta":"b"}\n\n' +
      'event: text_token\ndata: {"delta":"c"}\n\n';
    await consumeSSEStream(makeMockResponse([sse]), {
      text_token: (d) => seen.push(d.delta),
    });
    expect(seen).toEqual(['a', 'b', 'c']);
  });

  test('drops unknown events silently (forward-compat)', async () => {
    const knownHandler = vi.fn();
    const sse =
      'event: text_token\ndata: {"delta":"x"}\n\n' +
      'event: future_event\ndata: {"foo":"bar"}\n\n' +
      'event: text_token\ndata: {"delta":"y"}\n\n';
    await consumeSSEStream(makeMockResponse([sse]), {
      text_token: knownHandler,
    });
    expect(knownHandler).toHaveBeenCalledTimes(2);
    expect(knownHandler.mock.calls[0][0]).toEqual({ delta: 'x' });
    expect(knownHandler.mock.calls[1][0]).toEqual({ delta: 'y' });
  });

  test('passes raw string through when data is not valid JSON', async () => {
    const handler = vi.fn();
    await consumeSSEStream(
      makeMockResponse(['event: weird\ndata: not-json-here\n\n']),
      { weird: handler },
    );
    expect(handler).toHaveBeenCalledWith('not-json-here');
  });

  test('awaits async handlers in order', async () => {
    const order = [];
    const slow = async (d) => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(['slow', d.delta]);
    };
    const fast = (d) => order.push(['fast', d.delta]);
    const sse =
      'event: a\ndata: {"delta":"1"}\n\n' +
      'event: b\ndata: {"delta":"2"}\n\n' +
      'event: a\ndata: {"delta":"3"}\n\n';
    await consumeSSEStream(makeMockResponse([sse]), { a: slow, b: fast });
    expect(order).toEqual([
      ['slow', '1'],
      ['fast', '2'],
      ['slow', '3'],
    ]);
  });

  test('throws when response.body is missing', async () => {
    await expect(consumeSSEStream({}, {})).rejects.toThrow(/response\.body is missing/);
  });

  test('handles default-event (no event: line) frames with handler key "message"', async () => {
    const handler = vi.fn();
    await consumeSSEStream(
      makeMockResponse(['data: {"x":1}\n\n']),
      { message: handler },
    );
    expect(handler).toHaveBeenCalledWith({ x: 1 });
  });
});

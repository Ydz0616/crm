/**
 * consumeSSEStream — generic Fetch+ReadableStream SSE consumer (Issue #131).
 *
 * EventSource doesn't support POST bodies, so /api/ola/chat is hit via
 * fetch() and we read the response.body ReadableStream manually. This is the
 * standard workaround used by OpenAI / Anthropic / Google JS SDKs.
 *
 * Usage:
 *
 *   const response = await fetch('/api/ola/chat', { method: 'POST', ... });
 *   await consumeSSEStream(response, {
 *     thinking_step: (data) => { ... },
 *     text_token:    (data) => { ... },
 *     done:          (data) => { ... },
 *     error:         (data) => { ... },
 *   });
 *
 * Frame format follows the SSE spec: lines `event: NAME\n` and `data: JSON\n`,
 * frames separated by blank line. JSON-decoded `data` is passed to the
 * matching handler. Unknown events are silently dropped (forward-compat).
 */
export async function consumeSSEStream(response, handlers) {
  if (!response || !response.body) {
    throw new Error('consumeSSEStream: response.body is missing');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawFrame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        if (!rawFrame.trim()) continue;

        let event = 'message';
        const dataLines = [];
        for (const line of rawFrame.split('\n')) {
          if (line.startsWith('event:')) {
            event = line.slice('event:'.length).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice('data:'.length).trim());
          }
        }
        const dataStr = dataLines.join('\n');
        let data;
        try {
          data = dataStr ? JSON.parse(dataStr) : null;
        } catch {
          // Non-JSON data line — pass raw string through.
          data = dataStr;
        }

        const handler = handlers[event];
        if (typeof handler === 'function') {
          await handler(data);
        }
      }
    }
  } finally {
    // Make sure we don't leave the underlying reader locked if the caller
    // bails out (e.g. handler throws).
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

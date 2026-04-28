/**
 * consumeSSEStream — generic Fetch+ReadableStream SSE consumer (Issue #131).
 *
 * EventSource doesn't support POST bodies, so /api/ola/chat is hit via
 * fetch() and we read the response.body ReadableStream manually. This is the
 * standard workaround used by OpenAI / Anthropic / Google JS SDKs.
 *
 * Usage:
 *
 *   const ac = new AbortController();
 *   const response = await fetch('/api/ola/chat', { signal: ac.signal, ... });
 *   await consumeSSEStream(response, {
 *     thinking_step: (data) => { ... },
 *     text_token:    (data) => { ... },
 *     done:          (data) => { ... },
 *     error:         (data) => { ... },
 *   }, ac.signal);
 *
 * Frame format follows the SSE spec: lines `event: NAME\n` and `data: JSON\n`,
 * frames separated by blank line. JSON-decoded `data` is passed to the
 * matching handler. Unknown events are silently dropped (forward-compat).
 *
 * Pass an AbortSignal (3rd arg) to cancel mid-stream — when aborted, the
 * reader is cancelled and the function returns cleanly without throwing.
 * Caller should also pass the same signal to fetch() so the upstream
 * connection is torn down too.
 */
export async function consumeSSEStream(response, handlers, signal) {
  if (!response || !response.body) {
    throw new Error('consumeSSEStream: response.body is missing');
  }
  if (signal && signal.aborted) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Cancelling the reader on abort makes the in-flight read() resolve to
  // {done: true} (or reject in some impls — handled below), so the loop
  // terminates promptly instead of blocking on a stalled stream.
  const onAbort = () => {
    reader.cancel().catch(() => { /* already closed */ });
  };
  if (signal) signal.addEventListener('abort', onAbort, { once: true });

  try {
    while (true) {
      if (signal && signal.aborted) break;
      let chunk;
      try {
        chunk = await reader.read();
      } catch (err) {
        // reader.cancel() can surface here as AbortError / TypeError depending
        // on the platform. Treat any error as abort if the signal fired.
        if (signal && signal.aborted) break;
        throw err;
      }
      const { done, value } = chunk;
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
    if (signal) signal.removeEventListener('abort', onAbort);
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

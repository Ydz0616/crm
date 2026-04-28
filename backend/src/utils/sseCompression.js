const compression = require('compression');

/**
 * compression() filter that excludes Server-Sent Events responses
 * (Issue #131).
 *
 * The default Express compression middleware buffers all res.write() chunks
 * to gzip them at res.end(). For SSE this is fatal: the entire stream is
 * held in memory and dumped at the end, defeating real-time streaming
 * (thinking_step labels never tick, text never streams token-by-token).
 *
 * The controller signals SSE by setting `Content-Type: text/event-stream`
 * before the first res.write(). compression() invokes this filter at the
 * write boundary, by which point the header is set and visible here.
 *
 * Returns false → bypass compression. Returns compression.filter(req, res)
 * for non-SSE responses → preserves the library's default Accept-Encoding /
 * Cache-Control / size heuristics.
 */
function sseAwareCompressionFilter(req, res) {
  const ct = res.getHeader('Content-Type');
  if (typeof ct === 'string' && ct.includes('text/event-stream')) return false;
  return compression.filter(req, res);
}

module.exports = { sseAwareCompressionFilter };

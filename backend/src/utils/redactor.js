// Strip well-known secret formats out of arbitrary log strings before they
// leave the backend (issue #220 D7 logs panel; D9 will reuse this in error
// responses).
//
// We replace the entire matched substring with `***MASKED***` rather than
// keeping a prefix like `Bearer ***`. Operators recognising "this is a
// Bearer line" is fine; leaking even a partial token is not, because partial
// tokens are still useful to attackers (rainbow / brute-force narrowing).
//
// Patterns are intentionally conservative — we'd rather mask harmless URLs
// than leak a credential. Add new patterns as we discover new secret
// shapes in the wild; never lower an existing pattern's strictness.

const PATTERNS = [
  // HTTP `Authorization: Bearer <token>` — most common shape in proxy logs.
  /Bearer\s+\S+/gi,
  // OpenAI / Anthropic-ish keys (`sk-...`, `sk-proj-...`, `sk-ant-...`).
  /\bsk-[A-Za-z0-9_-]{8,}/g,
  // Slack bot/app tokens.
  /\bxox[bopa]-[A-Za-z0-9-]+/gi,
  // GitHub PATs / fine-grained tokens.
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  // MongoDB connection strings (any path or query — we don't try to
  // preserve the cluster hostname because the URI is the credential).
  /mongodb(?:\+srv)?:\/\/\S+/gi,
];

function maskSecrets(input) {
  if (input === null || input === undefined) return input;
  let s = String(input);
  for (const re of PATTERNS) {
    s = s.replace(re, '***MASKED***');
  }
  return s;
}

module.exports = maskSecrets;
module.exports.PATTERNS = PATTERNS;

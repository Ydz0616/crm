// DB Summary panel controller (#220 D8) — list every collection in the
// active mongoose connection with its document count and last-inserted
// metadata.
//
// Bounded ops: each collection's countDocuments and findOne race against
// a 5s timeout via Promise.race. Slow collections (e.g. messages on a
// busy tenant) surface as `{ count: null, error: 'timeout' }` rather
// than stalling the whole endpoint. Promise.allSettled wraps everything
// so one collection blowing up never breaks the response.
//
// What we DO NOT expose: connection strings, DB name, mongo user, host.
// Only the collection name + numeric counts + a tiny `lastInsertedAt`
// timestamp + the most recent `_id`. The plan calls out this is an
// internal-only endpoint, but defense in depth — we keep the data
// surface small even behind the email allowlist.
//
// What we DO NOT accept: a query string parameter for "which collection
// to inspect". Letting a query string drive a Mongo command is an SSRF-
// style hole even at this scope, and the panel doesn't need it.

const mongoose = require('mongoose');

const PER_COLLECTION_TIMEOUT_MS = 5000;

function withTimeout(promise, ms, onTimeout) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(onTimeout()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function summarizeCollection(coll) {
  const name = coll.name;
  const handle = mongoose.connection.db.collection(name);

  const countPromise = handle.countDocuments({}).catch((err) => ({
    __error: err && err.message ? err.message : 'count failed',
  }));
  const lastDocPromise = handle
    .find({}, { projection: { _id: 1, created: 1, removed: 1 } })
    .sort({ _id: -1 })
    .limit(1)
    .toArray()
    .then((arr) => arr[0] || null)
    .catch((err) => ({
      __error: err && err.message ? err.message : 'last-doc fetch failed',
    }));

  const [countResult, lastDocResult] = await Promise.all([
    withTimeout(countPromise, PER_COLLECTION_TIMEOUT_MS, () => '__timeout'),
    withTimeout(lastDocPromise, PER_COLLECTION_TIMEOUT_MS, () => '__timeout'),
  ]);

  const out = { name };

  if (countResult === '__timeout') {
    out.count = null;
    out.countError = 'timeout';
  } else if (countResult && typeof countResult === 'object' && countResult.__error) {
    out.count = null;
    out.countError = countResult.__error;
  } else {
    out.count = countResult;
  }

  if (lastDocResult === '__timeout') {
    out.lastInsertedAt = null;
    out.lastInsertedId = null;
    out.lastInsertedError = 'timeout';
  } else if (lastDocResult && lastDocResult.__error) {
    out.lastInsertedAt = null;
    out.lastInsertedId = null;
    out.lastInsertedError = lastDocResult.__error;
  } else if (lastDocResult) {
    out.lastInsertedId = String(lastDocResult._id);
    // ObjectId encodes its creation timestamp — surface that even when the
    // doc has no `created` field. Falls back to `created` when present.
    const idTs = lastDocResult._id && lastDocResult._id.getTimestamp
      ? lastDocResult._id.getTimestamp().toISOString()
      : null;
    out.lastInsertedAt = lastDocResult.created
      ? new Date(lastDocResult.created).toISOString()
      : idTs;
    if (typeof lastDocResult.removed === 'boolean') {
      out.lastDocRemoved = lastDocResult.removed;
    }
  } else {
    out.lastInsertedAt = null;
    out.lastInsertedId = null;
  }

  return out;
}

async function getDbSummary(req, res) {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      result: null,
      message: 'Database not connected',
    });
  }

  const collections = await mongoose.connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const settled = await Promise.allSettled(
    collections.map((c) => summarizeCollection(c))
  );

  const summaries = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    // Should be unreachable because summarizeCollection catches its own
    // promise rejections, but defensive nonetheless.
    return {
      name: collections[i].name,
      count: null,
      countError: s.reason && s.reason.message ? s.reason.message : 'unknown error',
    };
  });

  // Default sort: newest activity first by lastInsertedAt, then by count.
  // The frontend table can re-sort, but this default is the most useful for
  // operators eyeballing recent writes.
  summaries.sort((a, b) => {
    const ta = a.lastInsertedAt ? Date.parse(a.lastInsertedAt) : 0;
    const tb = b.lastInsertedAt ? Date.parse(b.lastInsertedAt) : 0;
    if (tb !== ta) return tb - ta;
    return (b.count || 0) - (a.count || 0);
  });

  return res.status(200).json({
    success: true,
    result: {
      generatedAt: new Date().toISOString(),
      collectionCount: summaries.length,
      collections: summaries,
    },
    message: `DB summary across ${summaries.length} collections`,
  });
}

module.exports = getDbSummary;
module.exports.PER_COLLECTION_TIMEOUT_MS = PER_COLLECTION_TIMEOUT_MS;

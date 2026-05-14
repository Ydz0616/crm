const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const recordUsage = require('./recordUsage');

const methods = createCRUDController('LlmUsage');

// LLMUsage records are written exclusively by the system (olaController/chat.js
// after each Ask Ola turn). Block external mutation through the auto-generated
// CRUD routes — read-only access is via list/read/summary, which back the
// admin token dashboard (#99 / future).
const denyWrite = (req, res) =>
  res.status(403).json({
    success: false,
    result: null,
    message: 'LLMUsage 写入仅限系统内部',
  });

methods.create = denyWrite;
methods.update = denyWrite;
methods.delete = denyWrite;

// Internal-only function (not a route handler) — exposed on the controller
// object so olaController can require it without poking at file paths.
methods.recordUsage = recordUsage;

module.exports = methods;

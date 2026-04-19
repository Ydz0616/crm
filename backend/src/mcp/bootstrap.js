// Ola CRM MCP — Bootstrap (mongo + models + system admin)
//
// MCP server is a separate Node process from the main backend, so it must
// open its own mongoose connection and load the same model files. We also
// resolve a "system admin" once at startup — every CRM controller gates
// reads/writes by `req.admin._id`, so MCP needs a stable identity to
// impersonate. We pick the first non-removed `owner`, falling back to the
// first non-removed admin/user. The cached admin is exposed via
// getSystemAdmin() to all tools.
//
// Fail-fast: any connect / model-load / admin-lookup error throws and the
// MCP process exits — never silently boot in a half-broken state.

const mongoose = require('mongoose');
const { globSync } = require('glob');
const path = require('path');

let systemAdmin = null;

async function loadModels() {
  // Same glob the main backend uses (src/server.js).
  const modelsFiles = globSync('./src/models/**/*.js');
  if (modelsFiles.length === 0) {
    throw new Error('[mcp bootstrap] no model files found — wrong cwd?');
  }
  for (const filePath of modelsFiles) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    require(path.resolve(filePath));
  }
}

async function connectMongo() {
  if (!process.env.DATABASE) {
    throw new Error('[mcp bootstrap] DATABASE env not set');
  }
  await mongoose.connect(process.env.DATABASE, {
    tls: true,
    tlsAllowInvalidCertificates: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    family: 4,
  });
}

async function resolveSystemAdmin() {
  const Admin = mongoose.model('Admin');
  // Prefer owner, then admin, then user. Stable order so re-boots pick the same actor.
  const candidate =
    (await Admin.findOne({ removed: false, enabled: true, role: 'owner' }).sort({ created: 1 }).exec()) ||
    (await Admin.findOne({ removed: false, enabled: true, role: 'admin' }).sort({ created: 1 }).exec()) ||
    (await Admin.findOne({ removed: false, enabled: true }).sort({ created: 1 }).exec());
  if (!candidate) {
    throw new Error('[mcp bootstrap] no enabled Admin found — cannot impersonate');
  }
  systemAdmin = candidate;
  return candidate;
}

async function bootstrap() {
  await loadModels();
  await connectMongo();
  await resolveSystemAdmin();
  return {
    admin: { _id: systemAdmin._id, email: systemAdmin.email, role: systemAdmin.role },
  };
}

function getSystemAdmin() {
  if (!systemAdmin) {
    throw new Error('[mcp bootstrap] getSystemAdmin called before bootstrap()');
  }
  return systemAdmin;
}

module.exports = { bootstrap, getSystemAdmin };

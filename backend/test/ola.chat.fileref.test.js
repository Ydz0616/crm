/**
 * Tests for chat.js fileIds extension — POST /api/ola/chat with audio attachments (#249 B2).
 *
 * Covers:
 *  - valid fileId from same admin → 200 SSE, NanoBot upstream user content
 *    contains "[file: <sourcePath>]" prepend
 *  - cross-admin fileId → 404 (don't leak existence)
 *  - non-existent fileId → 404
 *  - removed=true fileId → 404
 *  - malformed fileId string → 404
 *  - fileIds omitted / empty → regression, no file tag injected
 *  - second call in same session w/o fileIds after a first-call w/ fileIds → no residual tag
 *
 * Pattern matches olaController.chat.test.js: fake NanoBot on port 18901
 * captures upstream request body for inspection.
 */

const path = require('path');
const http = require('http');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { globSync } = require('glob');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..');
const FAKE_NANOBOT_PORT = 18901;
const adminAId = new mongoose.Types.ObjectId();
const adminBId = new mongoose.Types.ObjectId();

let mongo;
let fakeNanoBot;
let lastUpstreamBody = null;

beforeAll(async () => {
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f))
  );
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  process.env.NANOBOT_HOST = '127.0.0.1';
  process.env.NANOBOT_PORT = String(FAKE_NANOBOT_PORT);

  fakeNanoBot = http.createServer((req, res) => {
    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        lastUpstreamBody = body;
        // Minimal SSE: emit one text token then [DONE]
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(
          'data: ' +
          JSON.stringify({ choices: [{ delta: { content: 'ack' } }] }) +
          '\n\n',
        );
        res.write('data: [DONE]\n\n');
        res.end();
      });
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) =>
    fakeNanoBot.listen(FAKE_NANOBOT_PORT, '127.0.0.1', resolve)
  );
}, 120000);

afterAll(async () => {
  await new Promise((r) => setTimeout(r, 200));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (fakeNanoBot) await new Promise((resolve) => fakeNanoBot.close(resolve));
});

beforeEach(async () => {
  lastUpstreamBody = null;
  for (const name of ['ChatSession', 'ChatMessage', 'File']) {
    if (mongoose.models[name]) await mongoose.models[name].deleteMany({});
  }
});

function buildChatApp(adminId) {
  const chat = require(
    path.join(BACKEND_ROOT, 'src/controllers/appControllers/olaController/chat')
  );
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.admin = { _id: adminId };
    next();
  });
  app.post('/api/ola/chat', (req, res) => chat(req, res));
  return app;
}

async function createFileForAdmin(adminId, overrides = {}) {
  const FileModel = mongoose.model('File');
  return FileModel.create({
    createdBy: adminId,
    originalName: overrides.originalName || 'sample.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 1024,
    sourcePath: `/tmp/uploads/${adminId}/2026/05/sample.mp3`,
    ...overrides,
  });
}

describe('chat fileIds — valid same-admin file', () => {
  it('injects [file: <sourcePath>] tag into NanoBot upstream user content', async () => {
    const file = await createFileForAdmin(adminAId);

    const app = buildChatApp(adminAId);
    const res = await request(app)
      .post('/api/ola/chat')
      .send({ message: '请评估这段录音', fileIds: [file._id.toString()] });

    expect(res.statusCode).toBe(200);
    expect(lastUpstreamBody).toBeTruthy();
    const parsed = JSON.parse(lastUpstreamBody);
    const userContent = parsed.messages[0].content;
    expect(userContent).toContain(`[file: ${file.sourcePath}]`);
    expect(userContent).toContain('请评估这段录音');
  });
});

describe('chat fileIds — rejections (all return 404, no existence leak)', () => {
  it('cross-admin fileId → 404', async () => {
    const file = await createFileForAdmin(adminAId);
    const app = buildChatApp(adminBId); // B uses A's fileId
    const res = await request(app)
      .post('/api/ola/chat')
      .send({ message: 'hi', fileIds: [file._id.toString()] });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('文件不存在或无权访问');
  });

  it('non-existent fileId → 404', async () => {
    const app = buildChatApp(adminAId);
    const phantomId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post('/api/ola/chat')
      .send({ message: 'hi', fileIds: [phantomId] });

    expect(res.statusCode).toBe(404);
  });

  it('removed=true fileId → 404', async () => {
    const file = await createFileForAdmin(adminAId, { removed: true });
    const app = buildChatApp(adminAId);
    const res = await request(app)
      .post('/api/ola/chat')
      .send({ message: 'hi', fileIds: [file._id.toString()] });

    expect(res.statusCode).toBe(404);
  });

  it('malformed fileId string → 404', async () => {
    const app = buildChatApp(adminAId);
    const res = await request(app)
      .post('/api/ola/chat')
      .send({ message: 'hi', fileIds: ['not-an-objectid'] });

    expect(res.statusCode).toBe(404);
  });

  it('fileIds non-array → 400', async () => {
    const app = buildChatApp(adminAId);
    const res = await request(app)
      .post('/api/ola/chat')
      .send({ message: 'hi', fileIds: 'just-a-string' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('fileIds');
  });
});

describe('chat fileIds — regression (no fileIds = pre-extension behavior)', () => {
  it('omitting fileIds → NanoBot upstream content has no [file: ...] tag', async () => {
    const app = buildChatApp(adminAId);
    const res = await request(app)
      .post('/api/ola/chat')
      .send({ message: 'plain chat with no file' });

    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(lastUpstreamBody);
    expect(parsed.messages[0].content).not.toContain('[file:');
    expect(parsed.messages[0].content).toContain('plain chat with no file');
  });

  it('empty fileIds array → no [file: ...] tag', async () => {
    const app = buildChatApp(adminAId);
    await request(app).post('/api/ola/chat').send({ message: 'hi', fileIds: [] });
    const parsed = JSON.parse(lastUpstreamBody);
    expect(parsed.messages[0].content).not.toContain('[file:');
  });

  it('second call without fileIds after first call with fileIds → no residual tag', async () => {
    const file = await createFileForAdmin(adminAId);
    const app = buildChatApp(adminAId);

    // First call with fileIds
    await request(app)
      .post('/api/ola/chat')
      .send({ message: 'analyze this', fileIds: [file._id.toString()] });
    expect(JSON.parse(lastUpstreamBody).messages[0].content).toContain('[file:');

    // Second call without fileIds
    await request(app)
      .post('/api/ola/chat')
      .send({ message: 'follow up question' });
    const second = JSON.parse(lastUpstreamBody);
    expect(second.messages[0].content).not.toContain('[file:');
    expect(second.messages[0].content).toContain('follow up question');
  });
});

/**
 * Tests for chat.js Job-aware transcript injection (#249 Plan B v2 item 3).
 *
 * Complements ola.chat.fileref.test.js (which covers fileId resolution +
 * tenant scope + tag presence/absence). This file focuses on the new
 * Job state machine + sidecar branches.
 *
 * Covers:
 *  1. Job.status=pending → 409
 *  2. Job.status=running → 409
 *  3. Job.status=failed → 422 with job.error in message
 *  4. Job.status=done + sidecar file missing on disk → 500
 *  5. File.transcriptionJobId=null → 422 (audio upload never spawned a Job)
 *  6. Job ref invalid (Job doc deleted under File) → 500 (data integrity)
 *  7. Long transcript (>10KB) → upstream body still valid JSON
 *  8. Multi-file: 2 ready files → upstream body has BOTH transcript tags
 *
 * Uses a different fake-nanobot port (18902) than ola.chat.fileref.test.js
 * (18901) to avoid pre-existing parallel-mode EADDRINUSE race (logged in
 * task.md Discovered tech debt).
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { globSync } = require('glob');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..');
const FAKE_NANOBOT_PORT = 18902;
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-transcript-test-'));
const adminAId = new mongoose.Types.ObjectId();

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
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(
          'data: ' +
          JSON.stringify({ choices: [{ delta: { content: 'ack' } }] }) +
          '\n\n'
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
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  lastUpstreamBody = null;
  for (const name of ['ChatSession', 'ChatMessage', 'File', 'Job']) {
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

async function makeFile(adminId, opts = {}) {
  const FileModel = mongoose.model('File');
  const originalName = opts.originalName || 'a.mp3';
  const sourcePath = path.join(TMP_DIR, `${adminId}-${Date.now()}-${Math.random()}-${originalName}`);
  fs.writeFileSync(sourcePath, Buffer.from([0xff, 0xfb, 0x90, 0x00]));
  return FileModel.create({
    createdBy: adminId,
    originalName,
    mimeType: 'audio/mpeg',
    sizeBytes: 1024,
    sourcePath,
  });
}

async function makeJob(adminId, fileDoc, statusOpts = {}) {
  const JobModel = mongoose.model('Job');
  const FileModel = mongoose.model('File');
  const job = await JobModel.create({
    createdBy: adminId,
    type: 'transcription',
    refModel: 'File',
    refId: fileDoc._id,
    status: statusOpts.status || 'done',
    result: statusOpts.result || {},
    error: statusOpts.error || '',
  });
  await FileModel.findByIdAndUpdate(fileDoc._id, { transcriptionJobId: job._id });
  return job;
}

function writeSidecar(fileDoc, transcript) {
  fs.writeFileSync(fileDoc.sourcePath + '.txt', transcript, 'utf-8');
}

test('1. Job.status=pending → 409 "转写中"', async () => {
  const file = await makeFile(adminAId);
  await makeJob(adminAId, file, { status: 'pending' });

  const app = buildChatApp(adminAId);
  const res = await request(app)
    .post('/api/ola/chat')
    .send({ message: 'analyze', fileIds: [file._id.toString()] });

  expect(res.statusCode).toBe(409);
  expect(res.body.success).toBe(false);
  expect(res.body.message).toMatch(/转写中/);
  expect(lastUpstreamBody).toBeNull(); // never reached nanobot
});

test('2. Job.status=running → 409 "转写中"', async () => {
  const file = await makeFile(adminAId);
  await makeJob(adminAId, file, { status: 'running' });

  const app = buildChatApp(adminAId);
  const res = await request(app)
    .post('/api/ola/chat')
    .send({ message: 'analyze', fileIds: [file._id.toString()] });

  expect(res.statusCode).toBe(409);
  expect(res.body.message).toMatch(/转写中/);
});

test('3. Job.status=failed → 422 with job.error surfaced', async () => {
  const file = await makeFile(adminAId);
  await makeJob(adminAId, file, { status: 'failed', error: 'OpenAI 401 invalid key' });

  const app = buildChatApp(adminAId);
  const res = await request(app)
    .post('/api/ola/chat')
    .send({ message: 'analyze', fileIds: [file._id.toString()] });

  expect(res.statusCode).toBe(422);
  expect(res.body.message).toMatch(/转写失败/);
  expect(res.body.message).toContain('OpenAI 401 invalid key');
});

test('4. Job.status=done but sidecar file missing on disk → 500 (data integrity)', async () => {
  const file = await makeFile(adminAId);
  await makeJob(adminAId, file, { status: 'done' });
  // Intentionally NOT writing sidecar — chat.js fs.readFile will ENOENT

  const app = buildChatApp(adminAId);
  const res = await request(app)
    .post('/api/ola/chat')
    .send({ message: 'analyze', fileIds: [file._id.toString()] });

  expect(res.statusCode).toBe(500);
  expect(res.body.message).toMatch(/Sidecar transcript 读取失败/);
  expect(res.body.message).toContain(file.originalName);
});

test('5. File.transcriptionJobId=null → 422 "无关联转写任务"', async () => {
  const file = await makeFile(adminAId);
  // Do NOT set transcriptionJobId (default null)

  const app = buildChatApp(adminAId);
  const res = await request(app)
    .post('/api/ola/chat')
    .send({ message: 'analyze', fileIds: [file._id.toString()] });

  expect(res.statusCode).toBe(422);
  expect(res.body.message).toMatch(/无关联转写任务/);
});

test('6. Job ref invalid (Job doc deleted under File) → 500 (data integrity)', async () => {
  const file = await makeFile(adminAId);
  const job = await makeJob(adminAId, file, { status: 'done' });
  writeSidecar(file, 'A 00:00  hi');
  // Now delete the Job to simulate orphaned reference
  await mongoose.model('Job').deleteOne({ _id: job._id });

  const app = buildChatApp(adminAId);
  const res = await request(app)
    .post('/api/ola/chat')
    .send({ message: 'analyze', fileIds: [file._id.toString()] });

  expect(res.statusCode).toBe(500);
  expect(res.body.message).toMatch(/任务记录缺失/);
});

test('7. Long transcript (>10KB) → upstream body still parses as JSON', async () => {
  const file = await makeFile(adminAId, { originalName: 'long.mp3' });
  await makeJob(adminAId, file, { status: 'done' });
  // 12KB transcript
  const longTranscript = Array.from({ length: 500 }, (_, i) =>
    `A 00:${String(i % 60).padStart(2, '0')}  说话片段 ${i} 内容比较长用来测试不会撑爆 user content`
  ).join('\n');
  writeSidecar(file, longTranscript);

  const app = buildChatApp(adminAId);
  const res = await request(app)
    .post('/api/ola/chat')
    .send({ message: '分析这段长录音', fileIds: [file._id.toString()] });

  expect(res.statusCode).toBe(200);
  expect(lastUpstreamBody).toBeTruthy();
  const parsed = JSON.parse(lastUpstreamBody); // must not throw
  expect(parsed.messages[0].content).toContain('[transcript of "long.mp3":');
  expect(parsed.messages[0].content.length).toBeGreaterThan(10000);
});

test('8. Multi-file: 2 ready files → both transcript tags in upstream body', async () => {
  const file1 = await makeFile(adminAId, { originalName: 'first.mp3' });
  const file2 = await makeFile(adminAId, { originalName: 'second.mp3' });
  await makeJob(adminAId, file1, { status: 'done' });
  await makeJob(adminAId, file2, { status: 'done' });
  writeSidecar(file1, 'A 00:00  first speaker says hello');
  writeSidecar(file2, 'B 00:00  second speaker says goodbye');

  const app = buildChatApp(adminAId);
  const res = await request(app)
    .post('/api/ola/chat')
    .send({
      message: '对比这两段录音',
      fileIds: [file1._id.toString(), file2._id.toString()],
    });

  expect(res.statusCode).toBe(200);
  const parsed = JSON.parse(lastUpstreamBody);
  const content = parsed.messages[0].content;
  expect(content).toContain('[transcript of "first.mp3":');
  expect(content).toContain('first speaker says hello');
  expect(content).toContain('[transcript of "second.mp3":');
  expect(content).toContain('second speaker says goodbye');
});

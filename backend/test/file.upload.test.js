/**
 * Tests for fileController/upload.js — POST /api/file/create multipart upload (#249 B1).
 *
 * Covers:
 *  - Happy path (valid audio mp3 → 200 + File._id + disk write)
 *  - LIMIT_FILE_SIZE (>100MB → 413)
 *  - Mime rejection (PDF / non-audio → 415)
 *  - Cross-tenant isolation (admin B reading admin A's fileId via /file/read → 404)
 *  - Disk path scope (sourcePath under uploads/<adminId>/)
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { globSync } = require('glob');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BACKEND_ROOT = path.join(__dirname, '..');
const TMP_UPLOADS = fs.mkdtempSync(path.join(os.tmpdir(), 'file-upload-test-'));

let mongo;
const adminAId = new mongoose.Types.ObjectId();
const adminBId = new mongoose.Types.ObjectId();

beforeAll(async () => {
  process.env.UPLOADS_DIR = TMP_UPLOADS;
  globSync('src/models/**/*.js', { cwd: BACKEND_ROOT }).forEach((f) =>
    require(path.join(BACKEND_ROOT, f))
  );
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120000);

afterAll(async () => {
  await new Promise((r) => setTimeout(r, 200));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  fs.rmSync(TMP_UPLOADS, { recursive: true, force: true });
});

beforeEach(async () => {
  if (mongoose.models.File) await mongoose.models.File.deleteMany({});
});

function buildApp(adminId) {
  const upload = require(
    path.join(BACKEND_ROOT, 'src/controllers/appControllers/fileController/upload')
  );
  const app = express();
  app.use((req, _res, next) => {
    req.admin = { _id: adminId };
    next();
  });
  app.post('/api/file/create', (req, res) => upload(req, res));
  return app;
}

function buildReadApp(adminId) {
  // Read uses createCRUDController's read which filters by createdBy.
  const fileController = require(
    path.join(BACKEND_ROOT, 'src/controllers/appControllers/fileController')
  );
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.admin = { _id: adminId };
    next();
  });
  app.get('/api/file/read/:id', (req, res) => fileController.read(req, res));
  return app;
}

describe('POST /api/file/create — happy path', () => {
  it('accepts an audio/mp3 buffer and returns File._id', async () => {
    const app = buildApp(adminAId);
    const fakeAudio = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x01, 0x02, 0x03, 0x04]); // mp3 frame header + bytes
    const res = await request(app)
      .post('/api/file/create')
      .attach('file', fakeAudio, { filename: 'hello.mp3', contentType: 'audio/mpeg' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result._id).toBeTruthy();
    expect(res.body.result.originalName).toBe('hello.mp3');
    expect(res.body.result.mimeType).toBe('audio/mpeg');
    expect(res.body.result.sizeBytes).toBe(fakeAudio.length);

    // Mongo persistence
    const FileModel = mongoose.model('File');
    const doc = await FileModel.findById(res.body.result._id);
    expect(doc).toBeTruthy();
    expect(doc.createdBy.toString()).toBe(adminAId.toString());

    // Disk write — under tenant-scoped path
    expect(doc.sourcePath.startsWith(TMP_UPLOADS)).toBe(true);
    expect(doc.sourcePath).toContain(`/${adminAId.toString()}/`);
    expect(fs.existsSync(doc.sourcePath)).toBe(true);
    expect(fs.readFileSync(doc.sourcePath)).toEqual(fakeAudio);
  });
});

describe('POST /api/file/create — rejections', () => {
  it('rejects files over 100MB with 413', async () => {
    const app = buildApp(adminAId);
    const overSize = Buffer.alloc(101 * 1024 * 1024, 0); // 101MB

    const res = await request(app)
      .post('/api/file/create')
      .attach('file', overSize, { filename: 'big.mp3', contentType: 'audio/mpeg' });

    expect(res.statusCode).toBe(413);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('100MB');
  });

  it('rejects non-audio mime with 415', async () => {
    const app = buildApp(adminAId);
    const fakePdf = Buffer.from('%PDF-1.4 fake pdf bytes');

    const res = await request(app)
      .post('/api/file/create')
      .attach('file', fakePdf, { filename: 'doc.pdf', contentType: 'application/pdf' });

    expect(res.statusCode).toBe(415);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('audio');
  });

  it('rejects request with no file field with 400', async () => {
    const app = buildApp(adminAId);
    const res = await request(app)
      .post('/api/file/create')
      .field('description', 'no file attached');

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('file');
  });
});

describe('Tenant isolation', () => {
  it('admin B cannot read admin A file via /file/read → 404', async () => {
    // Admin A uploads
    const appA = buildApp(adminAId);
    const audio = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
    const uploadRes = await request(appA)
      .post('/api/file/create')
      .attach('file', audio, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(uploadRes.statusCode).toBe(200);
    const fileId = uploadRes.body.result._id;

    // Admin B tries to read
    const appB = buildReadApp(adminBId);
    const readRes = await request(appB).get(`/api/file/read/${fileId}`);

    expect(readRes.statusCode).toBe(404);
    expect(readRes.body.success).toBe(false);

    // Admin A can still read their own
    const appARead = buildReadApp(adminAId);
    const ownRead = await request(appARead).get(`/api/file/read/${fileId}`);
    expect(ownRead.statusCode).toBe(200);
    expect(ownRead.body.success).toBe(true);
  });
});

describe('Disk path scope', () => {
  it('writes under uploads/<adminId>/YYYY/MM/ structure', async () => {
    const app = buildApp(adminAId);
    const audio = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
    const res = await request(app)
      .post('/api/file/create')
      .attach('file', audio, { filename: 'tenant-check.mp3', contentType: 'audio/mpeg' });

    const FileModel = mongoose.model('File');
    const doc = await FileModel.findById(res.body.result._id);
    const relative = path.relative(TMP_UPLOADS, doc.sourcePath);
    const parts = relative.split(path.sep);

    expect(parts[0]).toBe(adminAId.toString());
    expect(parts[1]).toMatch(/^\d{4}$/); // YYYY
    expect(parts[2]).toMatch(/^\d{2}$/); // MM
    expect(parts[3]).toMatch(/^[a-f0-9-]{36}\.mp3$/); // uuid.ext
  });
});

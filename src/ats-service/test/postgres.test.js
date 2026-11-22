import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createParser } from '../src/worker.js';
import { resumePdf } from './resume-fixture.js';

test('HTTP jobs and resume upload persist to PostgreSQL', { skip: process.env.RUN_DATABASE_TESTS !== '1' }, async () => {
  const { prisma } = await import('../../postgres/ats-db/src/prisma.ts');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const userId = randomUUID();
  const applicantUserId = randomUUID();
  const uploadDir = await mkdtemp(path.join(tmpdir(), 'ats-postgres-'));
  const app = createApp({ prisma, jwtPublicKey: publicKey, uploadDir,
    parseResume: createParser({ url: process.env.AI_PARSE_URL ?? 'http://ai-worker:8000/parse' }),
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/ats`;
  const authorization = `Bearer ${jwt.sign({ role: 'ROLE_HR' }, privateKey, { algorithm: 'RS256', subject: userId, expiresIn: '5m' })}`;
  let jobId;
  try {
    const created = await fetch(base + '/jobs', { method: 'POST', headers: { authorization, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Integration test', status: 'OPEN' }) });
    assert.equal(created.status, 201, await created.clone().text());
    const job = await created.json();
    jobId = job.id;
    assert.equal((await prisma.job.findUnique({ where: { id: jobId } })).createdBy, userId);
    assert.equal((await fetch(`${base}/jobs/${jobId}`)).status, 200);
    const updated = await fetch(`${base}/jobs/${jobId}`, { method: 'PATCH', headers: { authorization, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Updated integration test' }) });
    assert.equal(updated.status, 200, await updated.clone().text());
    assert.equal((await updated.json()).title, 'Updated integration test');
    const form = new FormData();
    form.append('file', new Blob([resumePdf()], { type: 'application/pdf' }), 'test.pdf');
    const uploaded = await fetch(base + '/resumes', { method: 'POST', headers: { authorization: `Bearer ${jwt.sign({ role: 'ROLE_APPLICANT' }, privateKey, { algorithm: 'RS256', subject: applicantUserId, expiresIn: '5m' })}` }, body: form });
    assert.equal(uploaded.status, 201, await uploaded.clone().text());
    const result = await uploaded.json();
    const resume = await prisma.resume.findUnique({ where: { id: result.resume.id }, include: { extraction: true } });
    assert.equal(resume.userId, applicantUserId);
    assert.equal(resume.extraction.rawText, 'Test resume content');
    assert.equal(resume.extraction.status, 'COMPLETED');
    assert.equal((await fetch(`${base}/jobs/${jobId}`, { method: 'DELETE', headers: { authorization } })).status, 204);
    assert.equal(await prisma.job.findUnique({ where: { id: jobId } }), null);
  } finally {
    await new Promise(resolve => server.close(resolve));
    try {
      await prisma.job.deleteMany({ where: { createdBy: userId } });
      await prisma.resume.deleteMany({ where: { userId: applicantUserId } });
    } finally {
      await prisma.$disconnect();
      await rm(uploadDir, { recursive: true, force: true });
    }
  }
});

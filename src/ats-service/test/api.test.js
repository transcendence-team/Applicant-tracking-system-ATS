import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createParser } from '../src/worker.js';

const secret = 'test-secret-with-at-least-32-bytes';
const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const otherId = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
const token = (role = 'ROLE_HR', sub = userId) => jwt.sign({ role }, secret, { subject: sub, expiresIn: '1h' });

async function fixture(t, { prisma = {}, parseResume = async () => ({ candidate: { firstName: 'Ada' }, rawText: 'Resume text' }) } = {}) {
  const uploadDir = await mkdtemp(path.join(tmpdir(), 'ats-test-'));
  const app = createApp({ prisma, jwtSecret: secret, parseResume, uploadDir });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(uploadDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}/api/ats`;
  return { uploadDir, request: (route, options) => fetch(base + route, options) };
}
function json(method, body, bearer = token()) {
  return { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` }, body: JSON.stringify(body) };
}
function pdf(contents = '%PDF-1.7\nTest resume', type = 'application/pdf', filename = 'resume.pdf') {
  const form = new FormData();
  form.append('file', new Blob([contents], { type }), filename);
  return { method: 'POST', headers: { Authorization: `Bearer ${token('ROLE_APPLICANT')}` }, body: form };
}

test('job writes reject missing, invalid, expired, and applicant tokens', async t => {
  const { request } = await fixture(t);
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const route = method === 'POST' ? '/jobs' : '/jobs/1';
    assert.equal((await request(route, { method })).status, 401);
    assert.equal((await request(route, json(method, {}, 'invalid'))).status, 401);
    assert.equal((await request(route, json(method, {}, jwt.sign({ role: 'ROLE_HR' }, secret, { subject: userId, expiresIn: -1 })))).status, 401);
    assert.equal((await request(route, json(method, {}, token('ROLE_APPLICANT')))).status, 403);
  }
});

test('job CRUD uses signed identity, pagination, ownership and salary validation', async t => {
  const jobs = [];
  const prisma = { job: {
    create: async ({ data }) => { const job = { id: 1, ...data }; jobs.push(job); return job; },
    findMany: async ({ where }) => jobs.filter(j => j.status === where.status),
    count: async () => jobs.length,
    findFirst: async ({ where }) => jobs.find(j => j.id === where.id && j.status === where.status) ?? null,
    findUnique: async () => jobs[0] ?? null,
    update: async ({ data }) => Object.assign(jobs[0], data),
    delete: async () => jobs.pop(),
  }, application: { count: async () => 0 } };
  prisma.$transaction = async action => typeof action === 'function' ? action(prisma) : Promise.all(action);
  const { request } = await fixture(t, { prisma });
  assert.equal((await request('/jobs', json('POST', { title: 'Engineer', createdBy: otherId }))).status, 400);
  assert.equal((await request('/jobs', json('POST', { title: ' ' }))).status, 400);
  assert.equal((await request('/jobs', json('POST', { title: 'Engineer', salaryMin: 20, salaryMax: 10 }))).status, 400);
  const created = await request('/jobs', json('POST', { title: 'Engineer', status: 'OPEN', salaryMin: 10, salaryMax: 20 }));
  assert.equal(created.status, 201);
  assert.equal((await created.json()).createdBy, userId);
  assert.equal((await (await request('/jobs')).json()).items.length, 1);
  assert.equal((await request('/jobs/1')).status, 200);
  assert.equal((await request('/jobs/nope')).status, 400);
  assert.equal((await request('/jobs?page=0')).status, 400);
  assert.equal((await request('/jobs/1', json('PATCH', { title: 'Other' }, token('ROLE_HR', otherId)))).status, 403);
  assert.equal((await request('/jobs/1', json('PATCH', { salaryMin: 30 }))).status, 400);
  assert.equal((await request('/jobs/1', json('PATCH', { title: 'Updated' }))).status, 200);
  assert.equal((await request('/jobs/1', { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })).status, 204);
  assert.equal((await request('/jobs/1')).status, 404);
});

test('jobs with applications cannot be deleted', async t => {
  const prisma = { job: { findUnique: async () => ({ createdBy: userId }) }, application: { count: async () => 1 } };
  prisma.$transaction = fn => fn(prisma);
  const { request } = await fixture(t, { prisma });
  assert.equal((await request('/jobs/1', { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })).status, 409);
});

test('resume upload persists candidate identity, PDF and completed extraction', async t => {
  let savedCandidate, savedResume;
  const tx = {
    candidateProfile: { upsert: async args => { savedCandidate = args; return { id: 7, ...args.create }; } },
    resume: { create: async args => { savedResume = args.data; return { id: 8, candidateId: 7 }; } },
  };
  const { request, uploadDir } = await fixture(t, { prisma: { $transaction: fn => fn(tx) } });
  const response = await request('/resumes', pdf());
  assert.equal(response.status, 201);
  assert.equal(savedCandidate.create.userId, userId);
  assert.equal(savedResume.extraction.create.status, 'COMPLETED');
  assert.equal(savedResume.extraction.create.rawText, 'Resume text');
  assert.equal((await readdir(uploadDir)).length, 1);
});

test('invalid PDF, oversized file and staff uploads are rejected before parsing', async t => {
  const { request } = await fixture(t, { parseResume: async () => { assert.fail('must not parse invalid uploads'); } });
  assert.equal((await request('/resumes', pdf('not a PDF'))).status, 400);
  assert.equal((await request('/resumes', pdf('text', 'text/plain', 'resume.txt'))).status, 415);
  assert.equal((await request('/resumes', pdf('%PDF-' + 'x'.repeat(10 * 1024 * 1024)))).status, 413);
  const options = pdf();
  options.headers.Authorization = `Bearer ${token('ROLE_HR')}`;
  assert.equal((await request('/resumes', options)).status, 403);
});

test('database failure cleans up stored PDF', async t => {
  const { request, uploadDir } = await fixture(t, { prisma: { $transaction: async () => { throw new Error('DB failed'); } } });
  assert.equal((await request('/resumes', pdf())).status, 500);
  assert.deepEqual(await readdir(uploadDir), []);
});

test('worker client forwards multipart PDF and validates the JSON contract', async () => {
  const parse = createParser({ url: 'http://ai-worker:8000/parse', fetchImpl: async (url, options) => {
    assert.equal(url.pathname, '/parse');
    assert.equal(options.headers.Authorization, 'Bearer candidate');
    assert.equal(options.body.get('file').type, 'application/pdf');
    return Response.json({ candidate: { firstName: 'Ada' }, rawText: 'Parsed PDF' });
  } });
  assert.equal((await parse({ buffer: Buffer.from('%PDF-') }, 'Bearer candidate')).candidate.firstName, 'Ada');
  for (const response of [Response.json({ unexpected: true }), new Response('not JSON'), new Response('', { status: 500 })]) {
    const invalid = createParser({ url: 'http://ai-worker:8000/parse', fetchImpl: async () => response });
    await assert.rejects(invalid({ buffer: Buffer.from('%PDF-') }), error => error.status === 502);
  }
  const timeout = createParser({ url: 'http://ai-worker:8000/parse', fetchImpl: async () => { throw new DOMException('timed out', 'TimeoutError'); } });
  await assert.rejects(timeout({ buffer: Buffer.from('%PDF-') }), error => error.status === 504);
});

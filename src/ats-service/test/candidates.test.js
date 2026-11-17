import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';

const secret = 'candidate-tests-secret-at-least-32-bytes';
const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
async function fixture(t, prisma = {}) {
  const server = createApp({ prisma, jwtSecret: secret }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return (route, method = 'GET', body, role = 'ROLE_APPLICANT') => fetch(`http://127.0.0.1:${server.address().port}/api/ats${route}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ role }, secret, { subject: userId, expiresIn: '1h' })}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('candidate routes require applicant role', async t => {
  const request = await fixture(t);
  for (const [route, method] of [['/candidates/me', 'GET'], ['/candidates/me', 'PATCH'], ['/applications', 'POST'], ['/applications', 'GET'], ['/applications/1', 'GET']]) {
    assert.equal((await request(route, method, undefined, 'ROLE_HR')).status, 403);
  }
});

test('profile updates bind identity to JWT and reject protected fields and unsafe URLs', async t => {
  let profile;
  const request = await fixture(t, { candidateProfile: {
    findUnique: async ({ where }) => { assert.equal(where.userId, userId); return profile; },
    upsert: async ({ create, update, where }) => { assert.equal(where.userId, userId); profile = { ...profile, ...create, ...update }; return profile; },
  } });
  assert.equal((await request('/candidates/me')).status, 404);
  for (const body of [{}, { userId: 'someone' }, { githubUrl: 'javascript:alert(1)' }]) {
    assert.equal((await request('/candidates/me', 'PATCH', body)).status, 400);
  }
  assert.equal((await request('/candidates/me', 'PATCH', { firstName: 'Ada', bio: 'Engineer' })).status, 200);
  assert.equal((await request('/candidates/me', 'PATCH', { bio: null })).status, 200);
  const saved = await (await request('/candidates/me')).json();
  assert.equal(saved.userId, userId);
  assert.equal(saved.firstName, 'Ada');
  assert.equal(saved.bio, null);
});

test('application submission enforces job eligibility, resume ownership, uniqueness and initial status', async t => {
  let job = { status: 'OPEN' }, resume = { id: 2 }, existing = null, status = { id: 3 }, saved;
  const prisma = {
    candidateProfile: { findUnique: async ({ where }) => { assert.equal(where.userId, userId); return { id: 7 }; } },
    job: { findUnique: async () => job },
    resume: { findFirst: async ({ where }) => { assert.deepEqual(where, { id: 2, candidateId: 7, deletedAt: null }); return resume; } },
    applicationStatus: { findUnique: async ({ where }) => { assert.equal(where.name, 'Applied'); return status; } },
    application: {
      findUnique: async () => existing,
      create: async ({ data }) => { saved = data; return { id: 9, status: { name: 'Applied' } }; },
    },
  };
  prisma.$transaction = fn => fn(prisma);
  const request = await fixture(t, prisma);
  const submit = body => request('/applications', 'POST', body ?? { jobId: 1, resumeId: 2 });
  assert.equal((await submit({ jobId: 1, resumeId: 2, statusId: 99 })).status, 400);
  assert.equal((await submit({ jobId: -1, resumeId: 2 })).status, 400);
  assert.equal((await submit()).status, 201);
  assert.equal(saved.candidateId, 7);
  assert.equal(saved.statusId, 3);
  assert.deepEqual(saved.history.create, { toStatusId: 3, changedBy: userId });
  job = { status: 'CLOSED' };
  assert.equal((await submit()).status, 404);
  job = { status: 'OPEN', deadline: new Date(0) };
  assert.equal((await submit()).status, 409);
  job = { status: 'OPEN' }; resume = null;
  assert.equal((await submit()).status, 404);
  resume = { id: 2 }; existing = { id: 9 };
  assert.equal((await submit()).status, 409);
  existing = null; status = null;
  assert.equal((await submit()).status, 503);
});

test('application reads scope queries to signed identity and paginate without exposing resume storage', async t => {
  const prisma = { application: {
    findMany: async ({ where, skip, take, select }) => {
      assert.deepEqual(where, { candidate: { userId } });
      assert.equal(skip, 2); assert.equal(take, 2);
      assert.equal(select.resume.select.storagePath, undefined);
      return [{ id: 1, status: { name: 'Applied' } }];
    },
    count: async ({ where }) => { assert.deepEqual(where, { candidate: { userId } }); return 3; },
    findFirst: async ({ where }) => { assert.equal(where.candidate.userId, userId); return null; },
  } };
  prisma.$transaction = actions => Promise.all(actions);
  const request = await fixture(t, prisma);
  const response = await request('/applications?page=2&limit=2');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).total, 3);
  assert.equal((await request('/applications?page=0')).status, 400);
  assert.equal((await request('/applications/99')).status, 404);
  assert.equal((await request('/applications/nope')).status, 400);
});

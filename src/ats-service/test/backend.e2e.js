// Run inside ats-api: npx tsx test/backend.e2e.js
// Creates disposable auth accounts; removes ATS records and uploaded test files.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { prisma } from '../../postgres/ats-db/src/prisma.ts';
import { createApp } from '../src/app.js';

const run = Date.now();
const password = `Test-${randomUUID()}!`;
const accounts = [];
const users = [];
let checks = 0;
let server;
const uploadDir = await mkdtemp(path.join(tmpdir(), 'ats-e2e-'));
async function request(base, route, expected, { token, body, method = 'GET', form } = {}) {
  const response = await fetch(`${base}${route}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: form ?? (body ? JSON.stringify(body) : undefined),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  assert.equal(response.status, expected, `${method} ${route}: ${text}`);
  checks++;
  console.log(`PASS ${method} ${route}: ${expected}`);
  try { return JSON.parse(text); } catch { return text; }
}
const auth = 'http://auth-api:8080/api/auth';
const live = 'http://ats-api:3000/api/ats';
async function login(email, pass = password) {
  return (await request(auth, '/login', 200, { method: 'POST', body: { email, password: pass } })).accessToken;
}
function record(email, token) {
  const id = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub;
  users.push(id);
  accounts.push(email);
  return token;
}
try {
  await request(live, '/health', 200);
  await request(auth, '/register', 400, { method: 'POST', body: { email: 'invalid', password: 'x' } });
  const email = `e2e-applicant-${run}@example.com`;
  await request(auth, '/register', 201, { method: 'POST', body: { email, password } });
  await request(auth, '/register', 409, { method: 'POST', body: { email, password } });
  await request(auth, '/login', 401, { method: 'POST', body: { email, password: 'wrong' } });
  const applicant = record(email, await login(email));
  await request(auth, '/me', 200, { token: applicant });
  await request(auth, '/me', 401);
  await request(auth, '/create-user', 403, { token: applicant, method: 'POST', body: { email: `forbidden-${run}@example.com`, password, role: 'ROLE_HR' } });
  const admin = await login(process.env.ADMIN_EMAIL ?? 'admin@ats.com', process.env.ADMIN_PASSWORD ?? 'admin123');
  const hrEmail = `e2e-hr-${run}@example.com`;
  await request(auth, '/create-user', 201, { token: admin, method: 'POST', body: { email: hrEmail, password, role: 'ROLE_HR' } });
  const hr = record(hrEmail, await login(hrEmail));
  const otherEmail = `e2e-other-${run}@example.com`;
  await request(auth, '/register', 201, { method: 'POST', body: { email: otherEmail, password } });
  const other = record(otherEmail, await login(otherEmail));
  await request(live, '/candidates/me', 401);
  await request(live, '/candidates/me', 401, { token: 'invalid' });
  await request(live, '/candidates/me', 403, { token: hr });
  await request(live, '/candidates/me', 404, { token: applicant });
  await request(live, '/candidates/me', 200, { token: applicant, method: 'PATCH', body: { firstName: 'Integration', lastName: 'Applicant' } });
  await request(live, '/candidates/me', 200, { token: applicant });
  await request(live, '/candidates/me', 400, { token: applicant, method: 'PATCH', body: { userId: randomUUID() } });
  await request(live, '/jobs', 403, { token: applicant, method: 'POST', body: { title: 'Forbidden' } });
  const job = await request(live, '/jobs', 201, { token: hr, method: 'POST', body: { title: `E2E ${run}`, status: 'OPEN' } });
  await request(live, '/jobs?page=1&limit=20', 200);
  await request(live, `/jobs/${job.id}`, 200);
  await request(live, `/jobs/${job.id}`, 200, { token: hr, method: 'PATCH', body: { title: `Updated E2E ${run}` } });
  await request(live, `/jobs/${job.id}`, 400, { token: hr, method: 'PATCH', body: { salaryMin: 200, salaryMax: 100 } });
  const invalidPdf = new FormData();
  invalidPdf.append('file', new Blob(['not a PDF'], { type: 'application/pdf' }), 'invalid.pdf');
  await request(live, '/resumes', 400, { token: applicant, method: 'POST', form: invalidPdf });
  // Exercise the real configured parser separately; absence is an external dependency.
  const realPdf = new FormData();
  realPdf.append('file', new Blob(['%PDF-1.7\nE2E fixture'], { type: 'application/pdf' }), 'fixture.pdf');
  const realResponse = await fetch(`${live}/resumes`, { method: 'POST', headers: { Authorization: `Bearer ${applicant}` }, body: realPdf, signal: AbortSignal.timeout(65000) });
  console.log(`LIVE PARSER: ${realResponse.status} ${await realResponse.text()}`);
  // Isolate only the external parser: JWTs, HTTP handlers, disk and PostgreSQL stay real.
  const app = createApp({ prisma, jwtSecret: process.env.JWT_SECRET, uploadDir, parseResume: async () => ({ candidate: { firstName: 'Integration' }, rawText: 'Backend test resume', parserVersion: 'e2e-stub' }) });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const isolated = `http://127.0.0.1:${server.address().port}/api/ats`;
  const form = new FormData();
  form.append('file', new Blob(['%PDF-1.7\nE2E fixture'], { type: 'application/pdf' }), 'fixture.pdf');
  const uploaded = await request(isolated, '/resumes', 201, { token: applicant, method: 'POST', form });
  const submission = { jobId: job.id, resumeId: uploaded.resume.id, coverLetter: 'E2E test' };
  await request(live, '/applications', 404, { token: other, method: 'POST', body: submission });
  const application = await request(live, '/applications', 201, { token: applicant, method: 'POST', body: submission });
  assert.equal(application.status.name, 'Applied');
  await request(live, '/applications', 409, { token: applicant, method: 'POST', body: submission });
  await request(live, '/applications', 200, { token: applicant });
  await request(live, `/applications/${application.id}`, 200, { token: applicant });
  await request(live, `/applications/${application.id}`, 404, { token: other });
  await request(live, `/jobs/${job.id}`, 409, { token: hr, method: 'DELETE' });
  await request(live, `/jobs/${job.id}`, 200, { token: hr, method: 'PATCH', body: { status: 'ARCHIVED' } });
  await request(live, `/jobs/${job.id}`, 404);
  const disposable = await request(live, '/jobs', 201, { token: hr, method: 'POST', body: { title: 'Delete test' } });
  await request(live, `/jobs/${disposable.id}`, 204, { token: hr, method: 'DELETE' });
  const newPassword = `${password}-changed`;
  await request(auth, '/change-password', 200, { token: applicant, method: 'POST', body: { currentPassword: password, newPassword } });
  await request(auth, '/login', 401, { method: 'POST', body: { email, password } });
  await login(email, newPassword);
  console.log(`SUCCESS: ${checks} HTTP checks passed.`);
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await prisma.application.deleteMany({ where: { candidate: { userId: { in: users } } } });
  await prisma.job.deleteMany({ where: { createdBy: { in: users } } });
  await prisma.candidateProfile.deleteMany({ where: { userId: { in: users } } });
  await prisma.$disconnect();
  await rm(uploadDir, { recursive: true, force: true });
  console.log('ATS test records cleaned. Created auth accounts:', accounts.join(', '));
}

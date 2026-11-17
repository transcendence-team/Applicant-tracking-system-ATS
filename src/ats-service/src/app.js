import express from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { authenticateJwt } from './auth.js';
import { ApiError } from './errors.js';
import { jobsRouter } from './jobs.js';
import { resumesRouter } from './resumes.js';
import { candidatesRouter } from './candidates.js';
import { applicationsRouter } from './applications.js';

export function createApp({ prisma, jwtSecret, parseResume, uploadDir }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '128kb' }));
  const auth = authenticateJwt(jwtSecret);
  app.get('/api/ats/health', async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });
  app.use('/api/ats/jobs', jobsRouter(prisma, auth));
  app.use('/api/ats/resumes', resumesRouter({ prisma, auth, parseResume, uploadDir }));
  app.use('/api/ats/candidates', candidatesRouter(prisma, auth));
  app.use('/api/ats/applications', applicationsRouter(prisma, auth));
  app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'Route not found.')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ZodError) return res.status(400).json({ error: 'VALIDATION_FAILED', message: error.issues.map(v => `${v.path.join('.')}: ${v.message}`).join('; ') });
    if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code, message: error.message });
    if (error instanceof ApiError) return res.status(error.status).json({ error: error.code, message: error.message });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'MALFORMED_JSON', message: 'Invalid JSON body.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'BODY_TOO_LARGE', message: 'Request body is too large.' });
    const dbErrors = {
      P2025: [404, 'NOT_FOUND', 'Record not found.'],
      P2002: [409, 'CONFLICT', 'A record with these unique fields already exists.'],
      P2003: [409, 'RELATED_RECORD', 'A related record prevents this operation.'],
      P2034: [409, 'CONCURRENT_UPDATE', 'The record changed concurrently. Retry the request.'],
    };
    if (dbErrors[error.code]) {
      const [status, code, message] = dbErrors[error.code];
      return res.status(status).json({ error: code, message });
    }
    console.error('ATS request failed:', error.code ?? error.name);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
  });
  return app;
}

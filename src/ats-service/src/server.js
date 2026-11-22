import 'dotenv/config';
import { prisma } from '../../postgres/ats-db/src/prisma.ts';
import { createApp } from './app.js';
import { createParser } from './worker.js';

const timeoutMs = Number(process.env.AI_TIMEOUT_MS ?? 60000);
if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) throw new Error('Invalid AI_TIMEOUT_MS.');
const app = createApp({
  prisma, jwtPublicKey: process.env.JWT_PUBLIC_KEY,
  uploadDir: process.env.UPLOAD_DIR ?? '/data/resumes',
  parseResume: createParser({ url: process.env.AI_PARSE_URL ?? 'http://ai-worker:8000/parse', timeoutMs }),
});
await prisma.$connect();
const server = app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    const timer = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      await prisma.$disconnect();
      clearTimeout(timer);
      process.exit(0);
    });
  });
}

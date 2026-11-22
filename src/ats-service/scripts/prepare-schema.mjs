import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const schema = process.env.ATS_SCHEMA_PATH
  ?? fileURLToPath(new URL('../../postgres/ats-db/prisma/schema.prisma', import.meta.url));
const target = new URL('../prisma/', import.meta.url);

await mkdir(target, { recursive: true });
await copyFile(schema, new URL('schema.prisma', target));

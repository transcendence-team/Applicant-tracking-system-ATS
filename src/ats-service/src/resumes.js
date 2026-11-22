import { Router } from 'express';
import multer from 'multer';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from './errors.js';
import { requireRole } from './auth.js';

export function resumesRouter({ prisma, auth, parseResume, uploadDir }) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    fileFilter(req, file, callback) {
      if (file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname)) {
        return callback(new ApiError(415, 'PDF_REQUIRED', 'Upload a PDF using the file field.'));
      }
      callback(null, true);
    },
  });
  router.post('/', auth, requireRole('ROLE_APPLICANT'), upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file || file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new ApiError(400, 'INVALID_PDF', 'A PDF file with a valid PDF header is required.');
    }
    const parsed = await parseResume(file, req.headers.authorization);
    await mkdir(uploadDir, { recursive: true });
    const filename = `${randomUUID()}.pdf`;
    const storagePath = path.join(uploadDir, filename);
    await writeFile(storagePath, file.buffer, { flag: 'wx', mode: 0o600 });
    try {
      const result = await prisma.$transaction(async tx => {
        // The identity always comes from the signed token, never from worker output.
        const resume = await tx.resume.create({ data: {
          userId: req.user.sub,
          originalFilename: file.originalname,
          storagePath: filename,
          mimeType: 'application/pdf',
          fileSize: file.size,
          fileHash: createHash('sha256').update(file.buffer).digest('hex'),
          extraction: { create: {
            rawText: parsed.rawText,
            parserVersion: parsed.parserVersion,
            status: 'COMPLETED', extractedAt: new Date(),
          } },
        }, select: { id: true, userId: true, originalFilename: true, uploadedAt: true } });
        return { resume };
      });
      res.status(201).json(result);
    } catch (error) {
      await unlink(storagePath).catch(cleanupError => console.error('Failed to clean up resume file:', cleanupError.code));
      throw error;
    }
  });
  return router;
}

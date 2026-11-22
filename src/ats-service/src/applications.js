import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './auth.js';
import { ApiError } from './errors.js';

const id = z.number().int().positive().max(2147483647);
const submission = z.object({
  jobId: id, resumeId: id, coverLetter: z.string().max(10000).optional(),
}).strict();
const select = {
  id: true, jobId: true, userId: true, resumeId: true, coverLetter: true,
  appliedAt: true, updatedAt: true,
  job: { select: { id: true, title: true, location: true, employmentType: true, status: true } },
  status: { select: { id: true, name: true, position: true, isTerminal: true } },
  resume: { select: { id: true, originalFilename: true, uploadedAt: true } },
};

export function applicationsRouter(prisma, auth) {
  const router = Router();
  router.use(auth, requireRole('ROLE_APPLICANT'));
  router.post('/', async (req, res) => {
    const data = submission.parse(req.body);
    const application = await prisma.$transaction(async tx => {
      const job = await tx.job.findUnique({ where: { id: data.jobId } });
      if (!job || job.status !== 'OPEN') throw new ApiError(404, 'JOB_NOT_FOUND', 'Open job not found.');
      if (job.deadline && job.deadline <= new Date()) throw new ApiError(409, 'JOB_DEADLINE_PASSED', 'The application deadline has passed.');
      const resume = await tx.resume.findFirst({ where: { id: data.resumeId, userId: req.user.sub, deletedAt: null } });
      if (!resume) throw new ApiError(404, 'RESUME_NOT_FOUND', 'Your resume was not found.');
      const existing = await tx.application.findUnique({ where: { jobId_userId: { jobId: data.jobId, userId: req.user.sub } } });
      if (existing) throw new ApiError(409, 'ALREADY_APPLIED', 'You have already applied for this job.');
      const status = await tx.applicationStatus.findUnique({ where: { name: 'Applied' } });
      if (!status) throw new ApiError(503, 'STATUS_NOT_CONFIGURED', 'Seed application statuses before accepting applications.');
      return tx.application.create({ data: {
        ...data, userId: req.user.sub, statusId: status.id,
        history: { create: { toStatusId: status.id, changedBy: req.user.sub } },
      }, select });
    }, { isolationLevel: 'Serializable' });
    res.status(201).json(application);
  });
  router.get('/', async (req, res) => {
    const query = z.object({
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).strict().parse(req.query);
    const where = { userId: req.user.sub };
    const [items, total] = await prisma.$transaction([
      prisma.application.findMany({ where, select, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { id: 'desc' } }),
      prisma.application.count({ where }),
    ]);
    res.json({ items, total, ...query });
  });
  router.get('/:id', async (req, res) => {
    const application = await prisma.application.findFirst({
      where: { id: z.coerce.number().pipe(id).parse(req.params.id), userId: req.user.sub }, select,
    });
    if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found.');
    res.json(application);
  });
  return router;
}

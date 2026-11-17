import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './auth.js';
import { ApiError } from './errors.js';

const id = z.coerce.number().int().positive().max(2147483647);
const salary = z.number().int().min(0).max(2147483647).nullable().optional();
const fields = z.object({
  title: z.string().trim().min(1).max(250),
  description: z.string().max(100000).nullable().optional(),
  location: z.string().trim().max(250).nullable().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).nullable().optional(),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED']).optional(),
  salaryMin: salary,
  salaryMax: salary,
  publishedAt: z.iso.datetime({ offset: true }).transform(v => new Date(v)).nullable().optional(),
  deadline: z.iso.datetime({ offset: true }).transform(v => new Date(v)).nullable().optional(),
}).strict();

function checkSalary(job) {
  if (job.salaryMin != null && job.salaryMax != null && job.salaryMin > job.salaryMax) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'salaryMin must not exceed salaryMax.');
  }
}

export function jobsRouter(prisma, auth) {
  const router = Router();
  const staff = [auth, requireRole('ROLE_HR', 'ROLE_ADMIN')];
  router.get('/', async (req, res) => {
    const query = z.object({
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).strict().parse(req.query);
    const where = { status: 'OPEN' };
    const [items, total] = await prisma.$transaction([
      prisma.job.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { id: 'desc' } }),
      prisma.job.count({ where }),
    ]);
    res.json({ items, total, ...query });
  });
  router.get('/:id', async (req, res) => {
    const job = await prisma.job.findFirst({ where: { id: id.parse(req.params.id), status: 'OPEN' } });
    if (!job) throw new ApiError(404, 'JOB_NOT_FOUND', 'Job not found.');
    res.json(job);
  });
  router.post('/', ...staff, async (req, res) => {
    const data = fields.parse(req.body);
    checkSalary(data);
    const job = await prisma.job.create({ data: { ...data, createdBy: req.user.sub } });
    res.status(201).json(job);
  });
  router.patch('/:id', ...staff, async (req, res) => {
    const jobId = id.parse(req.params.id);
    const data = fields.partial().refine(v => Object.keys(v).length > 0, 'Provide at least one field.').parse(req.body);
    const job = await prisma.$transaction(async tx => {
      const current = await tx.job.findUnique({ where: { id: jobId } });
      if (!current) throw new ApiError(404, 'JOB_NOT_FOUND', 'Job not found.');
      if (req.user.role !== 'ROLE_ADMIN' && current.createdBy !== req.user.sub) {
        throw new ApiError(403, 'FORBIDDEN', 'Only the creator or an admin may edit this job.');
      }
      checkSalary({ ...current, ...data });
      return tx.job.update({ where: { id: jobId }, data });
    }, { isolationLevel: 'Serializable' });
    res.json(job);
  });
  router.delete('/:id', ...staff, async (req, res) => {
    await prisma.$transaction(async tx => {
      const jobId = id.parse(req.params.id);
      const job = await tx.job.findUnique({ where: { id: jobId } });
      if (!job) throw new ApiError(404, 'JOB_NOT_FOUND', 'Job not found.');
      if (req.user.role !== 'ROLE_ADMIN' && job.createdBy !== req.user.sub) {
        throw new ApiError(403, 'FORBIDDEN', 'Only the creator or an admin may delete this job.');
      }
      if (await tx.application.count({ where: { jobId } })) {
        throw new ApiError(409, 'JOB_HAS_APPLICATIONS', 'Archive jobs with applications instead of deleting them.');
      }
      await tx.job.delete({ where: { id: jobId } });
    }, { isolationLevel: 'Serializable' });
    res.status(204).end();
  });
  return router;
}

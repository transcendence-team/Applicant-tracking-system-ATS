import { Router, type ErrorRequestHandler, type RequestHandler } from 'express';
import { EmploymentType, JobStatus } from './generated/prisma/enums.js';
import { Prisma } from './generated/prisma/client.js';
import { verifyToken, type AuthRequest } from './middleware/verifyToken.js';
import { prisma } from './prisma.js';

const maxInt = 2_147_483_647;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

class JobError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) {
        super(message);
    }
}

function invalid(message: string): never {
    throw new JobError(400, 'VALIDATION_FAILED', message);
}

function notFound(): never {
    throw new JobError(404, 'JOB_NOT_FOUND', 'Job not found.');
}

function integer(value: unknown, field: string, max = maxInt): number {
    if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) {
        invalid(`${field} must be a positive integer up to ${max}.`);
    }
    return Number(value);
}

function text(value: unknown, field: string, max: number): string {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > max || value.includes('\0')) {
        invalid(`${field} must contain between 1 and ${max} characters.`);
    }
    return value.trim();
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
    const match = allowed.find(option => option === value);
    if (!match) invalid(`Invalid ${field}.`);
    return match;
}

function salary(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > maxInt) {
        invalid(`${field} must be an integer between 0 and ${maxInt}.`);
    }
    return value;
}

function timestamp(value: unknown, field: string): Date {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
        invalid(`${field} must be an ISO 8601 timestamp with a timezone.`);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) invalid(`Invalid ${field}.`);
    return date;
}

type JobFields = Omit<Prisma.JobUncheckedCreateInput,
    'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'recruiters' | 'skills' | 'applications'>;

function jobFields(body: unknown): Partial<JobFields> {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
        invalid('Provide a JSON object containing job fields.');
    }
    const result: Partial<JobFields> = {};
    for (const [key, value] of Object.entries(body)) {
        switch (key) {
            case 'title': result.title = text(value, key, 250); break;
            case 'description': result.description = value === null ? null : text(value, key, 100_000); break;
            case 'location': result.location = value === null ? null : text(value, key, 250); break;
            case 'employmentType':
                result.employmentType = value === null ? null : enumValue(value, Object.values(EmploymentType), key);
                break;
            case 'status': result.status = enumValue(value, Object.values(JobStatus), key); break;
            case 'salaryMin':
            case 'salaryMax': result[key] = value === null ? null : salary(value, key); break;
            case 'publishedAt':
            case 'deadline': result[key] = value === null ? null : timestamp(value, key); break;
            default: invalid(`Unknown job field: ${key}.`);
        }
    }
    return result;
}

function checkSalary({ salaryMin, salaryMax }: Pick<JobFields, 'salaryMin' | 'salaryMax'>) {
    if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
        invalid('salaryMin must not exceed salaryMax.');
    }
}

function isStaff(user: AuthRequest['user']): user is NonNullable<AuthRequest['user']> {
    return !!user && uuid.test(user.sub) && (user.role === 'ROLE_HR' || user.role === 'ROLE_ADMIN');
}

function staffUser(req: AuthRequest) {
    if (!isStaff(req.user)) throw new JobError(403, 'FORBIDDEN', 'HR or admin access is required.');
    return req.user;
}

function canManage(req: AuthRequest, createdBy: string) {
    const user = staffUser(req);
    if (user.role !== 'ROLE_ADMIN' && user.sub.toLowerCase() !== createdBy) {
        throw new JobError(403, 'FORBIDDEN', 'Only the job creator or an admin can modify this job.');
    }
}

const optionalToken: RequestHandler = (req, res, next) => {
    if (req.headers.authorization === undefined) next();
    else verifyToken(req, res, next);
};

function visibleJobs(req: AuthRequest): Prisma.JobWhereInput {
    return isStaff(req.user) ? {} : { status: JobStatus.OPEN };
}

export const jobsRouter = Router();

jobsRouter.get('/', optionalToken, async (req, res) => {
    const page = integer(req.query.page ?? '1', 'page', 100_000);
    const limit = integer(req.query.limit ?? '20', 'limit', 100);
    const where = visibleJobs(req);
    const [items, total] = await prisma.$transaction([
        prisma.job.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { id: 'desc' } }),
        prisma.job.count({ where }),
    ], { isolationLevel: 'RepeatableRead' });
    res.json({ items, total, page, limit });
});

jobsRouter.get('/:id', optionalToken, async (req, res) => {
    const id = integer(req.params.id, 'id');
    const job = await prisma.job.findFirst({ where: { id, ...visibleJobs(req) } });
    if (!job) notFound();
    res.json(job);
});

jobsRouter.post('/', verifyToken, async (req, res) => {
    const user = staffUser(req);
    const { title, ...fields } = jobFields(req.body);
    if (!title) invalid('title is required.');
    checkSalary(fields);
    const job = await prisma.job.create({ data: { title, ...fields, createdBy: user.sub } });
    res.location(`/api/ats/jobs/${job.id}`).status(201).json(job);
});

jobsRouter.patch('/:id', verifyToken, async (req, res) => {
    staffUser(req);
    const id = integer(req.params.id, 'id');
    const data = jobFields(req.body);
    const job = await prisma.$transaction(async tx => {
        const current = await tx.job.findUnique({ where: { id } });
        if (!current) notFound();
        canManage(req, current.createdBy);
        checkSalary({ ...current, ...data });
        return tx.job.update({ where: { id }, data });
    }, { isolationLevel: 'Serializable' });
    res.json(job);
});

jobsRouter.delete('/:id', verifyToken, async (req, res) => {
    staffUser(req);
    const id = integer(req.params.id, 'id');
    await prisma.$transaction(async tx => {
        // Lock the parent before checking its foreign-key references.
        await tx.$queryRaw`SELECT id FROM jobs WHERE id = ${id} FOR UPDATE`;
        const job = await tx.job.findUnique({ where: { id } });
        if (!job) notFound();
        canManage(req, job.createdBy);
        if (await tx.application.findFirst({ where: { jobId: id }, select: { id: true } })) {
            throw new JobError(409, 'JOB_HAS_APPLICATIONS', 'Archive jobs with applications instead.');
        }
        await tx.job.delete({ where: { id } });
    }, { isolationLevel: 'ReadCommitted' });
    res.status(204).end();
});

const jobErrors: ErrorRequestHandler = (error, _req, res, next) => {
    if (error instanceof JobError) {
        res.status(error.status).json({ error: error.code, message: error.message });
        return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'JOB_NOT_FOUND', message: 'Job not found.' });
            return;
        }
        if (error.code === 'P2034' || error.code === 'P2003') {
            res.status(409).json({ error: 'JOB_CONFLICT', message: 'The job changed concurrently or has related records.' });
            return;
        }
    }
    next(error);
};

jobsRouter.use(jobErrors);

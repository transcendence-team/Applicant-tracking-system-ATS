import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from './auth.js';
import { ApiError } from './errors.js';

const text = max => z.string().trim().max(max).nullable().optional();
const url = z.url({ protocol: /^https?$/ }).max(2048).nullable().optional();
const profileFields = z.object({
  firstName: text(250), lastName: text(250), phone: text(50), location: text(250),
  linkedinUrl: url, githubUrl: url, portfolioUrl: url, bio: text(10000),
}).strict().refine(value => Object.keys(value).length > 0, 'Provide at least one field.');

export function candidatesRouter(prisma, auth) {
  const router = Router();
  router.use(auth, requireRole('ROLE_APPLICANT'));
  router.get('/me', async (req, res) => {
    const profile = await prisma.candidateProfile.findUnique({ where: { userId: req.user.sub } });
    if (!profile) throw new ApiError(404, 'PROFILE_NOT_FOUND', 'Create your profile or upload a resume first.');
    res.json(profile);
  });
  router.patch('/me', async (req, res) => {
    const data = profileFields.parse(req.body);
    const profile = await prisma.candidateProfile.upsert({
      where: { userId: req.user.sub }, create: { userId: req.user.sub, ...data }, update: data,
    });
    res.json(profile);
  });
  return router;
}

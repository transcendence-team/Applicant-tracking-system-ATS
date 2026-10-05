import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1. Kanban statuses
  const statuses = [
    { name: "applied", position: 1, isTerminal: false },
    { name: "screening", position: 2, isTerminal: false },
    { name: "interview", position: 3, isTerminal: false },
    { name: "offer", position: 4, isTerminal: false },
    { name: "hired", position: 5, isTerminal: true },
    { name: "rejected", position: 6, isTerminal: true },
    { name: "withdrawn", position: 7, isTerminal: true },
  ];
  for (const s of statuses) {
    await prisma.applicationStatus.upsert({ where: { name: s.name }, update: {}, create: s });
  }

  // 2. Roles & permissions
  const roles = [
    { name: "admin", description: "Full system access" },
    { name: "recruiter", description: "Manages jobs and applications" },
    { name: "hiring_manager", description: "Reviews shortlisted candidates" },
    { name: "candidate", description: "Applies to jobs" },
  ];
  for (const r of roles) {
    await prisma.role.upsert({ where: { name: r.name }, update: {}, create: r });
  }

  const permissions = [
    "job.create", "job.edit", "job.delete",
    "application.view", "application.update",
    "user.manage", "ai.run",
  ];
  for (const name of permissions) {
    await prisma.permission.upsert({ where: { name }, update: {}, create: { name } });
  }

  const matrix: Record<string, string[]> = {
    admin: permissions,
    recruiter: ["job.create", "job.edit", "application.view", "application.update", "ai.run"],
    hiring_manager: ["application.view", "application.update"],
    candidate: [],
  };
  for (const [roleName, perms] of Object.entries(matrix)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const permName of perms) {
      const perm = await prisma.permission.findUniqueOrThrow({ where: { name: permName } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  // 3. Test users (DEV ONLY - password: Password123!)
  const hash = await bcrypt.hash("Password123!", 10);

  await prisma.user.upsert({
    where: { email: "admin@ats.local" },
    update: {},
    create: {
      email: "admin@ats.local", passwordHash: hash, firstName: "Ada", lastName: "Admin",
      userRoles: { create: { role: { connect: { name: "admin" } } } },
    },
  });

  const recruiter = await prisma.user.upsert({
    where: { email: "recruiter@ats.local" },
    update: {},
    create: {
      email: "recruiter@ats.local", passwordHash: hash, firstName: "Rita", lastName: "Recruiter",
      userRoles: { create: { role: { connect: { name: "recruiter" } } } },
      employeeProfile: { create: { department: "HR", jobTitle: "Senior Recruiter" } },
    },
  });

  const candidateUser = await prisma.user.upsert({
    where: { email: "candidate@ats.local" },
    update: {},
    create: {
      email: "candidate@ats.local", passwordHash: hash, firstName: "Sam", lastName: "Candidate",
      userRoles: { create: { role: { connect: { name: "candidate" } } } },
      candidateProfile: { create: { location: "Casablanca, MA", githubUrl: "https://github.com/sam" } },
    },
    include: { candidateProfile: true },
  });

  // 4. Skills + a job
  const skillNames = ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "Python"];
  for (const name of skillNames) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }

  let job = await prisma.job.findFirst({ where: { title: "Full-Stack Developer" } });
  if (!job) {
    job = await prisma.job.create({
      data: {
        title: "Full-Stack Developer",
        description: "Build features across our Next.js frontend and Node.js backend.",
        location: "Remote", employmentType: "full_time", status: "open",
        salaryMin: 30000, salaryMax: 50000, publishedAt: new Date(),
        createdById: recruiter.id,
        recruiters: { create: { userId: recruiter.id, assignedById: recruiter.id } },
      },
    });
    const required = ["TypeScript", "React", "Node.js", "PostgreSQL"];
    for (const name of required) {
      const skill = await prisma.skill.findUniqueOrThrow({ where: { name } });
      await prisma.jobSkill.create({ data: { jobId: job.id, skillId: skill.id, isRequired: true, importance: 4 } });
    }
  }

  // 5. One application so the Kanban board isn't empty
  const candidateId = candidateUser.candidateProfile!.id;
  const applied = await prisma.applicationStatus.findUniqueOrThrow({ where: { name: "applied" } });

  const existing = await prisma.application.findUnique({
    where: { jobId_candidateId: { jobId: job.id, candidateId } },
  });
  if (!existing) {
    const resume = await prisma.resume.create({
      data: {
        candidateId, originalFilename: "sam_cv.pdf", storagePath: "/uploads/sam_cv.pdf",
        mimeType: "application/pdf", fileSize: 120_000,
      },
    });
    await prisma.application.create({
      data: { jobId: job.id, candidateId, resumeId: resume.id, statusId: applied.id, coverLetter: "I'd love to join!" },
    });
  }

  console.log("Seed complete. Login: admin@ats.local / recruiter@ats.local / candidate@ats.local  (Password123!)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { prisma } from "./index";
import { moveApplication, ConflictError } from "./kanban";
import { logAudit } from "./audit";

async function main() {
  const app = await prisma.application.findFirstOrThrow();
  const recruiter = await prisma.user.findUniqueOrThrow({ where: { email: "recruiter@ats.local" } });
  const screening = await prisma.applicationStatus.findUniqueOrThrow({ where: { name: "screening" } });
  const interview = await prisma.applicationStatus.findUniqueOrThrow({ where: { name: "interview" } });

  // Two HR agents load the same card (same version)
  const seenVersion = app.version;

  // Agent A moves it first -> succeeds
  const moved = await moveApplication({
    applicationId: app.id, toStatusId: screening.id,
    expectedVersion: seenVersion, userId: recruiter.id, comment: "Looks good",
  });
  await logAudit({ userId: recruiter.id, action: "application.move", entityType: "application", entityId: app.id, newValues: { statusId: screening.id } });
  console.log("Agent A moved card. New version:", moved.version);

  // Agent B still has the old version -> must be rejected
  try {
    await moveApplication({ applicationId: app.id, toStatusId: interview.id, expectedVersion: seenVersion, userId: recruiter.id });
    console.log("BUG: second move should have failed");
  } catch (e) {
    if (e instanceof ConflictError) console.log("Agent B got a conflict (expected). Race condition prevented.");
    else throw e;
  }
}

main().finally(() => prisma.$disconnect());

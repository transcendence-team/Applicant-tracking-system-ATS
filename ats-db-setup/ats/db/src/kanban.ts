import { prisma } from "./index";

export class ConflictError extends Error {
  constructor(message = "Application was modified by someone else. Refresh and retry.") {
    super(message);
    this.name = "ConflictError";
  }
}

interface MoveParams {
  applicationId: number;
  toStatusId: number;
  expectedVersion: number; // the version the client saw when it loaded the card
  userId: number;          // the HR agent making the move
  comment?: string;
}

/**
 * Move a Kanban card with optimistic locking.
 * If two HR agents move the same card at the same time, the second one gets a
 * ConflictError instead of silently overwriting the first.
 * The move and its history row are written in ONE transaction.
 */
export async function moveApplication(p: MoveParams) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.application.findUnique({
      where: { id: p.applicationId },
      select: { statusId: true },
    });
    if (!current) throw new Error(`Application ${p.applicationId} not found`);

    // Only updates if the version still matches -> atomic check-and-set
    const result = await tx.application.updateMany({
      where: { id: p.applicationId, version: p.expectedVersion },
      data: { statusId: p.toStatusId, version: { increment: 1 } },
    });
    if (result.count === 0) throw new ConflictError();

    await tx.applicationStatusHistory.create({
      data: {
        applicationId: p.applicationId,
        fromStatusId: current.statusId,
        toStatusId: p.toStatusId,
        changedById: p.userId,
        comment: p.comment,
      },
    });

    return tx.application.findUniqueOrThrow({ where: { id: p.applicationId } });
  });
}

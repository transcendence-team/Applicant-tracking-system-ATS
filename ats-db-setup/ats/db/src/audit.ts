import { prisma, Prisma } from "./index";

interface AuditParams {
  userId?: number | null;
  action: string;               // e.g. "application.move", "job.create", "user.delete"
  entityType?: string;          // e.g. "application"
  entityId?: number;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export function logAudit(p: AuditParams) {
  return prisma.auditLog.create({
    data: {
      userId: p.userId ?? null,
      action: p.action,
      entityType: p.entityType,
      entityId: p.entityId,
      oldValues: p.oldValues,
      newValues: p.newValues,
      ipAddress: p.ipAddress,
      userAgent: p.userAgent,
    },
  });
}

export function logActivity(userId: number | null, eventType: string, entityType?: string, entityId?: number, metadata?: Prisma.InputJsonValue) {
  return prisma.activityEvent.create({
    data: { userId, eventType, entityType, entityId, metadata },
  });
}

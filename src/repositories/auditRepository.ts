import { prisma } from '../config/db';

export class AuditRepository {
  static async log(data: {
    orgId?: string;
    userId?: string;
    ipAddress?: string;
    actionType: string;
    targetEntity: string;
    details?: string;
  }) {
    return prisma.auditLog.create({ data });
  }

  static async findByOrg(orgId: string) {
    return prisma.auditLog.findMany({
      where: { orgId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

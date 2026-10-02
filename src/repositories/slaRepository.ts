import { prisma } from '../config/db';

export class SLARepository {
  static async createRule(data: { orgId: string; deptId?: string; priority: string; targetResolutionHours: number }) {
    return prisma.sLARule.create({ data });
  }

  static async findRulesByOrg(orgId: string) {
    return prisma.sLARule.findMany({
      where: { orgId },
      include: { department: true },
    });
  }

  static async createRecord(data: { orgId: string; complaintId: string; slaRuleId?: string; dueAt: Date }) {
    return prisma.sLARecord.create({ data });
  }

  static async markBreached(complaintId: string, breachHours: number) {
    return prisma.sLARecord.update({
      where: { complaintId },
      data: { isBreached: true, breachDurationHours: breachHours },
    });
  }

  static async createEscalation(data: {
    orgId: string;
    complaintId: string;
    escalatedFromAgentId?: string;
    escalatedToManagerId?: string;
    escalationReason: string;
  }) {
    return prisma.escalation.create({ data });
  }
}

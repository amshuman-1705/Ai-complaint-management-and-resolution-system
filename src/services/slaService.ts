import { prisma } from '../config/db';
import { SLARepository } from '../repositories/slaRepository';
import { ComplaintRepository } from '../repositories/complaintRepository';
import { AuditRepository } from '../repositories/auditRepository';
import { NotificationRepository } from '../repositories/notificationRepository';

export interface SLACountdownStatus {
  complaintId: string;
  ticketNumber: string;
  priority: string;
  createdAt: Date;
  dueAt: Date;
  totalTargetHours: number;
  elapsedHours: number;
  remainingHours: number;
  elapsedPercentage: number;
  isWarningState: boolean; // >= 75% elapsed
  isBreached: boolean; // > 100% elapsed
}

export interface PredictiveSLARiskResult {
  complaintId: string;
  ticketNumber: string;
  priority: string;
  remainingHours: number;
  assignedAgentWorkloadRatio: number;
  departmentQueueDepth: number;
  predictedHoursToResolve: number;
  predictiveBreachRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  riskRationale: string;
}

export class SLAService {
  static async createSLARule(data: { orgId: string; deptId?: string; priority: string; targetResolutionHours: number }) {
    return SLARepository.createRule(data);
  }

  static async listSLARules(orgId: string) {
    return SLARepository.findRulesByOrg(orgId);
  }

  /**
   * Calculates SLA Due Time based on Organization & Category & Priority Rules.
   * Priority defaults: CRITICAL (4h), HIGH (12h), MEDIUM (24h), LOW (48h).
   */
  static async calculateAndAttachSLA(orgId: string, complaintId: string): Promise<SLACountdownStatus> {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { department: true, category: true },
    });

    if (!complaint || complaint.orgId !== orgId) {
      throw { statusCode: 404, message: 'SLA Engine Error: Complaint ticket not found.' };
    }

    const priority = complaint.priority || 'MEDIUM';

    // 1. Look up explicit SLARule for Org + Dept + Priority
    let rule = await prisma.sLARule.findFirst({
      where: {
        orgId,
        deptId: complaint.deptId || undefined,
        priority,
      },
    });

    if (!rule) {
      // Fallback to Org-wide Priority Rule
      rule = await prisma.sLARule.findFirst({
        where: {
          orgId,
          deptId: null,
          priority,
        },
      });
    }

    // Default target hours if no custom rule configured
    let targetHours = 24;
    if (rule) {
      targetHours = rule.targetResolutionHours;
    } else {
      if (priority === 'CRITICAL') targetHours = 4;
      else if (priority === 'HIGH') targetHours = 12;
      else if (priority === 'MEDIUM') targetHours = 24;
      else if (priority === 'LOW') targetHours = 48;
    }

    const createdAt = complaint.createdAt;
    const dueAt = new Date(createdAt.getTime() + targetHours * 60 * 60 * 1000);

    // Update Complaint & Create/Update SLARecord
    await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        estimatedSlaHours: targetHours,
        slaDueAt: dueAt,
      },
    });

    await prisma.sLARecord.upsert({
      where: { complaintId },
      create: {
        orgId,
        complaintId,
        slaRuleId: rule?.id || null,
        dueAt,
      },
      update: {
        slaRuleId: rule?.id || null,
        dueAt,
      },
    });

    return this.getSLACountdown(orgId, complaintId);
  }

  /**
   * Retrieves current SLA countdown status and warning metrics.
   */
  static async getSLACountdown(orgId: string, complaintId: string): Promise<SLACountdownStatus> {
    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint || complaint.orgId !== orgId) {
      throw { statusCode: 404, message: 'SLA Countdown Error: Complaint ticket not found.' };
    }

    const now = new Date();
    const createdAt = complaint.createdAt;
    const dueAt = complaint.slaDueAt || new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    const totalTargetHours = complaint.estimatedSlaHours || 24;

    const elapsedHours = parseFloat(((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)).toFixed(2));
    const remainingHours = parseFloat(((dueAt.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(2));
    const elapsedPercentage = parseFloat(Math.min(100, (elapsedHours / totalTargetHours) * 100).toFixed(1));

    const isBreached = now > dueAt && complaint.status !== 'RESOLVED' && complaint.status !== 'CLOSED';
    const isWarningState = elapsedPercentage >= 75 && !isBreached;

    return {
      complaintId,
      ticketNumber: complaint.ticketNumber,
      priority: complaint.priority,
      createdAt,
      dueAt,
      totalTargetHours,
      elapsedHours,
      remainingHours,
      elapsedPercentage,
      isWarningState,
      isBreached,
    };
  }

  /**
   * Evaluates Predictive SLA Breach Risk using queue depth and agent capacity.
   */
  static async predictSLABreachRisk(orgId: string, complaintId: string): Promise<PredictiveSLARiskResult> {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        assignedAgent: { include: { employeeProfile: true } },
      },
    });

    if (!complaint || complaint.orgId !== orgId) {
      throw { statusCode: 404, message: 'Predictive SLA Error: Complaint ticket not found.' };
    }

    const countdown = await this.getSLACountdown(orgId, complaintId);
    
    // Department Queue Depth
    const deptQueueDepth = await prisma.complaint.count({
      where: {
        orgId,
        deptId: complaint.deptId || undefined,
        status: { in: ['SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS'] },
      },
    });

    // Agent Workload Ratio
    let agentWorkloadRatio = 0.5;
    if (complaint.assignedAgent?.employeeProfile) {
      const emp = complaint.assignedAgent.employeeProfile;
      agentWorkloadRatio = emp.activeWorkload / (emp.maxCapacity || 10);
    }

    // Base Estimated Resolution Hours by Priority
    let baseResolutionHours = 6;
    if (complaint.priority === 'CRITICAL') baseResolutionHours = 2;
    else if (complaint.priority === 'HIGH') baseResolutionHours = 4;
    else if (complaint.priority === 'MEDIUM') baseResolutionHours = 8;
    else if (complaint.priority === 'LOW') baseResolutionHours = 12;

    // Adjust predicted hours based on queue depth and agent workload ratio
    const predictedHoursToResolve = parseFloat((baseResolutionHours * (1 + agentWorkloadRatio * 0.5 + Math.min(2, deptQueueDepth * 0.1))).toFixed(1));

    let predictiveBreachRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let riskRationale = 'Resolution progressing normally within SLA timeline.';

    if (countdown.isBreached || predictedHoursToResolve >= countdown.remainingHours) {
      predictiveBreachRisk = 'HIGH';
      riskRationale = `High Breach Risk: Predicted resolution time (${predictedHoursToResolve}h) exceeds remaining SLA time (${countdown.remainingHours}h).`;
    } else if (predictedHoursToResolve >= countdown.remainingHours * 0.7 || agentWorkloadRatio > 0.8) {
      predictiveBreachRisk = 'MEDIUM';
      riskRationale = `Medium Breach Risk: Assigned agent workload ratio (${(agentWorkloadRatio * 100).toFixed(0)}%) or queue depth (${deptQueueDepth}) may delay resolution.`;
    }

    return {
      complaintId,
      ticketNumber: complaint.ticketNumber,
      priority: complaint.priority,
      remainingHours: countdown.remainingHours,
      assignedAgentWorkloadRatio: parseFloat(agentWorkloadRatio.toFixed(2)),
      departmentQueueDepth: deptQueueDepth,
      predictedHoursToResolve,
      predictiveBreachRisk,
      riskRationale,
    };
  }

  /**
   * Batch Scan for Tenant Complaints: Evaluates SLA Warnings, Breaches, and Triggers Auto-Escalations.
   */
  static async scanAndAutoEscalateSLABreaches(orgId: string) {
    const activeComplaints = await prisma.complaint.findMany({
      where: {
        orgId,
        status: { in: ['SUBMITTED', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL'] },
      },
      include: {
        department: true,
      },
    });

    const results = {
      scannedCount: activeComplaints.length,
      warningNotificationsSent: 0,
      breachesDetected: 0,
      escalationsTriggered: 0,
    };

    for (const ticket of activeComplaints) {
      const countdown = await this.getSLACountdown(orgId, ticket.id);
      const prediction = await this.predictSLABreachRisk(orgId, ticket.id);

      // 1. Check SLA Warning (75% elapsed)
      if (countdown.isWarningState) {
        if (ticket.assignedAgentId) {
          await NotificationRepository.create({
            orgId,
            userId: ticket.assignedAgentId,
            title: `⚠️ SLA WARNING: #${ticket.ticketNumber}`,
            message: `Ticket '${ticket.title}' is 75% elapsed! ${countdown.remainingHours} hours remaining.`,
            eventType: 'SLA_WARNING',
          });
          results.warningNotificationsSent++;
        }
      }

      // 2. Check SLA Breach or High Predictive Breach Risk
      if (countdown.isBreached || prediction.predictiveBreachRisk === 'HIGH') {
        results.breachesDetected++;

        // Mark Breached in Complaint & SLARecord
        await prisma.complaint.update({
          where: { id: ticket.id },
          data: {
            isSlaBreached: true,
            status: 'ESCALATED',
          },
        });

        await prisma.sLARecord.updateMany({
          where: { complaintId: ticket.id },
          data: { isBreached: true },
        });

        // Find Department Manager or Org Admin for Escalation
        const manager = await prisma.user.findFirst({
          where: {
            orgId,
            deptId: ticket.deptId || undefined,
            status: 'ACTIVE',
            role: { name: { in: ['DEPT_MANAGER', 'ORG_ADMIN'] } },
          },
        });

        await prisma.escalation.create({
          data: {
            orgId,
            complaintId: ticket.id,
            escalatedFromAgentId: ticket.assignedAgentId || null,
            escalatedToManagerId: manager?.id || null,
            escalationReason: countdown.isBreached
              ? `Automatic SLA Breach Triggered. Overdue by ${Math.abs(countdown.remainingHours)} hours.`
              : `Predictive SLA Breach Alert: ${prediction.riskRationale}`,
          },
        });

        if (manager) {
          await NotificationRepository.create({
            orgId,
            userId: manager.id,
            title: `🚨 AUTOMATIC SLA ESCALATION: #${ticket.ticketNumber}`,
            message: `Ticket #${ticket.ticketNumber} auto-escalated to management! ${prediction.riskRationale}`,
            eventType: 'AUTOMATIC_SLA_ESCALATION',
          });
        }

        await AuditRepository.log({
          orgId,
          actionType: 'AUTOMATIC_SLA_ESCALATION_EXECUTED',
          targetEntity: 'complaints',
          details: JSON.stringify({
            complaintId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            isBreached: countdown.isBreached,
            predictiveRisk: prediction.predictiveBreachRisk,
            managerId: manager?.id || null,
          }),
        });

        results.escalationsTriggered++;
      }
    }

    return results;
  }

  /**
   * Checks breach status for a single complaint ticket.
   */
  static async checkSLABreach(complaintId: string, orgId: string) {
    const countdown = await this.getSLACountdown(orgId, complaintId);

    if (countdown.isBreached) {
      await prisma.complaint.update({
        where: { id: complaintId },
        data: { isSlaBreached: true },
      });
    }

    return countdown;
  }
}

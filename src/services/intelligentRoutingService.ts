import { prisma } from '../config/db';
import { AuditRepository } from '../repositories/auditRepository';
import { NotificationRepository } from '../repositories/notificationRepository';

export interface AgentCandidateRanking {
  agentId: string;
  fullName: string;
  email: string;
  deptId: string;
  deptName: string;
  activeWorkload: number;
  maxCapacity: number;
  workloadIndex: number;
  matchedSkills: string[];
  skillScore: number;
  finalScore: number;
  isAvailable: boolean;
}

export interface RoutingDecisionResult {
  complaintId: string;
  orgId: string;
  recommendedDeptId: string;
  recommendedDeptName: string;
  recommendedAgent: AgentCandidateRanking | null;
  candidateRankings: AgentCandidateRanking[];
  routingRationale: string;
}

export class IntelligentRoutingService {
  /**
   * Evaluates AI predicted category, text intent, and required skills to recommend department & candidate agents.
   */
  static async evaluateRoutingOptions(orgId: string, complaintId: string): Promise<RoutingDecisionResult> {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        category: true,
        department: true,
        aiPrediction: true,
      },
    });

    if (!complaint || complaint.orgId !== orgId) {
      throw { statusCode: 404, message: 'Intelligent Routing Error: Complaint ticket not found.' };
    }

    // 1. Identify Target Department
    let targetDeptId = complaint.deptId;
    let targetDeptName = complaint.department?.name || 'General Support';

    if (!targetDeptId && complaint.categoryId) {
      const cat = await prisma.complaintCategory.findUnique({ where: { id: complaint.categoryId } });
      if (cat?.defaultDeptId) {
        targetDeptId = cat.defaultDeptId;
        const dept = await prisma.department.findUnique({ where: { id: targetDeptId } });
        if (dept) targetDeptName = dept.name;
      }
    }

    if (!targetDeptId) {
      const depts = await prisma.department.findMany({ where: { orgId } });
      if (depts.length > 0) {
        targetDeptId = depts[0].id;
        targetDeptName = depts[0].name;
      }
    }

    // 2. Extract Required Skills from Complaint Text & AI Predictions
    const fullText = `${complaint.title} ${complaint.description} ${complaint.aiPrediction?.predictedSubCategory || ''}`.toLowerCase();
    const requiredSkills: string[] = [];

    if (fullText.includes('billing') || fullText.includes('charge') || fullText.includes('refund') || fullText.includes('invoice')) requiredSkills.push('BILLING', 'REFUND');
    if (fullText.includes('card') || fullText.includes('atm') || fullText.includes('credit')) requiredSkills.push('CARDS', 'ATM');
    if (fullText.includes('technical') || fullText.includes('server') || fullText.includes('app') || fullText.includes('login')) requiredSkills.push('TECH_SUPPORT');
    if (fullText.includes('urgent') || complaint.priority === 'CRITICAL' || complaint.priority === 'HIGH') requiredSkills.push('HIGH_PRIORITY');

    // 3. Fetch Agents in Target Department & Organization
    const users = await prisma.user.findMany({
      where: {
        orgId,
        deptId: targetDeptId || undefined,
        status: 'ACTIVE',
        role: { name: { in: ['AGENT', 'DEPT_MANAGER'] } },
      },
      include: {
        employeeProfile: true,
        department: true,
      },
    });

    // 4. Score Candidate Agents by Skill Match + Workload Capacity Index
    const candidateRankings: AgentCandidateRanking[] = users.map((u) => {
      const emp = u.employeeProfile;
      const activeWorkload = emp?.activeWorkload || 0;
      const maxCapacity = emp?.maxCapacity || 10;
      const workloadIndex = parseFloat((activeWorkload / maxCapacity).toFixed(2));
      const isAvailable = activeWorkload < maxCapacity;

      let agentSkills: string[] = [];
      if (emp?.specializationSkills) {
        try {
          agentSkills = JSON.parse(emp.specializationSkills);
        } catch {
          agentSkills = [emp.specializationSkills];
        }
      }

      const matchedSkills = requiredSkills.filter((s) => agentSkills.some((as) => as.toUpperCase() === s));
      const skillScore = requiredSkills.length > 0 ? matchedSkills.length / requiredSkills.length : 1.0;

      // Final Score: 60% Skill Match + 40% Workload Capacity Availability
      const finalScore = isAvailable ? parseFloat((skillScore * 0.6 + (1.0 - workloadIndex) * 0.4).toFixed(2)) : 0;

      return {
        agentId: u.id,
        fullName: u.fullName,
        email: u.email,
        deptId: u.deptId || targetDeptId || '',
        deptName: u.department?.name || targetDeptName,
        activeWorkload,
        maxCapacity,
        workloadIndex,
        matchedSkills,
        skillScore,
        finalScore,
        isAvailable,
      };
    });

    // Sort candidates by finalScore descending
    candidateRankings.sort((a, b) => b.finalScore - a.finalScore);

    const recommendedAgent = candidateRankings.length > 0 && candidateRankings[0].isAvailable ? candidateRankings[0] : null;

    const routingRationale = recommendedAgent
      ? `Recommended Agent '${recommendedAgent.fullName}' with skill match [${recommendedAgent.matchedSkills.join(', ')}] and low workload ratio (${recommendedAgent.activeWorkload}/${recommendedAgent.maxCapacity}).`
      : `No available agent found in department '${targetDeptName}' under capacity limit. Department pool queued.`;

    return {
      complaintId,
      orgId,
      recommendedDeptId: targetDeptId || '',
      recommendedDeptName: targetDeptName,
      recommendedAgent,
      candidateRankings,
      routingRationale,
    };
  }

  /**
   * Executes Workload-Aware Automatic Assignment of a Complaint Ticket.
   */
  static async executeAutomaticAssignment(orgId: string, complaintId: string, assignedByUserId?: string) {
    const routingOptions = await this.evaluateRoutingOptions(orgId, complaintId);
    const targetAgent = routingOptions.recommendedAgent;

    if (!targetAgent) {
      // Queue ticket to department without specific agent assignment
      await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          deptId: routingOptions.recommendedDeptId,
          status: 'TRIAGED',
        },
      });

      await AuditRepository.log({
        orgId,
        userId: assignedByUserId,
        actionType: 'COMPLAINT_ROUTED_NO_AGENT_AVAILABLE',
        targetEntity: 'complaints',
        details: JSON.stringify({ complaintId, deptId: routingOptions.recommendedDeptId, reason: routingOptions.routingRationale }),
      });

      return {
        complaintId,
        status: 'TRIAGED',
        deptId: routingOptions.recommendedDeptId,
        assignedAgentId: null,
        message: 'No available agent under max capacity limit. Ticket routed to department pool.',
      };
    }

    // Atomically Assign Ticket & Increment Employee Active Workload
    await prisma.$transaction([
      prisma.complaint.update({
        where: { id: complaintId },
        data: {
          deptId: targetAgent.deptId,
          assignedAgentId: targetAgent.agentId,
          status: 'ASSIGNED',
        },
      }),

      prisma.employee.update({
        where: { userId: targetAgent.agentId },
        data: { activeWorkload: { increment: 1 } },
      }),

      prisma.complaintAssignment.create({
        data: {
          orgId,
          complaintId,
          deptId: targetAgent.deptId,
          assignedAgentId: targetAgent.agentId,
          assignedByUserId,
          assignmentNotes: routingOptions.routingRationale,
        },
      }),

      prisma.complaintStatusHistory.create({
        data: {
          orgId,
          complaintId,
          changedByUserId: assignedByUserId,
          newStatus: 'ASSIGNED',
          reason: `Automatic Intelligent Workload Routing: Assigned to ${targetAgent.fullName}`,
        },
      }),
    ]);

    await NotificationRepository.create({
      orgId,
      userId: targetAgent.agentId,
      title: '🎯 New Complaint Assigned',
      message: `You have been automatically assigned ticket #${complaintId} based on workload capacity & skill match.`,
      eventType: 'COMPLAINT_ASSIGNED',
    });

    await AuditRepository.log({
      orgId,
      userId: assignedByUserId,
      actionType: 'COMPLAINT_AUTOMATICALLY_ROUTED',
      targetEntity: 'complaints',
      details: JSON.stringify({
        complaintId,
        assignedAgentId: targetAgent.agentId,
        agentName: targetAgent.fullName,
        deptId: targetAgent.deptId,
        routingScore: targetAgent.finalScore,
        rationale: routingOptions.routingRationale,
      }),
    });

    return {
      complaintId,
      status: 'ASSIGNED',
      deptId: targetAgent.deptId,
      assignedAgentId: targetAgent.agentId,
      assignedAgentName: targetAgent.fullName,
      routingScore: targetAgent.finalScore,
      message: `Ticket automatically assigned to Agent ${targetAgent.fullName}.`,
    };
  }

  /**
   * Manual Reassignment of a Complaint Ticket with Workload Balance Update.
   */
  static async reassignComplaint(data: {
    orgId: string;
    complaintId: string;
    newDeptId: string;
    newAgentId?: string;
    reassignedByUserId: string;
    reassignmentReason: string;
  }) {
    const complaint = await prisma.complaint.findUnique({ where: { id: data.complaintId } });
    if (!complaint || complaint.orgId !== data.orgId) {
      throw { statusCode: 404, message: 'Reassignment Error: Complaint ticket not found.' };
    }

    const previousAgentId = complaint.assignedAgentId;

    // Execute atomic transaction for workload adjustments and reassignment record
    await prisma.$transaction(async (tx) => {
      // Decrement previous agent workload
      if (previousAgentId && previousAgentId !== data.newAgentId) {
        await tx.employee.updateMany({
          where: { userId: previousAgentId, activeWorkload: { gt: 0 } },
          data: { activeWorkload: { decrement: 1 } },
        });
      }

      // Increment new agent workload
      if (data.newAgentId && previousAgentId !== data.newAgentId) {
        await tx.employee.updateMany({
          where: { userId: data.newAgentId },
          data: { activeWorkload: { increment: 1 } },
        });
      }

      // Update Complaint
      await tx.complaint.update({
        where: { id: data.complaintId },
        data: {
          deptId: data.newDeptId,
          assignedAgentId: data.newAgentId || null,
          status: data.newAgentId ? 'ASSIGNED' : 'TRIAGED',
        },
      });

      // Create Assignment record
      await tx.complaintAssignment.create({
        data: {
          orgId: data.orgId,
          complaintId: data.complaintId,
          deptId: data.newDeptId,
          assignedAgentId: data.newAgentId || null,
          assignedByUserId: data.reassignedByUserId,
          assignmentNotes: `Manual Reassignment: ${data.reassignmentReason}`,
        },
      });

      // Create Status History
      await tx.complaintStatusHistory.create({
        data: {
          orgId: data.orgId,
          complaintId: data.complaintId,
          changedByUserId: data.reassignedByUserId,
          newStatus: data.newAgentId ? 'ASSIGNED' : 'TRIAGED',
          reason: `Manual Reassignment: ${data.reassignmentReason}`,
        },
      });
    });

    if (data.newAgentId) {
      await NotificationRepository.create({
        orgId: data.orgId,
        userId: data.newAgentId,
        title: '🔄 Ticket Reassigned to You',
        message: `Ticket #${complaint.ticketNumber} has been reassigned to you. Reason: ${data.reassignmentReason}`,
        eventType: 'COMPLAINT_REASSIGNED',
      });
    }

    await AuditRepository.log({
      orgId: data.orgId,
      userId: data.reassignedByUserId,
      actionType: 'COMPLAINT_MANUALLY_REASSIGNED',
      targetEntity: 'complaints',
      details: JSON.stringify({
        complaintId: data.complaintId,
        previousAgentId,
        newAgentId: data.newAgentId,
        newDeptId: data.newDeptId,
        reason: data.reassignmentReason,
      }),
    });

    return {
      complaintId: data.complaintId,
      status: data.newAgentId ? 'ASSIGNED' : 'TRIAGED',
      previousAgentId,
      newAgentId: data.newAgentId,
      newDeptId: data.newDeptId,
    };
  }

  /**
   * Escalates a Complaint Ticket to Department Manager / Org Admin.
   */
  static async escalateComplaint(data: {
    orgId: string;
    complaintId: string;
    escalatedByUserId?: string;
    escalationReason: string;
  }) {
    const complaint = await prisma.complaint.findUnique({
      where: { id: data.complaintId },
      include: { department: true },
    });

    if (!complaint || complaint.orgId !== data.orgId) {
      throw { statusCode: 404, message: 'Escalation Error: Complaint ticket not found.' };
    }

    // Find Department Manager or Org Admin
    const manager = await prisma.user.findFirst({
      where: {
        orgId: data.orgId,
        deptId: complaint.deptId || undefined,
        status: 'ACTIVE',
        role: { name: { in: ['DEPT_MANAGER', 'ORG_ADMIN'] } },
      },
    });

    const managerId = manager?.id || null;

    await prisma.$transaction([
      prisma.complaint.update({
        where: { id: data.complaintId },
        data: {
          status: 'ESCALATED',
          priority: 'CRITICAL',
        },
      }),

      prisma.escalation.create({
        data: {
          orgId: data.orgId,
          complaintId: data.complaintId,
          escalatedFromAgentId: complaint.assignedAgentId || data.escalatedByUserId || null,
          escalatedToManagerId: managerId,
          escalationReason: data.escalationReason,
        },
      }),

      prisma.complaintStatusHistory.create({
        data: {
          orgId: data.orgId,
          complaintId: data.complaintId,
          changedByUserId: data.escalatedByUserId,
          newStatus: 'ESCALATED',
          reason: `Ticket Escalation: ${data.escalationReason}`,
        },
      }),
    ]);

    if (managerId) {
      await NotificationRepository.create({
        orgId: data.orgId,
        userId: managerId,
        title: `🚨 TICKET ESCALATED: #${complaint.ticketNumber}`,
        message: `Ticket '${complaint.title}' has been escalated to management review! Reason: ${data.escalationReason}`,
        eventType: 'TICKET_ESCALATED',
      });
    }

    await AuditRepository.log({
      orgId: data.orgId,
      userId: data.escalatedByUserId,
      actionType: 'COMPLAINT_ESCALATED',
      targetEntity: 'complaints',
      details: JSON.stringify({
        complaintId: data.complaintId,
        escalatedFromAgentId: complaint.assignedAgentId,
        escalatedToManagerId: managerId,
        reason: data.escalationReason,
      }),
    });

    return {
      complaintId: data.complaintId,
      status: 'ESCALATED',
      priority: 'CRITICAL',
      escalatedToManagerId: managerId,
      reason: data.escalationReason,
    };
  }
}

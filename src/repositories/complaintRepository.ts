import { prisma } from '../config/db';
import { TicketPriority, TicketStatus } from '../types';

export class ComplaintRepository {
  static async create(data: {
    ticketNumber: string;
    orgId: string;
    categoryId?: string;
    deptId?: string;
    customerId: string;
    title: string;
    description: string;
    inputChannel?: string;
    priority?: TicketPriority;
    severityScore?: number;
    estimatedSlaHours?: number;
    slaDueAt?: Date;
  }) {
    return prisma.complaint.create({
      data,
      include: {
        category: true,
        department: true,
        customer: true,
        assignedAgent: true,
      },
    });
  }

  static async findById(id: string) {
    return prisma.complaint.findUnique({
      where: { id },
      include: {
        category: true,
        department: true,
        customer: true,
        assignedAgent: true,
        statusHistories: { orderBy: { createdAt: 'desc' }, include: { changedByUser: true } },
        assignments: { orderBy: { createdAt: 'desc' }, include: { assignedAgent: true, department: true } },
        messages: { orderBy: { createdAt: 'asc' }, include: { senderUser: true } },
        attachments: true,
        slaRecord: true,
        escalations: { include: { escalatedToManager: true } },
        aiPrediction: true,
        aiExplanation: true,
        resolutionRecs: true,
        customerFeedback: true,
      },
    });
  }

  static async findByOrg(orgId: string, filters?: { status?: TicketStatus; priority?: TicketPriority; deptId?: string; agentId?: string; customerId?: string }) {
    return prisma.complaint.findMany({
      where: {
        orgId,
        status: filters?.status,
        priority: filters?.priority,
        deptId: filters?.deptId,
        assignedAgentId: filters?.agentId,
        customerId: filters?.customerId,
      },
      include: {
        category: true,
        department: true,
        customer: true,
        assignedAgent: true,
        customerFeedback: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async updateStatus(id: string, status: TicketStatus) {
    return prisma.complaint.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }

  static async assignAgent(id: string, deptId: string, agentId: string) {
    return prisma.complaint.update({
      where: { id },
      data: {
        deptId,
        assignedAgentId: agentId,
        status: 'ASSIGNED',
        updatedAt: new Date(),
      },
    });
  }

  static async logStatusHistory(data: {
    orgId: string;
    complaintId: string;
    changedByUserId?: string;
    oldStatus?: string;
    newStatus: string;
    reason?: string;
  }) {
    return prisma.complaintStatusHistory.create({ data });
  }

  static async logAssignment(data: {
    orgId: string;
    complaintId: string;
    assignedByUserId?: string;
    assignedAgentId?: string;
    deptId: string;
    assignmentNotes?: string;
  }) {
    return prisma.complaintAssignment.create({ data });
  }

  static async addMessage(data: {
    orgId: string;
    complaintId: string;
    senderUserId?: string;
    senderType: string;
    messageText: string;
    isInternalNote?: boolean;
  }) {
    return prisma.complaintMessage.create({ data });
  }

  static async addAttachment(data: {
    orgId: string;
    complaintId?: string;
    uploadedByUserId?: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSizeBytes: bigint;
    ocrExtractedText?: string;
  }) {
    return prisma.attachment.create({ data });
  }

  static async createCustomerFeedback(data: {
    orgId: string;
    complaintId: string;
    customerId: string;
    ratingStars: number;
    isIssueResolved?: boolean;
    comments?: string;
  }) {
    return prisma.customerFeedback.create({ data });
  }

  static async createAgentFeedback(data: {
    orgId: string;
    complaintId: string;
    agentId: string;
    isCategoryOverridden?: boolean;
    originalAiCategory?: string;
    correctedCategory?: string;
    editedRagResponse?: string;
  }) {
    return prisma.agentFeedback.create({ data });
  }
}

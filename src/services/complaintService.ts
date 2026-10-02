import { ComplaintRepository } from '../repositories/complaintRepository';
import { UserRepository } from '../repositories/userRepository';
import { PIISanitizer } from '../utils/piiMasker';
import { TicketPriority, TicketStatus } from '../types';
import { AuditRepository } from '../repositories/auditRepository';
import { NotificationRepository } from '../repositories/notificationRepository';

export class ComplaintService {
  static async submitComplaint(data: {
    orgId: string;
    customerId: string;
    title: string;
    description: string;
    inputChannel?: string;
    categoryId?: string;
  }) {
    // PII Sanitization & Redaction
    const cleanTitle = PIISanitizer.sanitize(data.title);
    const cleanDesc = PIISanitizer.sanitize(data.description);

    const ticketNumber = `CMP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const slaDue = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h SLA

    const complaint = await ComplaintRepository.create({
      ticketNumber,
      orgId: data.orgId,
      customerId: data.customerId,
      title: cleanTitle,
      description: cleanDesc,
      inputChannel: data.inputChannel || 'TEXT',
      categoryId: data.categoryId,
      estimatedSlaHours: 24,
      slaDueAt: slaDue,
    });

    await ComplaintRepository.logStatusHistory({
      orgId: data.orgId,
      complaintId: complaint.id,
      changedByUserId: data.customerId,
      newStatus: 'SUBMITTED',
      reason: 'Complaint submitted by customer via portal.',
    });

    await AuditRepository.log({
      orgId: data.orgId,
      userId: data.customerId,
      actionType: 'COMPLAINT_SUBMITTED',
      targetEntity: 'complaints',
      details: JSON.stringify({ ticketNumber: complaint.ticketNumber, channel: complaint.inputChannel }),
    });

    return complaint;
  }

  static async getComplaintById(id: string, orgId: string) {
    const complaint = await ComplaintRepository.findById(id);
    if (!complaint) throw { statusCode: 404, message: 'Complaint ticket not found.' };
    if (complaint.orgId !== orgId) throw { statusCode: 403, message: 'Security Violation: Tenant data access unauthorized.' };
    return complaint;
  }

  static async listComplaints(orgId: string, filters?: { status?: TicketStatus; priority?: TicketPriority; deptId?: string; agentId?: string; customerId?: string }) {
    return ComplaintRepository.findByOrg(orgId, filters);
  }

  static async updateStatus(data: {
    orgId: string;
    complaintId: string;
    userId: string;
    newStatus: TicketStatus;
    reason?: string;
  }) {
    const complaint = await ComplaintRepository.findById(data.complaintId);
    if (!complaint || complaint.orgId !== data.orgId) throw { statusCode: 404, message: 'Complaint not found.' };

    const oldStatus = complaint.status;
    const updated = await ComplaintRepository.updateStatus(data.complaintId, data.newStatus);

    await ComplaintRepository.logStatusHistory({
      orgId: data.orgId,
      complaintId: data.complaintId,
      changedByUserId: data.userId,
      oldStatus,
      newStatus: data.newStatus,
      reason: data.reason,
    });

    // Notify customer
    await NotificationRepository.create({
      orgId: data.orgId,
      userId: complaint.customerId,
      title: `Status Update: ${complaint.ticketNumber}`,
      message: `Your complaint ticket status has changed to '${data.newStatus}'.`,
      eventType: 'COMPLAINT_STATUS_CHANGED',
    });

    return updated;
  }

  static async assignComplaint(data: {
    orgId: string;
    complaintId: string;
    assignedByUserId: string;
    deptId: string;
    agentId?: string;
    notes?: string;
  }) {
    const complaint = await ComplaintRepository.findById(data.complaintId);
    if (!complaint || complaint.orgId !== data.orgId) throw { statusCode: 404, message: 'Complaint not found.' };

    let targetAgentId = data.agentId;
    
    // Auto Workload Balancer if agent not specified
    if (!targetAgentId) {
      const leastLoaded = await UserRepository.findLeastLoadedAgent(data.orgId, data.deptId);
      if (leastLoaded) targetAgentId = leastLoaded.id;
    }

    if (!targetAgentId) throw { statusCode: 400, message: 'No available active agent found in target department.' };

    const assigned = await ComplaintRepository.assignAgent(data.complaintId, data.deptId, targetAgentId);
    await UserRepository.incrementWorkload(targetAgentId);

    await ComplaintRepository.logAssignment({
      orgId: data.orgId,
      complaintId: data.complaintId,
      assignedByUserId: data.assignedByUserId,
      assignedAgentId: targetAgentId,
      deptId: data.deptId,
      assignmentNotes: data.notes,
    });

    // Notify Agent
    await NotificationRepository.create({
      orgId: data.orgId,
      userId: targetAgentId,
      title: `New Ticket Assigned: ${complaint.ticketNumber}`,
      message: `Ticket '${complaint.title}' has been assigned to you.`,
      eventType: 'TICKET_ASSIGNED',
    });

    return assigned;
  }

  static async addMessage(data: {
    orgId: string;
    complaintId: string;
    senderUserId: string;
    senderType: string;
    messageText: string;
    isInternalNote?: boolean;
  }) {
    const cleanText = PIISanitizer.sanitize(data.messageText);
    return ComplaintRepository.addMessage({
      ...data,
      messageText: cleanText,
    });
  }

  static async submitCustomerFeedback(data: {
    orgId: string;
    complaintId: string;
    customerId: string;
    ratingStars: number;
    isIssueResolved?: boolean;
    comments?: string;
  }) {
    const complaint = await ComplaintRepository.findById(data.complaintId);
    if (!complaint || complaint.customerId !== data.customerId) {
      throw { statusCode: 403, message: 'Unauthorized feedback submission.' };
    }

    const feedback = await ComplaintRepository.createCustomerFeedback(data);
    await ComplaintRepository.updateStatus(data.complaintId, 'CLOSED');
    return feedback;
  }
}

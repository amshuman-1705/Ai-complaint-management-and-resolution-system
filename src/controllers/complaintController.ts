import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ComplaintService } from '../services/complaintService';
import { TicketPriority, TicketStatus } from '../types';

export class ComplaintController {
  static async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { title, description, inputChannel, categoryId } = req.body;
      const orgId = req.orgId!;
      const customerId = req.user!.userId;

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Title and Description are required.',
          timestamp: new Date().toISOString(),
        });
      }

      const complaint = await ComplaintService.submitComplaint({
        orgId,
        customerId,
        title,
        description,
        inputChannel,
        categoryId,
      });

      return res.status(201).json({
        success: true,
        message: 'Complaint ticket submitted successfully.',
        data: complaint,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const { status, priority, deptId, agentId } = req.query;

      // Customers only see their own complaints
      let customerId: string | undefined = undefined;
      if (req.user!.role === 'CUSTOMER') {
        customerId = req.user!.userId;
      }

      const complaints = await ComplaintService.listComplaints(orgId, {
        status: status as TicketStatus | undefined,
        priority: priority as TicketPriority | undefined,
        deptId: deptId as string | undefined,
        agentId: agentId as string | undefined,
        customerId,
      });

      return res.status(200).json({
        success: true,
        message: 'Complaints listed successfully.',
        data: complaints,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orgId = req.orgId!;

      const complaint = await ComplaintService.getComplaintById(id, orgId);

      // Customer ownership check
      if (req.user!.role === 'CUSTOMER' && complaint.customerId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only view your own complaints.',
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Complaint fetched successfully.',
        data: complaint,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const orgId = req.orgId!;
      const userId = req.user!.userId;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Missing target status.',
          timestamp: new Date().toISOString(),
        });
      }

      const updated = await ComplaintService.updateStatus({
        orgId,
        complaintId: id,
        userId,
        newStatus: status as TicketStatus,
        reason,
      });

      return res.status(200).json({
        success: true,
        message: `Complaint status updated to '${status}'.`,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async assign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { deptId, agentId, notes } = req.body;
      const orgId = req.orgId!;
      const assignedByUserId = req.user!.userId;

      if (!deptId) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Missing target department ID.',
          timestamp: new Date().toISOString(),
        });
      }

      const assigned = await ComplaintService.assignComplaint({
        orgId,
        complaintId: id,
        assignedByUserId,
        deptId,
        agentId,
        notes,
      });

      return res.status(200).json({
        success: true,
        message: 'Complaint ticket assigned successfully.',
        data: assigned,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async addMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { messageText, isInternalNote } = req.body;
      const orgId = req.orgId!;
      const senderUserId = req.user!.userId;
      const senderType = req.user!.role === 'CUSTOMER' ? 'CUSTOMER' : 'AGENT';

      if (!messageText) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Message text cannot be empty.',
          timestamp: new Date().toISOString(),
        });
      }

      const message = await ComplaintService.addMessage({
        orgId,
        complaintId: id,
        senderUserId,
        senderType,
        messageText,
        isInternalNote,
      });

      return res.status(201).json({
        success: true,
        message: 'Message added to ticket conversation thread.',
        data: message,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async submitFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { ratingStars, isIssueResolved, comments } = req.body;
      const orgId = req.orgId!;
      const customerId = req.user!.userId;

      if (!ratingStars || ratingStars < 1 || ratingStars > 5) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Rating stars must be an integer between 1 and 5.',
          timestamp: new Date().toISOString(),
        });
      }

      const feedback = await ComplaintService.submitCustomerFeedback({
        orgId,
        complaintId: id,
        customerId,
        ratingStars,
        isIssueResolved,
        comments,
      });

      return res.status(201).json({
        success: true,
        message: 'Customer feedback submitted successfully.',
        data: feedback,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

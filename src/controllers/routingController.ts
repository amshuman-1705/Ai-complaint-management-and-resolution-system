import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { IntelligentRoutingService } from '../services/intelligentRoutingService';

export class RoutingController {
  /**
   * Recommend Department & Candidate Agents for a Complaint Ticket
   */
  static async recommendRoutingOptions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orgId = req.orgId!;

      const result = await IntelligentRoutingService.evaluateRoutingOptions(orgId, id);

      return res.status(200).json({
        success: true,
        message: 'Intelligent routing evaluation complete.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Execute Workload-Aware Automatic Assignment for a Complaint Ticket
   */
  static async autoAssign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orgId = req.orgId!;
      const assignedByUserId = req.user?.userId;

      const result = await IntelligentRoutingService.executeAutomaticAssignment(orgId, id, assignedByUserId);

      return res.status(200).json({
        success: true,
        message: 'Workload-aware automatic assignment executed successfully.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Execute Manual Reassignment of a Complaint Ticket
   */
  static async reassign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { newDeptId, newAgentId, reason } = req.body;
      const orgId = req.orgId!;
      const reassignedByUserId = req.user!.userId;

      if (!newDeptId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: newDeptId and reason are required.',
          timestamp: new Date().toISOString(),
        });
      }

      const result = await IntelligentRoutingService.reassignComplaint({
        orgId,
        complaintId: id,
        newDeptId,
        newAgentId,
        reassignedByUserId,
        reassignmentReason: reason,
      });

      return res.status(200).json({
        success: true,
        message: 'Complaint manually reassigned successfully.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Execute Escalation of a Complaint Ticket to Management
   */
  static async escalate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const orgId = req.orgId!;
      const escalatedByUserId = req.user?.userId;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Escalation reason is required.',
          timestamp: new Date().toISOString(),
        });
      }

      const result = await IntelligentRoutingService.escalateComplaint({
        orgId,
        complaintId: id,
        escalatedByUserId,
        escalationReason: reason,
      });

      return res.status(200).json({
        success: true,
        message: 'Complaint escalated to management successfully.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

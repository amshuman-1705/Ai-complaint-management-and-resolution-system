import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';

export class AuditController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const logs = await AuditService.getOrgAuditLogs(orgId);
      return res.status(200).json({
        success: true,
        message: 'Audit logs fetched successfully.',
        data: logs,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

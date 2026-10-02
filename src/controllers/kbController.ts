import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { KBService } from '../services/kbService';

export class KBController {
  static async upload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { deptId, title, content } = req.body;
      const orgId = req.orgId!;
      const actorUserId = req.user?.userId;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Title and Content are required.',
          timestamp: new Date().toISOString(),
        });
      }

      const doc = await KBService.uploadDocument({
        orgId,
        deptId,
        title,
        content,
        actorUserId,
      });

      return res.status(201).json({
        success: true,
        message: 'Knowledge base document uploaded & chunk vector indexed successfully.',
        data: doc,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const docs = await KBService.listDocuments(orgId);
      return res.status(200).json({
        success: true,
        message: 'Knowledge base documents listed successfully.',
        data: docs,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

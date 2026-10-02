import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { NotificationService } from '../services/notificationService';

export class NotificationController {
  static async listMyNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notifications = await NotificationService.getUserNotifications(userId);
      return res.status(200).json({
        success: true,
        message: 'Notifications fetched successfully.',
        data: notifications,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const notification = await NotificationService.markNotificationRead(id);
      return res.status(200).json({
        success: true,
        message: 'Notification marked as read.',
        data: notification,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

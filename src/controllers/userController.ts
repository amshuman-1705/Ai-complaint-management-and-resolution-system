import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { UserService } from '../services/userService';
import { UserRole } from '../types';

export class UserController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const role = req.query.role as UserRole | undefined;

      const users = await UserService.listOrgUsers(orgId, role);
      return res.status(200).json({
        success: true,
        message: 'Users listed successfully.',
        data: users,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserProfile(id);
      return res.status(200).json({
        success: true,
        message: 'User profile fetched successfully.',
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuthService } from '../services/authService';

export class AuthController {
  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { orgId, deptId, roleName, email, password, fullName, employeeCode } = req.body;

      if (!orgId || !email || !password || !fullName || !roleName) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Missing required fields (orgId, email, password, fullName, roleName).',
          timestamp: new Date().toISOString(),
        });
      }

      const user = await AuthService.registerUser({
        orgId,
        deptId,
        roleName,
        email,
        password,
        fullName,
        employeeCode,
      });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        data: {
          id: user.id,
          orgId: user.orgId,
          email: user.email,
          fullName: user.fullName,
          role: user.role.name,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { orgSlug, email, password } = req.body;

      if (!orgSlug || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Missing orgSlug, email, or password.',
          timestamp: new Date().toISOString(),
        });
      }

      const result = await AuthService.login({ orgSlug, email, password });

      return res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

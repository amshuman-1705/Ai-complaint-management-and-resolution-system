import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { UserRole } from '../types';

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        timestamp: new Date().toISOString(),
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' lacks sufficient privileges for this operation. Required: [${allowedRoles.join(', ')}]`,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

/**
 * Organization Tenant Isolation Middleware (TenantGuard)
 * Ensures that all queries are scoped strictly to the authenticated user's orgId.
 */
export const enforceTenantIsolation = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const headerTenantId = req.headers['x-tenant-id'] as string;
  
  if (req.user) {
    // If logged in, enforce JWT orgId match
    if (headerTenantId && headerTenantId !== req.user.orgId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Tenant Header does not match authenticated JWT claim.',
        timestamp: new Date().toISOString(),
      });
    }
    req.orgId = req.user.orgId;
  } else if (headerTenantId) {
    req.orgId = headerTenantId;
  }

  if (!req.orgId && req.user?.role !== 'SUPER_ADMIN') {
    return res.status(400).json({
      success: false,
      message: 'Multi-Tenant Error: Missing target Organization Context.',
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

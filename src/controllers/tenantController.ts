import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { TenantService } from '../services/tenantService';

export class TenantController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, domainType, slug } = req.body;

      if (!name || !domainType || !slug) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Missing name, domainType, or slug.',
          timestamp: new Date().toISOString(),
        });
      }

      const org = await TenantService.registerOrganization({ name, domainType, slug });

      return res.status(201).json({
        success: true,
        message: 'Organization registered successfully.',
        data: org,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const org = await TenantService.getOrganization(id);
      return res.status(200).json({
        success: true,
        message: 'Organization fetched successfully.',
        data: org,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgs = await TenantService.listOrganizations();
      return res.status(200).json({
        success: true,
        message: 'Organizations listed successfully.',
        data: orgs,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

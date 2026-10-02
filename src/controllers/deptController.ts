import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { DeptService } from '../services/deptService';

export class DeptController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, code, baseSlaHours } = req.body;
      const orgId = req.orgId!;

      if (!name || !code) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Missing department name or code.',
          timestamp: new Date().toISOString(),
        });
      }

      const dept = await DeptService.createDepartment({ orgId, name, code, baseSlaHours }, req.user?.userId);

      return res.status(201).json({
        success: true,
        message: 'Department created successfully.',
        data: dept,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const depts = await DeptService.listDepartments(orgId);
      return res.status(200).json({
        success: true,
        message: 'Departments listed successfully.',
        data: depts,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

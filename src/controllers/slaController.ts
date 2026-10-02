import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { SLAService } from '../services/slaService';

export class SLAController {
  static async createRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { deptId, priority, targetResolutionHours } = req.body;
      const orgId = req.orgId!;

      if (!priority || !targetResolutionHours) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Priority and targetResolutionHours are required.',
          timestamp: new Date().toISOString(),
        });
      }

      const rule = await SLAService.createSLARule({
        orgId,
        deptId,
        priority,
        targetResolutionHours,
      });

      return res.status(201).json({
        success: true,
        message: 'SLA rule created successfully.',
        data: rule,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async listRules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const rules = await SLAService.listSLARules(orgId);
      return res.status(200).json({
        success: true,
        message: 'SLA rules listed successfully.',
        data: rules,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSLACountdown(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orgId = req.orgId!;

      const countdown = await SLAService.getSLACountdown(orgId, id);

      return res.status(200).json({
        success: true,
        message: 'SLA countdown status retrieved successfully.',
        data: countdown,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async predictSLARisk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orgId = req.orgId!;

      const risk = await SLAService.predictSLABreachRisk(orgId, id);

      return res.status(200).json({
        success: true,
        message: 'Predictive SLA breach risk evaluated successfully.',
        data: risk,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async batchScanAndAutoEscalate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const summary = await SLAService.scanAndAutoEscalateSLABreaches(orgId);

      return res.status(200).json({
        success: true,
        message: 'SLA batch breach scan & auto-escalation complete.',
        data: summary,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async checkBreach(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orgId = req.orgId!;

      const result = await SLAService.checkSLABreach(id, orgId);

      return res.status(200).json({
        success: true,
        message: 'SLA breach evaluation complete.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

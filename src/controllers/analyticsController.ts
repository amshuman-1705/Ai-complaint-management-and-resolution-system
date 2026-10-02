import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AnalyticsService } from '../services/analyticsService';

export class AnalyticsController {
  /**
   * Get Organization Analytics Metrics
   */
  static async getOrganizationAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const data = await AnalyticsService.getOrganizationAnalytics(orgId);

      return res.status(200).json({
        success: true,
        message: 'Organization analytics retrieved successfully.',
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get AI Engine Intelligence Metrics
   */
  static async getAIAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const data = await AnalyticsService.getAIAnalytics(orgId);

      return res.status(200).json({
        success: true,
        message: 'AI engine analytics retrieved successfully.',
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Detect Emerging Issues & Topic Clusters
   */
  static async detectEmergingIssues(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const data = await AnalyticsService.detectEmergingIssues(orgId);

      return res.status(200).json({
        success: true,
        message: 'Emerging issue detection completed successfully.',
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

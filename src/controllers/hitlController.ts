import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { HITLLearningService } from '../services/hitlLearningService';

export class HITLController {
  /**
   * Submit Comprehensive Agent Review & Corrections
   */
  static async submitCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isCategoryOverridden, correctedCategory, correctedPriority, correctedDeptId, correctedSentiment, editedRagResponse, isRejected, feedbackNotes } = req.body;
      const orgId = req.orgId!;
      const agentId = req.user!.userId;

      const result = await HITLLearningService.submitAgentCorrection({
        orgId,
        complaintId: id,
        agentId,
        isCategoryOverridden,
        correctedCategory,
        correctedPriority,
        correctedDeptId,
        correctedSentiment,
        editedRagResponse,
        isRejected,
        feedbackNotes,
      });

      return res.status(201).json({
        success: true,
        message: 'Agent correction & feedback logged successfully.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Continuous Learning Feedback Dataset
   */
  static async getFeedbackDataset(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const dataset = await HITLLearningService.getFeedbackDataset(orgId);

      return res.status(200).json({
        success: true,
        message: 'Feedback dataset retrieved successfully.',
        data: dataset,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get AI Accuracy & Monitoring Dashboard
   */
  static async getAIMonitoring(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const metrics = await HITLLearningService.getAIMonitoringDashboard(orgId);

      return res.status(200).json({
        success: true,
        message: 'AI monitoring metrics retrieved successfully.',
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Safe Model Retraining Governance Status
   */
  static async getRetrainingGovernance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const status = await HITLLearningService.getRetrainingGovernanceStatus(orgId);

      return res.status(200).json({
        success: true,
        message: 'Model retraining governance status retrieved successfully.',
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Trigger Candidate Model Retraining Pipeline
   */
  static async trainCandidateModel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.orgId!;
      const result = await HITLLearningService.triggerCandidateModelTraining(orgId);

      return res.status(200).json({
        success: true,
        message: 'Candidate model retraining pipeline executed.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Promote Candidate Model to Production
   */
  static async promoteCandidateModel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { candidateVersion } = req.body;
      const orgId = req.orgId!;
      const promotedByUserId = req.user!.userId;

      if (!candidateVersion) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: candidateVersion is required.',
          timestamp: new Date().toISOString(),
        });
      }

      const result = await HITLLearningService.promoteCandidateToProduction(orgId, candidateVersion, promotedByUserId);

      return res.status(200).json({
        success: true,
        message: 'Candidate model promoted to Production.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

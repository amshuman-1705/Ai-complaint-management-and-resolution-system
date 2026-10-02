import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { AIPipelineOrchestrator } from '../ai_engine/pipelineOrchestrator';
import { ComplaintRepository } from '../repositories/complaintRepository';
import { prisma } from '../config/db';
import { AuditRepository } from '../repositories/auditRepository';

export class AIController {
  /**
   * Execute full 15-stage AI Pipeline on a complaint
   */
  static async processComplaintAI(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orgId = req.orgId!;

      const aiStructuredResult = await AIPipelineOrchestrator.processComplaintPipeline(orgId, id);

      return res.status(200).json({
        success: true,
        message: 'AI Complaint Intelligence Pipeline executed successfully.',
        data: aiStructuredResult,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Fetch stored AI predictions, XAI explanations, duplicate tickets, and RAG draft
   */
  static async getAIInsights(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orgId = req.orgId!;

      const complaint = await ComplaintRepository.findById(id);
      if (!complaint || complaint.orgId !== orgId) {
        return res.status(404).json({
          success: false,
          message: 'Complaint ticket not found.',
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        message: 'AI insights fetched successfully.',
        data: {
          complaintId: complaint.id,
          ticketNumber: complaint.ticketNumber,
          prediction: complaint.aiPrediction,
          explanation: complaint.aiExplanation,
          ragRecommendations: complaint.resolutionRecs,
          customerFeedback: complaint.customerFeedback,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Agent Human-in-the-Loop Override API
   * Allows support agents to correct AI category/priority predictions and record corrections into agent_feedback.
   */
  static async submitAgentCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { correctedCategory, editedRagResponse, isCategoryOverridden } = req.body;
      const orgId = req.orgId!;
      const agentId = req.user!.userId;

      const complaint = await ComplaintRepository.findById(id);
      if (!complaint || complaint.orgId !== orgId) {
        return res.status(404).json({
          success: false,
          message: 'Complaint ticket not found.',
          timestamp: new Date().toISOString(),
        });
      }

      const feedback = await ComplaintRepository.createAgentFeedback({
        orgId,
        complaintId: id,
        agentId,
        isCategoryOverridden: isCategoryOverridden || false,
        originalAiCategory: complaint.category?.name || 'Unclassified',
        correctedCategory: correctedCategory || complaint.category?.name,
        editedRagResponse,
      });

      await AuditRepository.log({
        orgId,
        userId: agentId,
        actionType: 'AGENT_AI_OVERRIDE_CORRECTION',
        targetEntity: 'agent_feedback',
        details: JSON.stringify({
          complaintId: id,
          correctedCategory,
          hasEditedResponse: !!editedRagResponse,
        }),
      });

      return res.status(201).json({
        success: true,
        message: 'Agent AI correction recorded for continuous model training.',
        data: feedback,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { TenantKBIngestionEngine } from '../ai_engine/tenantKBIngestion';
import { TenantRAGEngine } from '../ai_engine/tenantRAGEngine';
import { ComplaintService } from '../services/complaintService';
import { ComplaintRepository } from '../repositories/complaintRepository';

export class RAGController {
  /**
   * Upload & Index Organization-Specific Knowledge Base Document
   */
  static async uploadKBDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { deptId, title, content, documentType } = req.body;
      const orgId = req.orgId!;
      const uploadedByUserId = req.user?.userId;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Validation Error: Title and Content are required.',
          timestamp: new Date().toISOString(),
        });
      }

      const doc = await TenantKBIngestionEngine.ingestDocument({
        orgId,
        deptId,
        title,
        content,
        documentType,
        uploadedByUserId,
      });

      return res.status(201).json({
        success: true,
        message: 'Organization Knowledge Base document uploaded & vector indexed successfully.',
        data: doc,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Execute RAG Resolution Pipeline for a Complaint Ticket
   */
  static async executeRAGResolution(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const orgId = req.orgId!;

      const result = await TenantRAGEngine.executeRAGPipeline(orgId, id);

      return res.status(200).json({
        success: true,
        message: 'Organization-Scoped RAG Resolution Pipeline executed successfully.',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Human Agent RAG Resolution Approval & Customer Dispatch Endpoint
   */
  static async approveRAGResolution(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { approvedResponseText } = req.body;
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

      const responseText = approvedResponseText || 'Resolution confirmed by Agent.';

      // Add Message to Customer Conversation Thread
      await ComplaintService.addMessage({
        orgId,
        complaintId: id,
        senderUserId: agentId,
        senderType: 'AGENT',
        messageText: responseText,
      });

      // Update Ticket Status to RESOLVED
      const updated = await ComplaintService.updateStatus({
        orgId,
        complaintId: id,
        userId: agentId,
        newStatus: 'RESOLVED',
        reason: 'RAG Resolution approved by Agent and dispatched to Customer.',
      });

      return res.status(200).json({
        success: true,
        message: 'RAG Resolution approved by Agent and sent to Customer.',
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
}

import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { TenantController } from '../controllers/tenantController';
import { DeptController } from '../controllers/deptController';
import { UserController } from '../controllers/userController';
import { ComplaintController } from '../controllers/complaintController';
import { SLAController } from '../controllers/slaController';
import { RoutingController } from '../controllers/routingController';
import { KBController } from '../controllers/kbController';
import { RAGController } from '../controllers/ragController';
import { NotificationController } from '../controllers/notificationController';
import { AuditController } from '../controllers/auditController';
import { AIController } from '../controllers/aiController';
import { AnalyticsController } from '../controllers/analyticsController';
import { HITLController } from '../controllers/hitlController';

import { authenticateJWT } from '../middleware/authMiddleware';
import { enforceTenantIsolation } from '../middleware/tenantMiddleware';
import { requireRoles } from '../middleware/rbacMiddleware';

const router = Router();

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);

// ==========================================
// 2. TENANT & ORGANIZATION MANAGEMENT
// ==========================================
router.post('/tenants', authenticateJWT, requireRoles(['SUPER_ADMIN']), TenantController.create);
router.get('/tenants', authenticateJWT, requireRoles(['SUPER_ADMIN']), TenantController.list);
router.get('/tenants/:id', authenticateJWT, enforceTenantIsolation, TenantController.getById);

// ==========================================
// 3. DEPARTMENT MANAGEMENT
// ==========================================
router.post('/departments', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN']), DeptController.create);
router.get('/departments', authenticateJWT, enforceTenantIsolation, DeptController.list);

// ==========================================
// 4. USER & EMPLOYEE ROSTER MANAGEMENT
// ==========================================
router.get('/users', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN', 'DEPT_MANAGER', 'SUPER_ADMIN']), UserController.list);
router.get('/users/:id', authenticateJWT, enforceTenantIsolation, UserController.getById);

// ==========================================
// 5. COMPLAINT INTAKE, TRACKING & LIFECYCLE
// ==========================================
router.post('/complaints', authenticateJWT, enforceTenantIsolation, requireRoles(['CUSTOMER']), ComplaintController.submit);
router.get('/complaints', authenticateJWT, enforceTenantIsolation, ComplaintController.list);
router.get('/complaints/:id', authenticateJWT, enforceTenantIsolation, ComplaintController.getById);
router.patch('/complaints/:id/status', authenticateJWT, enforceTenantIsolation, requireRoles(['AGENT', 'DEPT_MANAGER', 'ORG_ADMIN']), ComplaintController.updateStatus);
router.post('/complaints/:id/assign', authenticateJWT, enforceTenantIsolation, requireRoles(['DEPT_MANAGER', 'ORG_ADMIN']), ComplaintController.assign);
router.post('/complaints/:id/messages', authenticateJWT, enforceTenantIsolation, ComplaintController.addMessage);
router.post('/complaints/:id/feedback', authenticateJWT, enforceTenantIsolation, requireRoles(['CUSTOMER']), ComplaintController.submitFeedback);

// ==========================================
// 6. AI COMPLAINT INTELLIGENCE ENGINE & XAI
// ==========================================
router.post('/complaints/:id/ai-analyze', authenticateJWT, enforceTenantIsolation, requireRoles(['AGENT', 'DEPT_MANAGER', 'ORG_ADMIN', 'CUSTOMER']), AIController.processComplaintAI);
router.get('/complaints/:id/ai-insights', authenticateJWT, enforceTenantIsolation, AIController.getAIInsights);
router.post('/complaints/:id/ai-override', authenticateJWT, enforceTenantIsolation, requireRoles(['AGENT', 'DEPT_MANAGER', 'ORG_ADMIN']), AIController.submitAgentCorrection);

// ==========================================
// 7. INTELLIGENT ROUTING & WORKLOAD ASSIGNMENT
// ==========================================
router.get('/routing/recommend/:id', authenticateJWT, enforceTenantIsolation, requireRoles(['AGENT', 'DEPT_MANAGER', 'ORG_ADMIN']), RoutingController.recommendRoutingOptions);
router.post('/routing/auto-assign/:id', authenticateJWT, enforceTenantIsolation, requireRoles(['DEPT_MANAGER', 'ORG_ADMIN']), RoutingController.autoAssign);
router.post('/routing/reassign/:id', authenticateJWT, enforceTenantIsolation, requireRoles(['DEPT_MANAGER', 'ORG_ADMIN']), RoutingController.reassign);
router.post('/routing/escalate/:id', authenticateJWT, enforceTenantIsolation, requireRoles(['AGENT', 'DEPT_MANAGER', 'ORG_ADMIN']), RoutingController.escalate);

// ==========================================
// 8. SLA RULES, COUNTDOWN & PREDICTIVE ESCALATIONS
// ==========================================
router.post('/sla/rules', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN']), SLAController.createRule);
router.get('/sla/rules', authenticateJWT, enforceTenantIsolation, SLAController.listRules);
router.get('/sla/countdown/:id', authenticateJWT, enforceTenantIsolation, SLAController.getSLACountdown);
router.get('/sla/predictive-risk/:id', authenticateJWT, enforceTenantIsolation, SLAController.predictSLARisk);
router.post('/sla/batch-scan', authenticateJWT, enforceTenantIsolation, requireRoles(['DEPT_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']), SLAController.batchScanAndAutoEscalate);
router.post('/sla/check-breach/:id', authenticateJWT, enforceTenantIsolation, requireRoles(['AGENT', 'DEPT_MANAGER', 'ORG_ADMIN']), SLAController.checkBreach);

// ==========================================
// 9. KNOWLEDGE BASE & RAG RESOLUTION ENGINE
// ==========================================
router.post('/kb/upload', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN', 'DEPT_MANAGER']), KBController.upload);
router.get('/kb/documents', authenticateJWT, enforceTenantIsolation, KBController.list);

router.post('/rag/kb-upload', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN', 'DEPT_MANAGER']), RAGController.uploadKBDocument);
router.post('/rag/resolve-complaint/:id', authenticateJWT, enforceTenantIsolation, requireRoles(['AGENT', 'DEPT_MANAGER', 'ORG_ADMIN']), RAGController.executeRAGResolution);
router.post('/rag/approve-resolution/:id', authenticateJWT, enforceTenantIsolation, requireRoles(['AGENT', 'DEPT_MANAGER', 'ORG_ADMIN']), RAGController.approveRAGResolution);

// ==========================================
// 10. ANALYTICS & EMERGING ISSUE DETECTION
// ==========================================
router.get('/analytics/org', authenticateJWT, enforceTenantIsolation, requireRoles(['DEPT_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']), AnalyticsController.getOrganizationAnalytics);
router.get('/analytics/ai', authenticateJWT, enforceTenantIsolation, requireRoles(['DEPT_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']), AnalyticsController.getAIAnalytics);
router.get('/analytics/emerging-issues', authenticateJWT, enforceTenantIsolation, requireRoles(['DEPT_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']), AnalyticsController.detectEmergingIssues);

// ==========================================
// 11. HUMAN-IN-THE-LOOP LEARNING & MODEL RETRAINING GOVERNANCE
// ==========================================
router.post('/hitl/correction/:id', authenticateJWT, enforceTenantIsolation, requireRoles(['AGENT', 'DEPT_MANAGER', 'ORG_ADMIN']), HITLController.submitCorrection);
router.get('/hitl/feedback-dataset', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN', 'SUPER_ADMIN']), HITLController.getFeedbackDataset);
router.get('/hitl/ai-monitoring', authenticateJWT, enforceTenantIsolation, requireRoles(['DEPT_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']), HITLController.getAIMonitoring);
router.get('/hitl/retraining-governance', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN', 'SUPER_ADMIN']), HITLController.getRetrainingGovernance);
router.post('/hitl/train-candidate', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN', 'SUPER_ADMIN']), HITLController.trainCandidateModel);
router.post('/hitl/promote-candidate', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN', 'SUPER_ADMIN']), HITLController.promoteCandidateModel);

// ==========================================
// 12. NOTIFICATIONS
// ==========================================
router.get('/notifications', authenticateJWT, NotificationController.listMyNotifications);
router.patch('/notifications/:id/read', authenticateJWT, NotificationController.markRead);

// ==========================================
// 13. AUDIT LOGGING & COMPLIANCE
// ==========================================
router.get('/audit-logs', authenticateJWT, enforceTenantIsolation, requireRoles(['ORG_ADMIN', 'SUPER_ADMIN']), AuditController.list);

export default router;

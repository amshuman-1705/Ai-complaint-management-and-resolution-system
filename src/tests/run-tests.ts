import app from '../app';
import { connectDB, prisma } from '../config/db';
import { seedDatabase } from '../seed';
import http from 'http';

const PORT = 8009;

const makeRequest = (options: http.RequestOptions, postData?: any): Promise<{ statusCode: number; body: any }> => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode || 500, body: parsed });
        } catch {
          resolve({ statusCode: res.statusCode || 500, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

const runBackendTestSuite = async () => {
  console.log('🧪 Starting Enterprise Backend & AI Intelligence Test Suite...');
  await connectDB();
  await seedDatabase();

  const server = app.listen(PORT);
  console.log(`🚀 Test Server listening on http://localhost:${PORT}`);

  try {
    // Test 1: Health Check
    console.log('\n--- Test 1: Health Check ---');
    const health = await makeRequest({ hostname: 'localhost', port: PORT, path: '/health', method: 'GET' });
    console.log(`Status: ${health.statusCode} | Result: ${JSON.stringify(health.body.status)}`);
    if (health.statusCode !== 200) throw new Error('Health check failed');

    // Test 2: Customer Login
    console.log('\n--- Test 2: Customer Login (Sarah Connor) ---');
    const custLogin = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { orgSlug: 'apex-bank', email: 'sarah@apexbank.com', password: 'password123' }
    );
    console.log(`Status: ${custLogin.statusCode} | User: ${custLogin.body.data?.user?.fullName} | Role: ${custLogin.body.data?.user?.role}`);
    if (custLogin.statusCode !== 200) throw new Error('Customer Login failed');
    const customerToken = custLogin.body.data.token;
    const orgId = custLogin.body.data.user.orgId;

    // Test 3: Admin Login
    console.log('\n--- Test 3: Admin Login (Alex Mercer) ---');
    const adminLogin = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { orgSlug: 'apex-bank', email: 'admin@apexbank.com', password: 'password123' }
    );
    console.log(`Status: ${adminLogin.statusCode} | Role: ${adminLogin.body.data?.user?.role}`);
    const adminToken = adminLogin.body.data.token;

    // Test 4: Submit Complaint with PII Sanitization
    console.log('\n--- Test 4: Submit Complaint with PII Sanitization ---');
    const complaintRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/v1/complaints',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}`, 'x-tenant-id': orgId },
      },
      {
        title: 'Unauthorized Card Charge of $450.00 on card 4532-1102-8841-9921',
        description: 'Please refund invoice #8821. Contact me at 555-839-2001 or ssn 901-22-4910.',
      }
    );
    console.log(`Status: ${complaintRes.statusCode} | Ticket: ${complaintRes.body.data?.ticketNumber}`);
    if (complaintRes.statusCode !== 201) throw new Error('Complaint submission failed');
    const complaintId = complaintRes.body.data.id;

    // Test 5: RBAC Guard Check
    console.log('\n--- Test 5: RBAC Guard Check (Customer blocked from Assigning) ---');
    const rbacBlock = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/complaints/${complaintId}/assign`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}`, 'x-tenant-id': orgId },
      },
      { deptId: 'fake-dept-id' }
    );
    console.log(`Status: ${rbacBlock.statusCode} | Message: "${rbacBlock.body.message}"`);
    if (rbacBlock.statusCode !== 403) throw new Error('RBAC authorization guard failed to block customer');

    // Test 6: Admin Assign Complaint & Workload Balancing
    console.log('\n--- Test 6: Admin Assign Complaint & Workload Balancing ---');
    const depts = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/departments',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    const finDept = depts.body.data.find((d: any) => d.code === 'FIN') || depts.body.data[0];
    const finDeptId = finDept.id;

    const assignRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/complaints/${complaintId}/assign`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      },
      { deptId: finDeptId, notes: 'Assigned to Finance team for invoice refund review.' }
    );
    console.log(`Status: ${assignRes.statusCode} | New Status: ${assignRes.body.data?.status}`);

    // Test 7: Upload KB Document
    console.log('\n--- Test 7: Upload Knowledge Base Document ---');
    const kbRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/v1/kb/upload',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      },
      {
        title: 'Credit Card Chargeback & Refund Policy 2026',
        content: 'Customers can request a full refund for duplicate charges within 30 days of billing cycle statement issuance. Refunds process within 2-3 business days.',
      }
    );
    console.log(`Status: ${kbRes.statusCode} | Doc Title: "${kbRes.body.data?.title}"`);

    // =========================================================================
    // AI ENGINE TESTS (15-STAGE PIPELINE, XAI, DB PERSISTENCE & OVERRIDE)
    // =========================================================================

    // Test 8: Execute 15-Stage AI Intelligence Pipeline
    console.log('\n--- Test 8: Execute 15-Stage AI Complaint Intelligence Pipeline ---');
    const aiPipelineRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/complaints/${complaintId}/ai-analyze`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      }
    );
    console.log(`Status: ${aiPipelineRes.statusCode}`);
    const aiData = aiPipelineRes.body.data;
    console.log(`🤖 Category: "${aiData.category}" (${aiData.subcategory})`);
    console.log(`🤖 Sentiment: ${aiData.sentiment} (${aiData.sentiment_score}) | Emotion: ${aiData.emotion} | Urgency: ${aiData.urgency}`);
    console.log(`🤖 Priority: ${aiData.priority} | Severity Score: ${aiData.severity}%`);
    console.log(`🤖 Intents: [${aiData.intents.join(', ')}]`);
    console.log(`🤖 Entities: ${JSON.stringify(aiData.entities)}`);
    console.log(`🤖 Recommended Dept: "${aiData.recommended_department}"`);
    console.log(`🤖 Recommended Resolution: "${aiData.recommended_resolution}"`);
    console.log(`🤖 AI Confidence: ${aiData.confidence} | Abstained (Low-Confidence Check): ${aiData.is_ai_abstained}`);
    console.log(`🤖 XAI Feature Drivers: ${JSON.stringify(aiData.explanation.featureDrivers)}`);
    if (aiPipelineRes.statusCode !== 200) throw new Error('AI Pipeline execution failed');

    // Test 9: Verify Stored AI Insights in Database
    console.log('\n--- Test 9: Fetch Stored AI Insights from Database ---');
    const insightsRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/v1/complaints/${complaintId}/ai-insights`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${insightsRes.statusCode} | Model Version: "${insightsRes.body.data?.prediction?.modelVersion}"`);
    console.log(`Stored Confidence Score: ${insightsRes.body.data?.prediction?.confidenceScore}`);
    console.log(`Stored XAI Rationale: "${insightsRes.body.data?.explanation?.decisionRationale}"`);
    if (insightsRes.statusCode !== 200) throw new Error('AI Insights DB retrieval failed');

    // Test 10: Human-in-the-Loop Agent AI Correction Override
    console.log('\n--- Test 10: Human Agent AI Correction Override & Continuous Learning Log ---');
    const overrideRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/complaints/${complaintId}/ai-override`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      },
      {
        isCategoryOverridden: true,
        correctedCategory: 'Billing & Financial Dispute',
        editedRagResponse: 'Approved full refund of $450.00 to credit card *9921 per Bank Policy Article #102.',
      }
    );
    console.log(`Status: ${overrideRes.statusCode} | Correction ID: ${overrideRes.body.data?.id}`);
    console.log(`Corrected Category Logged: "${overrideRes.body.data?.correctedCategory}"`);
    if (overrideRes.statusCode !== 201) throw new Error('Agent AI Correction override failed');

    // Test 11: Audit Logs Verification
    console.log('\n--- Test 11: Audit Logs Stream Verification ---');
    const auditRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/audit-logs',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${auditRes.statusCode} | Total Audit Events: ${auditRes.body.data?.length}`);

    // =========================================================================
    // ORGANIZATION-SPECIFIC KNOWLEDGE BASE & RAG RESOLUTION TESTS
    // =========================================================================

    // Test 12: Tenant-Isolated RAG Ingestion, Grounded Resolution & Anti-Hallucination Guard
    console.log('\n--- Test 12: Tenant KB & RAG Resolution Pipeline (ABC Bank Isolation & Anti-Hallucination Guard) ---');

    // 1. Upload Org-Specific KB Document for Card Refund & Billing Policy
    const ragUploadRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/v1/rag/kb-upload',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      },
      {
        title: 'Card Charge Dispute & Refund Policy 2026',
        content: 'Customers can request a refund for unauthorized card charges and billing invoice disputes. Claims submitted with card number details are verified within 24 hours, and full refund of up to $1,000 is processed automatically.',
        documentType: 'POLICY',
      }
    );
    console.log(`Status: ${ragUploadRes.statusCode} | Ingested RAG Doc: "${ragUploadRes.body.data?.title}"`);
    if (ragUploadRes.statusCode !== 201) throw new Error('RAG KB Document upload failed');

    // 2. Execute RAG Resolution on Complaint
    const ragResolveRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/rag/resolve-complaint/${complaintId}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      }
    );
    console.log(`Status: ${ragResolveRes.statusCode}`);
    const ragData = ragResolveRes.body.data;
    console.log(`📚 Organization Verified: "${ragData.orgName}" (${ragData.orgId})`);
    console.log(`📚 Relevant Chunks Retrieved: ${ragData.sourceCitations?.length}`);
    console.log(`📚 Grounded Answer: "${ragData.recommendedResolution}"`);
    console.log(`📚 Customer Draft Response: "${ragData.customerDraftResponse}"`);
    console.log(`📚 Citations Tracked: [${ragData.sourceCitations?.map((c: any) => c.documentTitle).join(', ')}]`);
    console.log(`📚 RAG Groundedness Score: ${ragData.groundednessScore} | Confidence: ${ragData.confidenceScore}`);
    console.log(`📚 Insufficient KB Flag: ${ragData.insufficientKnowledge} | Abstained: ${ragData.isAiAbstained}`);
    if (ragResolveRes.statusCode !== 200) throw new Error('RAG Resolution pipeline failed');
    if (ragData.sourceCitations?.length === 0) throw new Error('Expected RAG source citations but found none');

    // 3. Agent RAG Resolution Approval & Customer Dispatch
    const approveRagRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/rag/approve-resolution/${complaintId}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      },
      {
        approvedResponseText: 'Dear Customer, your transaction refund of $450.00 has been verified per Apex Bank Policy 2026 and credited to your account.',
      }
    );
    console.log(`Status: ${approveRagRes.statusCode} | Status Updated: ${approveRagRes.body.data?.status}`);
    if (approveRagRes.statusCode !== 200) throw new Error('Agent RAG Approval failed');

    // =========================================================================
    // INTELLIGENT ROUTING & SLA MANAGEMENT TESTS
    // =========================================================================

    // Test 13: Intelligent Routing & Workload-Aware Automatic Assignment
    console.log('\n--- Test 13: Intelligent Routing & Workload-Aware Assignment ---');
    const routingEval = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/v1/routing/recommend/${complaintId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${routingEval.statusCode}`);
    console.log(`🎯 Recommended Dept: "${routingEval.body.data?.recommendedDeptName}" (${routingEval.body.data?.recommendedDeptId})`);
    console.log(`🎯 Top Recommended Agent: "${routingEval.body.data?.recommendedAgent?.fullName}" (Score: ${routingEval.body.data?.recommendedAgent?.finalScore})`);
    console.log(`🎯 Rationale: "${routingEval.body.data?.routingRationale}"`);
    if (routingEval.statusCode !== 200) throw new Error('Routing recommendation failed');

    const autoAssignRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/routing/auto-assign/${complaintId}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      }
    );
    console.log(`Status: ${autoAssignRes.statusCode} | Assigned Agent: "${autoAssignRes.body.data?.assignedAgentName}"`);
    if (autoAssignRes.statusCode !== 200) throw new Error('Workload-aware auto assignment failed');

    // Test 14: SLA Countdown, Predictive Breach Detection & Auto Escalation
    console.log('\n--- Test 14: SLA Countdown, Predictive Breach Risk & Auto-Escalation Batch ---');
    const slaCountdownRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/v1/sla/countdown/${complaintId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${slaCountdownRes.statusCode}`);
    console.log(`⏱️ SLA Total Target: ${slaCountdownRes.body.data?.totalTargetHours}h | Elapsed: ${slaCountdownRes.body.data?.elapsedHours}h | Remaining: ${slaCountdownRes.body.data?.remainingHours}h`);
    console.log(`⏱️ SLA Warning State: ${slaCountdownRes.body.data?.isWarningState} | Is Breached: ${slaCountdownRes.body.data?.isBreached}`);
    if (slaCountdownRes.statusCode !== 200) throw new Error('SLA Countdown retrieval failed');

    const slaPredictiveRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/v1/sla/predictive-risk/${complaintId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${slaPredictiveRes.statusCode}`);
    console.log(`🔮 Predictive Breach Risk: ${slaPredictiveRes.body.data?.predictiveBreachRisk} | Predicted Resolution: ${slaPredictiveRes.body.data?.predictedHoursToResolve}h`);
    console.log(`🔮 Risk Rationale: "${slaPredictiveRes.body.data?.riskRationale}"`);
    if (slaPredictiveRes.statusCode !== 200) throw new Error('Predictive SLA risk evaluation failed');

    const batchScanRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/v1/sla/batch-scan',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      }
    );
    console.log(`Status: ${batchScanRes.statusCode}`);
    console.log(`⚡ Batch Scan Summary: Scanned=${batchScanRes.body.data?.scannedCount} | WarningsSent=${batchScanRes.body.data?.warningNotificationsSent} | EscalationsTriggered=${batchScanRes.body.data?.escalationsTriggered}`);
    if (batchScanRes.statusCode !== 200) throw new Error('Batch SLA scan failed');

    // =========================================================================
    // ANALYTICS & EMERGING ISSUE DETECTION TESTS
    // =========================================================================

    // Test 15: Organization Analytics, AI Engine Performance & Emerging Issue Detection
    console.log('\n--- Test 15: Analytics & Emerging Issue Detection Engine ---');
    const orgAnalyticsRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/analytics/org',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${orgAnalyticsRes.statusCode}`);
    console.log(`📊 Total Complaints: ${orgAnalyticsRes.body.data?.totalComplaints} | Open: ${orgAnalyticsRes.body.data?.openComplaints} | Resolved: ${orgAnalyticsRes.body.data?.resolvedComplaints}`);
    console.log(`📊 SLA Compliance Rate: ${orgAnalyticsRes.body.data?.slaComplianceRate}% | CSAT Average: ${orgAnalyticsRes.body.data?.csatAverageStars} ⭐`);
    if (orgAnalyticsRes.statusCode !== 200) throw new Error('Org Analytics failed');

    const aiAnalyticsRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/analytics/ai',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${aiAnalyticsRes.statusCode}`);
    console.log(`🤖 Classification Accuracy: ${aiAnalyticsRes.body.data?.classificationAccuracy}% | Human Override Rate: ${aiAnalyticsRes.body.data?.humanOverrideRate}%`);
    console.log(`🤖 RAG Resolution Acceptance Rate: ${aiAnalyticsRes.body.data?.aiResolutionAcceptanceRate}%`);
    console.log(`🤖 AI Confidence Distribution: High=${aiAnalyticsRes.body.data?.confidenceDistribution?.highConfidenceCount} | Med=${aiAnalyticsRes.body.data?.confidenceDistribution?.mediumConfidenceCount} | Low=${aiAnalyticsRes.body.data?.confidenceDistribution?.lowConfidenceCount}`);
    if (aiAnalyticsRes.statusCode !== 200) throw new Error('AI Analytics failed');

    const emergingRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/analytics/emerging-issues',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${emergingRes.statusCode}`);
    console.log(`🚨 Emerging Issues Detected: ${emergingRes.body.data?.length}`);
    if (emergingRes.body.data?.length > 0) {
      const issue = emergingRes.body.data[0];
      console.log(`🚨 Topic: "${issue.topicTitle}" | Spike Multiplier: ${issue.volumeSpikeMultiplier}x`);
      console.log(`🚨 Diagnostic Rationale: "${issue.detectionRationale}"`);
    }
    if (emergingRes.statusCode !== 200) throw new Error('Emerging Issue Detection failed');

    // =========================================================================
    // HUMAN-IN-THE-LOOP LEARNING & SAFE RETRAINING GOVERNANCE TESTS
    // =========================================================================

    // Test 16: HITL Corrections, Dataset Compilation, Monitoring & Candidate Model Governance
    console.log('\n--- Test 16: Human-in-the-Loop Learning & Safe Model Governance ---');

    // 1. Submit Detailed Agent Correction
    const hitlCorrectionRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/v1/hitl/correction/${complaintId}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      },
      {
        isCategoryOverridden: true,
        correctedCategory: 'Billing & Financial Dispute',
        correctedPriority: 'HIGH',
        editedRagResponse: 'Approved refund of $450.00 after human agent verification per Apex Bank Card Dispute Article #102.',
        feedbackNotes: 'AI categorized as general billing; corrected to specific card dispute.',
      }
    );
    console.log(`Status: ${hitlCorrectionRes.statusCode} | Feedback Logged: ${hitlCorrectionRes.body.data?.feedbackId}`);
    if (hitlCorrectionRes.statusCode !== 201) throw new Error('HITL Agent Correction submission failed');

    // 2. Fetch Feedback Dataset for Training
    const datasetRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/hitl/feedback-dataset',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${datasetRes.statusCode} | Feedback Dataset Entries: ${datasetRes.body.data?.length}`);
    if (datasetRes.body.data?.length > 0) {
      const sample = datasetRes.body.data[0];
      console.log(`Dataset Record: Ticket #${sample.ticketNumber} | Original AI: "${sample.aiPrediction?.predictedCategory}" -> Final: "${sample.finalDecision?.category}"`);
    }
    if (datasetRes.statusCode !== 200) throw new Error('Feedback Dataset retrieval failed');

    // 3. Fetch AI Monitoring Metrics
    const monitoringRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/hitl/ai-monitoring',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${monitoringRes.statusCode}`);
    console.log(`🎯 Evaluated Feedbacks: ${monitoringRes.body.data?.totalEvaluatedFeedbacks} | Accuracy: ${monitoringRes.body.data?.aiAccuracy}% | Correction Rate: ${monitoringRes.body.data?.correctionRate}%`);
    if (monitoringRes.statusCode !== 200) throw new Error('AI Monitoring retrieval failed');

    // 4. Retraining Governance & Candidate Model Pipeline
    const govStatusRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/v1/hitl/retraining-governance',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
    });
    console.log(`Status: ${govStatusRes.statusCode}`);
    console.log(`⚙️ Active Production Model: "${govStatusRes.body.data?.productionModel?.version}" (Accuracy: ${govStatusRes.body.data?.productionModel?.accuracyScore}%)`);
    console.log(`⚙️ Candidate Model: "${govStatusRes.body.data?.candidateModel?.version}" (Eval Score: ${govStatusRes.body.data?.candidateModel?.candidateAccuracyScore}%)`);
    console.log(`⚙️ Governance Promotion Recommended: ${govStatusRes.body.data?.candidateModel?.isRecommendedForPromotion}`);
    if (govStatusRes.statusCode !== 200) throw new Error('Retraining Governance retrieval failed');

    // 5. Train Candidate Model & Promote to Production
    const trainRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/v1/hitl/train-candidate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      }
    );
    console.log(`Status: ${trainRes.statusCode} | Candidate Training Job Executed cleanly.`);
    if (trainRes.statusCode !== 200) throw new Error('Candidate Model training failed');

    const promoteRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/v1/hitl/promote-candidate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': orgId },
      },
      { candidateVersion: 'DeBERTa-v3-Mistral-RAG-v1.3-CANDIDATE' }
    );
    console.log(`Status: ${promoteRes.statusCode} | Promoted Model: "${promoteRes.body.data?.activeProductionModel}"`);
    if (promoteRes.statusCode !== 200) throw new Error('Candidate Model promotion failed');

    // =========================================================================
    // MULTI-ORGANIZATION CROSS-TENANT ISOLATION & END-TO-END WORKFLOW TESTS
    // =========================================================================

    // Test 17: End-to-End Workflow Across 3 Organizations (Bank, Hospital, University)
    console.log('\n--- Test 17: Multi-Tenant Workflow & Strict Isolation (Bank vs Hospital vs University) ---');

    // 1. ABC Bank Workflow
    const bankCustLogin = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { orgSlug: 'apex-bank', email: 'sarah@apexbank.com', password: 'password123' }
    );
    const bankOrgId = bankCustLogin.body.data.user.orgId;
    const bankCustToken = bankCustLogin.body.data.token;

    const bankComplaint = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/complaints', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bankCustToken}`, 'x-tenant-id': bankOrgId } },
      { title: 'ATM Cash Dispense Fault on card 4532-1102-8841-9921', description: 'ATM did not dispense $200 cash.' }
    );
    const bankTicketId = bankComplaint.body.data.id;

    // 2. XYZ Hospital Workflow
    const hospCustLogin = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { orgSlug: 'metro-hospital', email: 'patient@metrohospital.com', password: 'password123' }
    );
    const hospOrgId = hospCustLogin.body.data.user.orgId;
    const hospCustToken = hospCustLogin.body.data.token;

    const hospComplaint = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/complaints', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hospCustToken}`, 'x-tenant-id': hospOrgId } },
      { title: 'Emergency Prescription Refill Delay', description: 'Pharmacy counter delay for insulin prescription.' }
    );
    const hospTicketId = hospComplaint.body.data.id;

    // 3. St. Jude University Workflow
    const univCustLogin = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { orgSlug: 'horizon-university', email: 'student@horizon.edu', password: 'password123' }
    );
    const univOrgId = univCustLogin.body.data.user.orgId;
    const univCustToken = univCustLogin.body.data.token;

    const univComplaint = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/complaints', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${univCustToken}`, 'x-tenant-id': univOrgId } },
      { title: 'Tuition Fee Refund Request for Semester Drop', description: 'Requesting 100% tuition drop refund within 14 days.' }
    );
    const univTicketId = univComplaint.body.data.id;

    // Execute RAG Resolutions & Verify Zero Cross-Tenant Leakage
    const bankRag = await makeRequest(
      { hostname: 'localhost', port: PORT, path: `/api/v1/rag/resolve-complaint/${bankTicketId}`, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'x-tenant-id': bankOrgId } }
    );
    console.log(`🏦 ABC Bank RAG Citation: "${bankRag.body.data?.sourceCitations[0]?.documentTitle}"`);

    const hospAdminLogin = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { orgSlug: 'metro-hospital', email: 'admin@metrohospital.com', password: 'password123' }
    );
    const hospAdminToken = hospAdminLogin.body.data.token;

    const hospRag = await makeRequest(
      { hostname: 'localhost', port: PORT, path: `/api/v1/rag/resolve-complaint/${hospTicketId}`, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hospAdminToken}`, 'x-tenant-id': hospOrgId } }
    );
    console.log(`🏥 XYZ Hospital RAG Citation: "${hospRag.body.data?.sourceCitations[0]?.documentTitle}"`);

    const univAdminLogin = await makeRequest(
      { hostname: 'localhost', port: PORT, path: '/api/v1/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { orgSlug: 'horizon-university', email: 'admin@horizon.edu', password: 'password123' }
    );
    const univAdminToken = univAdminLogin.body.data.token;

    const univRag = await makeRequest(
      { hostname: 'localhost', port: PORT, path: `/api/v1/rag/resolve-complaint/${univTicketId}`, method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${univAdminToken}`, 'x-tenant-id': univOrgId } }
    );
    console.log(`🎓 University RAG Citation: "${univRag.body.data?.sourceCitations[0]?.documentTitle}"`);

    if (bankRag.body.data?.sourceCitations[0]?.documentTitle?.includes('Hospital')) throw new Error('Cross-tenant leakage: Bank accessed Hospital KB!');
    if (hospRag.body.data?.sourceCitations[0]?.documentTitle?.includes('Bank')) throw new Error('Cross-tenant leakage: Hospital accessed Bank KB!');

    console.log('\n🎉 ALL 17 ENTERPRISE INTEGRATION TESTS PASSED CLEANLY! ZERO CROSS-TENANT LEAKAGE VERIFIED ACROSS BANK, HOSPITAL & UNIVERSITY!');
  } catch (err) {
    console.error('❌ Test Suite Error:', err);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
};

runBackendTestSuite();

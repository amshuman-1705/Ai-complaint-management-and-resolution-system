/**
 * Enterprise Multi-Tenant REST API Client
 */
const API_BASE_URL = '/api/v1';

class APIClient {
  static getAuthHeader() {
    const token = localStorage.getItem('jwt_token');
    const orgId = localStorage.getItem('tenant_org_id');
    const headers = { 'Content-Type': 'application/json' };

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (orgId) headers['x-tenant-id'] = orgId;

    return headers;
  }

  static async request(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: this.getAuthHeader(),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP Error ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${method} ${endpoint}]:`, err.message);
      throw err;
    }
  }

  // 1. Authentication
  static getOrganizations() {
    return this.request('/auth/organizations', 'GET');
  }

  static login(orgSlug, email, password) {
    return this.request('/auth/login', 'POST', { orgSlug, email, password });
  }

  static register(orgSlug, fullName, email, password, roleName = 'CUSTOMER') {
    return this.request('/auth/register', 'POST', { orgSlug, fullName, email, password, roleName });
  }

  // 2. Tenants & Organizations
  static getTenants() {
    return this.request('/tenants', 'GET');
  }

  static getDepartments() {
    return this.request('/departments', 'GET');
  }

  static createDepartment(name, code, baseSlaHours) {
    return this.request('/departments', 'POST', { name, code, baseSlaHours });
  }

  // 3. User Roster
  static getUsers() {
    return this.request('/users', 'GET');
  }

  // 4. Complaints Lifecycle
  static getComplaints() {
    return this.request('/complaints', 'GET');
  }

  static getComplaintById(id) {
    return this.request(`/complaints/${id}`, 'GET');
  }

  static submitComplaint(title, description) {
    return this.request('/complaints', 'POST', { title, description });
  }

  static updateComplaintStatus(id, newStatus, reason) {
    return this.request(`/complaints/${id}/status`, 'PATCH', { newStatus, reason });
  }

  static addComplaintMessage(id, messageText) {
    return this.request(`/complaints/${id}/messages`, 'POST', { messageText });
  }

  static submitCustomerFeedback(id, ratingStars, isIssueResolved, comments) {
    return this.request(`/complaints/${id}/feedback`, 'POST', { ratingStars, isIssueResolved, comments });
  }

  // 5. AI Engine & Insights
  static analyzeComplaintAI(id) {
    return this.request(`/complaints/${id}/ai-analyze`, 'POST');
  }

  static getAIInsights(id) {
    return this.request(`/complaints/${id}/ai-insights`, 'GET');
  }

  static overrideAICorrection(id, isCategoryOverridden, correctedCategory, editedRagResponse) {
    return this.request(`/complaints/${id}/ai-override`, 'POST', { isCategoryOverridden, correctedCategory, editedRagResponse });
  }

  // 6. RAG Engine
  static uploadKBDocument(title, content, documentType = 'POLICY') {
    return this.request('/rag/kb-upload', 'POST', { title, content, documentType });
  }

  static executeRAGResolution(id) {
    return this.request(`/rag/resolve-complaint/${id}`, 'POST');
  }

  static approveRAGResolution(id, approvedResponseText) {
    return this.request(`/rag/approve-resolution/${id}`, 'POST', { approvedResponseText });
  }

  // 7. Intelligent Routing & SLA
  static recommendRouting(id) {
    return this.request(`/routing/recommend/${id}`, 'GET');
  }

  static autoAssignRouting(id) {
    return this.request(`/routing/auto-assign/${id}`, 'POST');
  }

  static reassignRouting(id, newDeptId, newAgentId, reason) {
    return this.request(`/routing/reassign/${id}`, 'POST', { newDeptId, newAgentId, reason });
  }

  static escalateRouting(id, reason) {
    return this.request(`/routing/escalate/${id}`, 'POST', { reason });
  }

  static getSLACountdown(id) {
    return this.request(`/sla/countdown/${id}`, 'GET');
  }

  static getSLAPredictiveRisk(id) {
    return this.request(`/sla/predictive-risk/${id}`, 'GET');
  }

  static batchScanSLA() {
    return this.request('/sla/batch-scan', 'POST');
  }

  // 8. Notifications & Audit Stream
  static getNotifications() {
    return this.request('/notifications', 'GET');
  }

  static getAuditLogs() {
    return this.request('/audit-logs', 'GET');
  }
}

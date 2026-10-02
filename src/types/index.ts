export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'DEPT_MANAGER' | 'AGENT' | 'CUSTOMER';
export type TicketStatus = 'SUBMITTED' | 'AI_PROCESSING' | 'TRIAGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'RESOLVED' | 'CLOSED' | 'REOPENED' | 'ESCALATED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type InputChannel = 'TEXT' | 'OCR_IMAGE' | 'VOICE';

export interface UserAuthPayload {
  userId: string;
  orgId: string;
  deptId?: string | null;
  role: UserRole;
  email: string;
  fullName: string;
}

export interface TenantContext {
  orgId: string;
}

// API Unified Response Format
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

import { AuditRepository } from '../repositories/auditRepository';

export class AuditService {
  static async getOrgAuditLogs(orgId: string) {
    return AuditRepository.findByOrg(orgId);
  }
}

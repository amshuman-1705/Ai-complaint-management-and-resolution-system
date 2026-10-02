import { DeptRepository } from '../repositories/deptRepository';
import { AuditRepository } from '../repositories/auditRepository';

export class DeptService {
  static async createDepartment(data: { orgId: string; name: string; code: string; baseSlaHours?: number }, actorUserId?: string) {
    const dept = await DeptRepository.create(data);

    await AuditRepository.log({
      orgId: data.orgId,
      userId: actorUserId,
      actionType: 'DEPARTMENT_CREATED',
      targetEntity: 'departments',
      details: JSON.stringify({ name: dept.name, code: dept.code, baseSlaHours: dept.baseSlaHours }),
    });

    return dept;
  }

  static async listDepartments(orgId: string) {
    return DeptRepository.findByOrg(orgId);
  }
}

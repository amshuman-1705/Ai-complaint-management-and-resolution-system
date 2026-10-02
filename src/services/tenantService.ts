import { OrgRepository } from '../repositories/orgRepository';
import { AuditRepository } from '../repositories/auditRepository';

export class TenantService {
  static async registerOrganization(data: { name: string; domainType: string; slug: string }) {
    const existing = await OrgRepository.findBySlug(data.slug);
    if (existing) throw { statusCode: 400, message: `Organization slug '${data.slug}' is already taken.` };

    const org = await OrgRepository.create(data);

    await AuditRepository.log({
      orgId: org.id,
      actionType: 'ORGANIZATION_REGISTERED',
      targetEntity: 'organizations',
      details: JSON.stringify({ name: org.name, slug: org.slug, domainType: org.domainType }),
    });

    return org;
  }

  static async getOrganization(id: string) {
    const org = await OrgRepository.findById(id);
    if (!org) throw { statusCode: 404, message: 'Organization not found.' };
    return org;
  }

  static async listOrganizations() {
    return OrgRepository.findAll();
  }
}

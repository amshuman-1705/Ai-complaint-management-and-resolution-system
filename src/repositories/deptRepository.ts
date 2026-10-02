import { prisma } from '../config/db';

export class DeptRepository {
  static async create(data: { orgId: string; name: string; code: string; baseSlaHours?: number }) {
    return prisma.department.create({ data });
  }

  static async findById(id: string) {
    return prisma.department.findUnique({ where: { id } });
  }

  static async findByOrg(orgId: string) {
    return prisma.department.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
    });
  }
}

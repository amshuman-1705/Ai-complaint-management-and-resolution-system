import { prisma } from '../config/db';

export class OrgRepository {
  static async create(data: { name: string; domainType: string; slug: string }) {
    return prisma.organization.create({ data });
  }

  static async findById(id: string) {
    return prisma.organization.findUnique({ where: { id } });
  }

  static async findBySlug(slugOrId: string) {
    const bySlug = await prisma.organization.findUnique({ where: { slug: slugOrId } });
    if (bySlug) return bySlug;
    return prisma.organization.findUnique({ where: { id: slugOrId } });
  }

  static async findAll() {
    return prisma.organization.findMany({ orderBy: { createdAt: 'desc' } });
  }
}

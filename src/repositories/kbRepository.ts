import { prisma } from '../config/db';

export class KBRepository {
  static async createDocument(data: { orgId: string; deptId?: string; title: string; sourceUrlOrFile?: string }) {
    return prisma.kBDocument.create({ data });
  }

  static async addChunk(data: { orgId: string; documentId: string; chunkIndex: number; chunkContent: string }) {
    return prisma.kBChunk.create({ data });
  }

  static async addEmbedding(data: { orgId: string; chunkId: string; vectorSerialized: string }) {
    return prisma.embedding.create({ data });
  }

  static async findDocumentsByOrg(orgId: string) {
    return prisma.kBDocument.findMany({
      where: { orgId },
      include: { department: true, chunks: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

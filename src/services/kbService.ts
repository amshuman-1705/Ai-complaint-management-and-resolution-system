import { KBRepository } from '../repositories/kbRepository';
import { AuditRepository } from '../repositories/auditRepository';

export class KBService {
  static async uploadDocument(data: { orgId: string; deptId?: string; title: string; content: string; actorUserId?: string }) {
    const doc = await KBRepository.createDocument({
      orgId: data.orgId,
      deptId: data.deptId,
      title: data.title,
    });

    // Chunking text (e.g. 500 characters per chunk)
    const chunkSize = 500;
    const chunks: string[] = [];
    for (let i = 0; i < data.content.length; i += chunkSize) {
      chunks.push(data.content.substring(i, i + chunkSize));
    }

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = await KBRepository.addChunk({
        orgId: data.orgId,
        documentId: doc.id,
        chunkIndex: idx,
        chunkContent: chunks[idx],
      });

      // Dummy vector serialization array for local indexing
      const mockVector = Array.from({ length: 1536 }, () => (Math.random() * 2 - 1).toFixed(4)).join(',');
      await KBRepository.addEmbedding({
        orgId: data.orgId,
        chunkId: chunk.id,
        vectorSerialized: mockVector,
      });
    }

    await AuditRepository.log({
      orgId: data.orgId,
      userId: data.actorUserId,
      actionType: 'KB_DOCUMENT_UPLOADED',
      targetEntity: 'kb_documents',
      details: JSON.stringify({ title: doc.title, totalChunks: chunks.length }),
    });

    return doc;
  }

  static async listDocuments(orgId: string) {
    return KBRepository.findDocumentsByOrg(orgId);
  }
}

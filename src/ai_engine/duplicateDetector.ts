import { prisma } from '../config/db';

export interface DuplicateDetectionResult {
  duplicateComplaints: string[];
  relatedComplaints: string[];
  hasDuplicate: boolean;
}

export class DuplicateDetector {
  static async detect(orgId: string, currentComplaintId: string, text: string): Promise<DuplicateDetectionResult> {
    const existingComplaints = await prisma.complaint.findMany({
      where: {
        orgId,
        id: { not: currentComplaintId },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    const tokensA = new Set(text.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    const duplicateIds: string[] = [];
    const relatedIds: string[] = [];

    for (const comp of existingComplaints) {
      const tokensB = new Set((comp.title + ' ' + comp.description).toLowerCase().split(/\W+/).filter((w) => w.length > 3));
      
      const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
      const union = new Set([...tokensA, ...tokensB]);
      
      const sim = intersection.size / (union.size || 1);

      if (sim >= 0.55) {
        duplicateIds.push(comp.ticketNumber);
      } else if (sim >= 0.30) {
        relatedIds.push(comp.ticketNumber);
      }
    }

    return {
      duplicateComplaints: duplicateIds,
      relatedComplaints: relatedIds,
      hasDuplicate: duplicateIds.length > 0,
    };
  }
}

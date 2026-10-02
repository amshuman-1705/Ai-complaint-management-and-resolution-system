import { prisma } from '../config/db';

export interface CategoryClassificationResult {
  categoryId: string | null;
  categoryName: string;
  subCategory: string;
  confidence: number;
}

export class ComplaintClassifier {
  static async classify(orgId: string, text: string): Promise<CategoryClassificationResult> {
    const fullText = text.toLowerCase();

    // Query configurable tenant categories from Database
    const tenantCategories = await prisma.complaintCategory.findMany({
      where: { orgId },
      include: { defaultDepartment: true },
    });

    if (tenantCategories.length === 0) {
      // General dynamic category matching fallback
      if (fullText.includes('charge') || fullText.includes('billing') || fullText.includes('invoice') || fullText.includes('refund')) {
        return { categoryId: null, categoryName: 'Billing & Payments', subCategory: 'Refund Dispute', confidence: 0.92 };
      }
      if (fullText.includes('error') || fullText.includes('crash') || fullText.includes('database') || fullText.includes('server')) {
        return { categoryId: null, categoryName: 'Technical & Infrastructure', subCategory: 'Server Outage', confidence: 0.94 };
      }
      if (fullText.includes('password') || fullText.includes('login') || fullText.includes('2fa') || fullText.includes('hacked')) {
        return { categoryId: null, categoryName: 'Account & Security', subCategory: 'Authentication Failure', confidence: 0.90 };
      }
      return { categoryId: null, categoryName: 'General Inquiry', subCategory: 'General Inquiry', confidence: 0.75 };
    }

    // Match text against tenant configured category names and descriptions
    let bestMatch = tenantCategories[0];
    let maxMatchCount = 0;

    for (const cat of tenantCategories) {
      const keywords = (cat.name + ' ' + (cat.description || '')).toLowerCase().split(/\W+/);
      let count = 0;
      keywords.forEach((kw) => {
        if (kw.length > 3 && fullText.includes(kw)) count++;
      });
      if (count > maxMatchCount) {
        maxMatchCount = count;
        bestMatch = cat;
      }
    }

    const matchConfidence = maxMatchCount > 0 ? Math.min(0.95, 0.70 + maxMatchCount * 0.08) : 0.65;

    return {
      categoryId: bestMatch.id,
      categoryName: bestMatch.name,
      subCategory: `${bestMatch.name} Sub-issue`,
      confidence: parseFloat(matchConfidence.toFixed(2)),
    };
  }
}

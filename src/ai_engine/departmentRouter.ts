import { prisma } from '../config/db';

export class DepartmentRouter {
  static async recommendDepartment(orgId: string, categoryName: string, text: string): Promise<{ deptId: string | null; deptName: string }> {
    const depts = await prisma.department.findMany({ where: { orgId } });
    if (depts.length === 0) return { deptId: null, deptName: 'General Support' };

    const lower = (categoryName + ' ' + text).toLowerCase();

    let matchedDept = depts[0];
    let maxScore = 0;

    depts.forEach((d) => {
      let score = 0;
      if (lower.includes(d.name.toLowerCase()) || lower.includes(d.code.toLowerCase())) score += 5;
      if (d.code === 'FIN' && (lower.includes('billing') || lower.includes('payment') || lower.includes('invoice') || lower.includes('charge'))) score += 3;
      if (d.code === 'IT' && (lower.includes('error') || lower.includes('server') || lower.includes('tech') || lower.includes('bug'))) score += 3;

      if (score > maxScore) {
        maxScore = score;
        matchedDept = d;
      }
    });

    return { deptId: matchedDept.id, deptName: matchedDept.name };
  }
}

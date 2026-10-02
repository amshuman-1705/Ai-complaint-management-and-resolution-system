import { prisma } from '../config/db';

export class NotificationRepository {
  static async create(data: { orgId: string; userId: string; title: string; message: string; eventType: string }) {
    return prisma.notification.create({ data });
  }

  static async findByUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}

import { NotificationRepository } from '../repositories/notificationRepository';

export class NotificationService {
  static async getUserNotifications(userId: string) {
    return NotificationRepository.findByUser(userId);
  }

  static async markNotificationRead(id: string) {
    return NotificationRepository.markAsRead(id);
  }
}

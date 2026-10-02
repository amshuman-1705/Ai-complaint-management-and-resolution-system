import { UserRepository } from '../repositories/userRepository';
import { UserRole } from '../types';

export class UserService {
  static async listOrgUsers(orgId: string, role?: UserRole) {
    return UserRepository.findUsersByOrg(orgId, role);
  }

  static async getUserProfile(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw { statusCode: 404, message: 'User not found.' };
    return user;
  }
}

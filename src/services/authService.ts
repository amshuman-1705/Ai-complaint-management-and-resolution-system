import { UserRepository } from '../repositories/userRepository';
import { OrgRepository } from '../repositories/orgRepository';
import { hashPassword, comparePassword, generateJWT } from '../utils/security';
import { UserRole } from '../types';
import { AuditRepository } from '../repositories/auditRepository';

export class AuthService {
  static async registerUser(data: {
    orgId: string;
    deptId?: string;
    roleName: UserRole;
    email: string;
    password: string;
    fullName: string;
    employeeCode?: string;
  }) {
    const org = await OrgRepository.findById(data.orgId);
    if (!org) throw { statusCode: 404, message: 'Target Organization not found.' };

    const existing = await UserRepository.findByEmail(data.orgId, data.email);
    if (existing) throw { statusCode: 400, message: 'User with this email already exists in organization.' };

    let role = await UserRepository.findRoleByName(data.orgId, data.roleName);
    if (!role) {
      role = await UserRepository.createRole({
        orgId: data.orgId,
        name: data.roleName,
        description: `${data.roleName} role for ${org.name}`,
      });
    }

    const hashed = await hashPassword(data.password);
    const user = await UserRepository.createUser({
      orgId: data.orgId,
      deptId: data.deptId,
      roleId: role.id,
      email: data.email,
      passwordHash: hashed,
      fullName: data.fullName,
    });

    if (data.employeeCode && (data.roleName === 'AGENT' || data.roleName === 'DEPT_MANAGER')) {
      await UserRepository.createEmployeeProfile({
        userId: user.id,
        orgId: data.orgId,
        employeeCode: data.employeeCode,
      });
    }

    await AuditRepository.log({
      orgId: data.orgId,
      userId: user.id,
      actionType: 'USER_REGISTERED',
      targetEntity: 'users',
      details: JSON.stringify({ role: data.roleName, email: data.email }),
    });

    return user;
  }

  static async login(data: { orgSlug: string; email: string; password: string }) {
    const org = await OrgRepository.findBySlug(data.orgSlug);
    if (!org) throw { statusCode: 404, message: `Organization '${data.orgSlug}' not found.` };

    const user = await UserRepository.findByEmail(org.id, data.email);
    if (!user) throw { statusCode: 401, message: 'Invalid email or password.' };

    const isMatch = await comparePassword(data.password, user.passwordHash);
    if (!isMatch) throw { statusCode: 401, message: 'Invalid email or password.' };

    const roleName = user.role.name as UserRole;
    const token = generateJWT({
      userId: user.id,
      orgId: user.orgId,
      deptId: user.deptId,
      role: roleName,
      email: user.email,
      fullName: user.fullName,
    });

    await AuditRepository.log({
      orgId: user.orgId,
      userId: user.id,
      actionType: 'AUTH_SUCCESS',
      targetEntity: 'users',
      details: JSON.stringify({ role: roleName, email: user.email }),
    });

    return {
      token,
      user: {
        id: user.id,
        orgId: user.orgId,
        deptId: user.deptId,
        email: user.email,
        fullName: user.fullName,
        role: roleName,
        organization: org.name,
      },
    };
  }
}

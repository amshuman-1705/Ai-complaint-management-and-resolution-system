import { prisma } from '../config/db';
import { UserRole } from '../types';

export class UserRepository {
  static async createUser(data: {
    orgId: string;
    deptId?: string;
    roleId: string;
    email: string;
    passwordHash: string;
    fullName: string;
  }) {
    return prisma.user.create({
      data,
      include: { role: true, department: true },
    });
  }

  static async findByEmail(orgId: string, email: string) {
    return prisma.user.findFirst({
      where: { orgId, email },
      include: { role: true, department: true },
    });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true, department: true, employeeProfile: true },
    });
  }

  static async findRoleByName(orgId: string | null, name: string) {
    return prisma.role.findFirst({
      where: {
        name,
        OR: [{ orgId }, { isSystemRole: true }],
      },
    });
  }

  static async createRole(data: { orgId?: string; name: string; description?: string; isSystemRole?: boolean }) {
    return prisma.role.create({ data });
  }

  static async findUsersByOrg(orgId: string, role?: UserRole) {
    return prisma.user.findMany({
      where: {
        orgId,
        role: role ? { name: role } : undefined,
      },
      include: { role: true, department: true, employeeProfile: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Employee Profile
  static async createEmployeeProfile(data: {
    userId: string;
    orgId: string;
    employeeCode: string;
    maxCapacity?: number;
    specializationSkills?: string;
  }) {
    return prisma.employee.create({ data });
  }

  static async findLeastLoadedAgent(orgId: string, deptId: string) {
    return prisma.user.findFirst({
      where: {
        orgId,
        deptId,
        role: { name: 'AGENT' },
        status: 'ACTIVE',
      },
      include: { employeeProfile: true },
      orderBy: {
        employeeProfile: {
          activeWorkload: 'asc',
        },
      },
    });
  }

  static async incrementWorkload(userId: string) {
    return prisma.employee.update({
      where: { userId },
      data: { activeWorkload: { increment: 1 } },
    });
  }

  static async decrementWorkload(userId: string) {
    return prisma.employee.update({
      where: { userId },
      data: { activeWorkload: { decrement: 1 } },
    });
  }
}

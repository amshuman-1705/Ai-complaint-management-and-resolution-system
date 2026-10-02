import { prisma } from './config/db';
import { hashPassword } from './utils/security';
import { TenantKBIngestionEngine } from './ai_engine/tenantKBIngestion';

export const seedDatabase = async () => {
  console.log('🌱 Seeding Multi-Tenant Enterprise Database (Bank, Hospital, University)...');

  const passHash = await hashPassword('password123');

  // 1. System Role: SUPER_ADMIN
  let superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPER_ADMIN' } });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: { name: 'SUPER_ADMIN', description: 'Platform Super Admin', isSystemRole: true },
    });
  }

  // Super Admin Account
  let superAdminUser = await prisma.user.findFirst({ where: { email: 'superadmin@platform.com' } });
  if (!superAdminUser) {
    // Create platform default org for SuperAdmin identity
    let platformOrg = await prisma.organization.findUnique({ where: { slug: 'platform-global' } });
    if (!platformOrg) {
      platformOrg = await prisma.organization.create({
        data: { name: 'Platform System Admin', domainType: 'BANK', slug: 'platform-global' },
      });
    }

    await prisma.user.create({
      data: {
        orgId: platformOrg.id,
        roleId: superAdminRole.id,
        email: 'superadmin@platform.com',
        passwordHash: passHash,
        fullName: 'Global Platform SuperAdmin',
      },
    });
  }

  // =========================================================================
  // ORGANIZATION 1: ABC BANK (apex-bank)
  // =========================================================================
  let bankOrg = await prisma.organization.findUnique({ where: { slug: 'apex-bank' } });
  if (!bankOrg) {
    bankOrg = await prisma.organization.create({
      data: { name: 'ABC Global Bank', domainType: 'BANK', slug: 'apex-bank' },
    });
  }

  const bankRoles = await createOrgRoles(bankOrg.id);
  const bankDeptFin = await getOrCreateDept(bankOrg.id, 'Finance & Payments', 'FIN', 12);
  const bankDeptCard = await getOrCreateDept(bankOrg.id, 'Cards & ATM Operations', 'CARD', 8);

  const bankCustomer = await getOrCreateUser(bankOrg.id, bankRoles.customerRole.id, 'sarah@apexbank.com', passHash, 'Sarah Connor (Bank Customer)');
  const bankAgent1 = await getOrCreateUser(bankOrg.id, bankRoles.agentRole.id, 'michael@apexbank.com', passHash, 'Michael Scott (Bank Agent)', bankDeptCard.id);
  const bankAgent2 = await getOrCreateUser(bankOrg.id, bankRoles.agentRole.id, 'agent@apexbank.com', passHash, 'Bank Support Agent', bankDeptCard.id);
  await getOrCreateEmployee(bankOrg.id, bankAgent1.id, 'EMP-BANK-001', '["CARDS", "ATM", "REFUND"]');
  await getOrCreateEmployee(bankOrg.id, bankAgent2.id, 'EMP-BANK-002', '["CARDS", "ATM", "REFUND", "BILLING"]');

  await getOrCreateUser(bankOrg.id, bankRoles.managerRole.id, 'manager@apexbank.com', passHash, 'Dwight Schrute (Bank Manager)', bankDeptCard.id);
  await getOrCreateUser(bankOrg.id, bankRoles.adminRole.id, 'admin@apexbank.com', passHash, 'Alex Mercer (Bank Admin)', bankDeptFin.id);

  // Ingest Bank KB Document
  await TenantKBIngestionEngine.ingestDocument({
    orgId: bankOrg.id,
    deptId: bankDeptCard.id,
    title: 'ATM & Card Dispute Policy 2026',
    content: 'Customers can request full refund for unauthorized card charges within 30 days. ATM cash dispense faults are verified within 48 hours and funds credited automatically.',
    documentType: 'POLICY',
  });

  // =========================================================================
  // ORGANIZATION 2: XYZ HOSPITAL (metro-hospital)
  // =========================================================================
  let hospitalOrg = await prisma.organization.findUnique({ where: { slug: 'metro-hospital' } });
  if (!hospitalOrg) {
    hospitalOrg = await prisma.organization.create({
      data: { name: 'XYZ General Hospital', domainType: 'HOSPITAL', slug: 'metro-hospital' },
    });
  }

  const hospRoles = await createOrgRoles(hospitalOrg.id);
  const hospDeptBilling = await getOrCreateDept(hospitalOrg.id, 'Billing & Insurance Claims', 'MED_BILL', 24);
  const hospDeptPharm = await getOrCreateDept(hospitalOrg.id, 'Pharmacy & Prescriptions', 'PHARM', 6);

  const hospCustomer = await getOrCreateUser(hospitalOrg.id, hospRoles.customerRole.id, 'patient@metrohospital.com', passHash, 'Elena Gilbert (Patient)');
  const hospAgent1 = await getOrCreateUser(hospitalOrg.id, hospRoles.agentRole.id, 'nurse.john@metrohospital.com', passHash, 'Nurse John (Hospital Agent)', hospDeptPharm.id);
  const hospAgent2 = await getOrCreateUser(hospitalOrg.id, hospRoles.agentRole.id, 'agent@metrohospital.com', passHash, 'Hospital Support Agent', hospDeptPharm.id);
  await getOrCreateEmployee(hospitalOrg.id, hospAgent1.id, 'EMP-HOSP-001', '["PHARMACY", "PRESCRIPTIONS"]');
  await getOrCreateEmployee(hospitalOrg.id, hospAgent2.id, 'EMP-HOSP-002', '["PHARMACY", "PRESCRIPTIONS", "BILLING"]');

  await getOrCreateUser(hospitalOrg.id, hospRoles.managerRole.id, 'manager@metrohospital.com', passHash, 'Dr. Cuddy (Hospital Manager)', hospDeptPharm.id);
  await getOrCreateUser(hospitalOrg.id, hospRoles.adminRole.id, 'admin@metrohospital.com', passHash, 'Dr. House (Hospital Admin)', hospDeptBilling.id);

  // Ingest Hospital KB Document
  await TenantKBIngestionEngine.ingestDocument({
    orgId: hospitalOrg.id,
    deptId: hospDeptPharm.id,
    title: 'Hospital Pharmacy & Prescription Refill Policy 2026',
    content: 'Prescription refills require 24-hour advance request via patient portal. Emergency medication orders are processed within 2 hours at central hospital pharmacy counter.',
    documentType: 'POLICY',
  });

  // =========================================================================
  // ORGANIZATION 3: ST. JUDE UNIVERSITY (horizon-university)
  // =========================================================================
  let univOrg = await prisma.organization.findUnique({ where: { slug: 'horizon-university' } });
  if (!univOrg) {
    univOrg = await prisma.organization.create({
      data: { name: 'St. Jude International University', domainType: 'UNIVERSITY', slug: 'horizon-university' },
    });
  }

  const univRoles = await createOrgRoles(univOrg.id);
  const univDeptAdmissions = await getOrCreateDept(univOrg.id, 'Admissions & Registrar', 'ADM', 48);
  const univDeptBursar = await getOrCreateDept(univOrg.id, 'Financial Aid & Bursar', 'BURSAR', 24);

  const univCustomer = await getOrCreateUser(univOrg.id, univRoles.customerRole.id, 'student@horizon.edu', passHash, 'Peter Parker (Student)');
  const univAgent1 = await getOrCreateUser(univOrg.id, univRoles.agentRole.id, 'advisor.emily@horizon.edu', passHash, 'Advisor Emily (University Agent)', univDeptBursar.id);
  const univAgent2 = await getOrCreateUser(univOrg.id, univRoles.agentRole.id, 'agent@horizon.edu', passHash, 'University Support Agent', univDeptBursar.id);
  await getOrCreateEmployee(univOrg.id, univAgent1.id, 'EMP-UNIV-001', '["TUITION", "SCHOLARSHIPS"]');
  await getOrCreateEmployee(univOrg.id, univAgent2.id, 'EMP-UNIV-002', '["TUITION", "SCHOLARSHIPS", "HOUSING"]');

  await getOrCreateUser(univOrg.id, univRoles.managerRole.id, 'manager@horizon.edu', passHash, 'Prof. McGonagall (University Manager)', univDeptBursar.id);
  await getOrCreateUser(univOrg.id, univRoles.adminRole.id, 'admin@horizon.edu', passHash, 'Dean Winchester (University Admin)', univDeptAdmissions.id);

  // Ingest University KB Document
  await TenantKBIngestionEngine.ingestDocument({
    orgId: univOrg.id,
    deptId: univDeptBursar.id,
    title: 'University Tuition Fee & Housing Refund Policy 2026',
    content: 'Students dropping courses within the first 14 days of the academic semester receive a 100% tuition refund. Late drop requests incur a 15% administrative processing fee.',
    documentType: 'POLICY',
  });

  console.log('✅ Seeding completed successfully for 3 Multi-Tenant Organizations!');
};

// Helper Functions
async function createOrgRoles(orgId: string) {
  let adminRole = await prisma.role.findFirst({ where: { orgId, name: 'ORG_ADMIN' } });
  if (!adminRole) adminRole = await prisma.role.create({ data: { orgId, name: 'ORG_ADMIN', description: 'Org Admin' } });

  let managerRole = await prisma.role.findFirst({ where: { orgId, name: 'DEPT_MANAGER' } });
  if (!managerRole) managerRole = await prisma.role.create({ data: { orgId, name: 'DEPT_MANAGER', description: 'Department Manager' } });

  let agentRole = await prisma.role.findFirst({ where: { orgId, name: 'AGENT' } });
  if (!agentRole) agentRole = await prisma.role.create({ data: { orgId, name: 'AGENT', description: 'Support Agent' } });

  let customerRole = await prisma.role.findFirst({ where: { orgId, name: 'CUSTOMER' } });
  if (!customerRole) customerRole = await prisma.role.create({ data: { orgId, name: 'CUSTOMER', description: 'End User / Customer' } });

  return { adminRole, managerRole, agentRole, customerRole };
}

async function getOrCreateDept(orgId: string, name: string, code: string, baseSlaHours: number) {
  let dept = await prisma.department.findFirst({ where: { orgId, code } });
  if (!dept) {
    dept = await prisma.department.create({ data: { orgId, name, code, baseSlaHours } });
  }
  return dept;
}

async function getOrCreateUser(orgId: string, roleId: string, email: string, passwordHash: string, fullName: string, deptId?: string) {
  let user = await prisma.user.findFirst({ where: { orgId, email } });
  if (!user) {
    user = await prisma.user.create({ data: { orgId, roleId, email, passwordHash, fullName, deptId } });
  }
  return user;
}

async function getOrCreateEmployee(orgId: string, userId: string, employeeCode: string, specializationSkills: string) {
  let emp = await prisma.employee.findUnique({ where: { userId } });
  if (!emp) {
    emp = await prisma.employee.create({ data: { orgId, userId, employeeCode, specializationSkills, maxCapacity: 15 } });
  }
  return emp;
}

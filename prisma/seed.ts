/**
 * Prisma seed script
 * Run: npx prisma db seed
 * Creates: 1 company, 1 admin user, sample properties, assets, leases, work orders, trust accounts
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Havilon AssetView database...");

  // ─── Company ────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { slug: "havilon-demo" },
    update: {},
    create: {
      name: "Havilon Realty (Demo)",
      slug: "havilon-demo",
      plan: "enterprise",
      status: "active",
    },
  });
  console.log(`✓ Company: ${company.name} (${company.id})`);

  // ─── Admin user ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Demo1234!", 12);
  const admin = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "admin@havilon-demo.com" } },
    update: {},
    create: {
      companyId: company.id,
      email: "admin@havilon-demo.com",
      passwordHash,
      name: "Alex Rivera",
      role: "admin",
      mfaEnabled: false,
    },
  });
  console.log(`✓ Admin user: ${admin.email} / password: Demo1234!`);

  // Manager
  const manager = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "mgr@havilon-demo.com" } },
    update: {},
    create: {
      companyId: company.id,
      email: "mgr@havilon-demo.com",
      passwordHash: await bcrypt.hash("Demo1234!", 12),
      name: "Jordan Lee",
      role: "manager",
      mfaEnabled: false,
    },
  });
  console.log(`✓ Manager: ${manager.email}`);

  // ─── Assets ─────────────────────────────────────────────────
  const asset1 = await prisma.asset.create({
    data: {
      companyId: company.id,
      assetCode: "AST-00047",
      name: "220 Oak Ave",
      type: "multi_family",
      status: "active",
      address: "220 Oak Ave",
      city: "Dallas",
      state: "TX",
      zip: "75201",
      acquiredAt: new Date("2018-01-15"),
      purchasePrice: 1150000,
      currentValue: 1420000,
      ownerName: "L. Kim (Kim Properties LLC)",
      lienStatus: "none",
      legalHolds: false,
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      companyId: company.id,
      assetCode: "AST-00048",
      name: "5501 Maple St",
      type: "single_family",
      status: "active",
      address: "5501 Maple St",
      city: "Dallas",
      state: "TX",
      zip: "75202",
      acquiredAt: new Date("2020-06-01"),
      purchasePrice: 480000,
      currentValue: 610000,
      ownerName: "R. Thornton",
      lienStatus: "none",
      legalHolds: false,
    },
  });
  console.log(`✓ Assets: ${asset1.assetCode}, ${asset2.assetCode}`);

  // ─── Properties & Units ─────────────────────────────────────
  const property1 = await prisma.property.create({
    data: {
      companyId: company.id,
      assetId: asset1.id,
      name: "220 Oak Ave",
      address: "220 Oak Ave",
      city: "Dallas",
      state: "TX",
      zip: "75201",
      type: "multi_family",
      totalUnits: 8,
      status: "active",
    },
  });

  const unit4B = await prisma.unit.create({
    data: { propertyId: property1.id, unitNumber: "4B", bedrooms: 2, bathrooms: 1, sqft: 850, marketRent: 2200, status: "occupied" },
  });
  const unit7A = await prisma.unit.create({
    data: { propertyId: property1.id, unitNumber: "7A", bedrooms: 2, bathrooms: 1, sqft: 900, marketRent: 2350, status: "occupied" },
  });
  const unitVacant = await prisma.unit.create({
    data: { propertyId: property1.id, unitNumber: "2", bedrooms: 1, bathrooms: 1, sqft: 650, marketRent: 1950, status: "vacant" },
  });
  console.log(`✓ Property: ${property1.name} with 3 sample units`);

  // ─── Tenants & Leases ───────────────────────────────────────
  const tenant1 = await prisma.tenant.create({
    data: { companyId: company.id, firstName: "M.", lastName: "Torres", email: "m.torres@email.com", phone: "214-555-0101" },
  });
  const tenant2 = await prisma.tenant.create({
    data: { companyId: company.id, firstName: "F.", lastName: "Nguyen", email: "f.nguyen@email.com", phone: "214-555-0102" },
  });

  await prisma.lease.createMany({
    data: [
      { unitId: unit4B.id, tenantId: tenant1.id, startDate: new Date("2024-06-01"), endDate: new Date("2027-05-31"), monthlyRent: 2200, depositAmount: 2200, depositHeld: 2200, status: "active", signedAt: new Date("2024-05-20") },
      { unitId: unit7A.id, tenantId: tenant2.id, startDate: new Date("2023-07-01"), endDate: new Date("2026-06-30"), monthlyRent: 2350, depositAmount: 2350, depositHeld: 2350, status: "active", signedAt: new Date("2023-06-15") },
    ],
  });
  console.log("✓ Tenants and leases created");

  // ─── Work Orders ────────────────────────────────────────────
  await prisma.workOrder.createMany({
    data: [
      { companyId: company.id, propertyId: property1.id, unitId: unit4B.id, woNumber: "WO-1144", title: "HVAC failure — no cooling", priority: "emergency", status: "in_progress", category: "hvac", vendorName: "CoolAir HVAC", estimatedCost: 3200 },
      { companyId: company.id, propertyId: property1.id, woNumber: "WO-1131", title: "Exterior lighting replacement", priority: "low", status: "open", category: "electrical", estimatedCost: 320 },
    ],
  });
  console.log("✓ Work orders created");

  // ─── Trust Accounts ─────────────────────────────────────────
  const trust1 = await prisma.trustAccount.create({
    data: { companyId: company.id, ownerName: "L. Kim", balance: 14910, reserveBalance: 42000 },
  });
  await prisma.trustTransaction.create({
    data: { trustAccountId: trust1.id, type: "deposit", amount: 18900, description: "May 2026 rent collection — 7 units", createdBy: admin.id },
  });
  console.log("✓ Trust accounts and transactions created");

  // ─── Compliance Items ───────────────────────────────────────
  await prisma.complianceItem.createMany({
    data: [
      { companyId: company.id, propertyId: property1.id, title: "Fire safety inspection", category: "inspection", dueDate: new Date("2026-06-01"), status: "overdue", assignedTo: "J. Martinez" },
      { companyId: company.id, propertyId: property1.id, title: "CO detector certification", category: "certificate", dueDate: new Date("2026-06-03"), status: "overdue", assignedTo: "J. Martinez" },
      { companyId: company.id, title: "Business license renewal", category: "license", dueDate: new Date("2026-06-30"), status: "due_soon", assignedTo: "Admin" },
    ],
  });
  console.log("✓ Compliance items created");

  // ─── Invoices ───────────────────────────────────────────────
  await prisma.invoice.create({
    data: {
      companyId: company.id,
      invoiceNumber: "INV-0841",
      toName: "L. Kim",
      toEmail: "l.kim@kimprops.com",
      description: "Management fee — May 2026",
      subtotal: 14200,
      total: 14200,
      dueDate: new Date("2026-06-01"),
      status: "pending",
    },
  });
  console.log("✓ Invoices created");

  // ─── Audit log ──────────────────────────────────────────────
  await prisma.auditLog.create({
    data: { companyId: company.id, userId: admin.id, action: "seed", entity: "System", metadata: { note: "Database seeded successfully" } },
  });

  console.log("\n✅ Seed complete!");
  console.log("\nLogin credentials:");
  console.log("  Admin:   admin@havilon-demo.com / Demo1234!");
  console.log("  Manager: mgr@havilon-demo.com   / Demo1234!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

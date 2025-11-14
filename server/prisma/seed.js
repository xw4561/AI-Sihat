/**
 * Prisma seed script to create test users
 * Run with: npx prisma db seed
 * (Make sure seed command is configured in package.json)
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Delete existing test users (optional, comment out to keep)
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "admin@example.com",
          "pharmacist@example.com",
          "user@example.com",
        ],
      },
    },
  });

  // Create test users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const pharmacistPassword = await bcrypt.hash("pharmacist123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.create({
    data: {
      username: "Admin",
      email: "admin@example.com",
      password: adminPassword,
      role: "ADMIN",
      points: 0,
    },
  });
  console.log("✅ Created admin user:", admin.email);

  const pharmacist = await prisma.user.create({
    data: {
      username: "Pharmacist",
      email: "pharmacist@example.com",
      password: pharmacistPassword,
      role: "PHARMACIST",
      points: 0,
    },
  });
  console.log("✅ Created pharmacist user:", pharmacist.email);

  const user = await prisma.user.create({
    data: {
      username: "John Doe",
      email: "user@example.com",
      password: userPassword,
      role: "USER",
      points: 100,
    },
  });
  console.log("✅ Created regular user:", user.email);

  console.log("\n📋 Test accounts created:");
  console.log("  Admin: admin@example.com / admin123");
  console.log("  Pharmacist: pharmacist@example.com / pharmacist123");
  console.log("  User: user@example.com / user123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("\n✅ Seeding completed!");
  })
  .catch(async (e) => {
    console.error("❌ Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

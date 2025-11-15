/**
 * Quick database connection test
 * Run with: node test-db-connection.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');
  console.log('DIRECT_URL:', process.env.DIRECT_URL ? '✓ Set' : '✗ Not set');

  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  try {
    console.log('\n📡 Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Try a simple query
    console.log('\n📊 Attempting to query users table...');
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} user(s) in database`);

    // List users
    const users = await prisma.user.findMany({
      select: { userId: true, username: true, email: true, role: true },
      take: 5,
    });
    console.log('\n📋 Sample users:');
    users.forEach((u) => console.log(`   - ${u.username} (${u.email}) - ${u.role}`));
  } catch (err) {
    console.error('\n❌ Connection failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check DATABASE_URL and DIRECT_URL in .env file');
    console.error('2. Verify Supabase credentials are correct');
    console.error('3. Check if database is reachable (firewall/network)');
    console.error('4. Try using a local PostgreSQL instead');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

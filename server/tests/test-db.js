const prisma = require('../prisma/client');

async function testConnection() {
  try {
    console.log('🔍 Testing Prisma database connection...\n');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!\n');
    
    // Test query
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query executed successfully!\n');
    
    // Count records
    const userCount = await prisma.user.count();
    const medicineCount = await prisma.medicine.count();
    const orderCount = await prisma.order.count();
    
    console.log('📊 Database Statistics:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Medicines: ${medicineCount}`);
    console.log(`   Orders: ${orderCount}\n`);
    
    console.log('✅ All tests passed! Prisma is ready to use.\n');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`   ${error.message}\n`);
    
    if (error.message.includes('connect')) {
      console.log('💡 Troubleshooting tips:');
      console.log('   1. Check your DATABASE_URL in .env file');
      console.log('   2. Make sure your Supabase database is running');
      console.log('   3. Verify your database credentials are correct');
      console.log('   4. Run: npx prisma db push (to create tables if they don\'t exist)\n');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

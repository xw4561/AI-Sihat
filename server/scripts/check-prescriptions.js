const prisma = require('../prisma/client');

async function checkPrescriptions() {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: {
        chat: true,
        user: true
      }
    });
    
    console.log(`\nTotal prescriptions: ${prescriptions.length}`);
    console.log(JSON.stringify(prescriptions, null, 2));
    
    const pending = prescriptions.filter(p => p.status === 'pending');
    console.log(`\nPending prescriptions: ${pending.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrescriptions();

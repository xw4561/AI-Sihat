/**
 * Script to add sample medicines to the database
 * Run with: node scripts/add-sample-medicines.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sampleMedicines = [
  {
    medicineName: 'Paracetamol 500mg',
    medicineType: 'Pain Relief / Fever',
    medicineQuantity: 100,
    price: 5.50,
    imageUrl: 'https://via.placeholder.com/150?text=Paracetamol'
  },
  {
    medicineName: 'Ibuprofen 400mg',
    medicineType: 'Pain Relief / Anti-inflammatory',
    medicineQuantity: 80,
    price: 8.00,
    imageUrl: 'https://via.placeholder.com/150?text=Ibuprofen'
  },
  {
    medicineName: 'Loratadine 10mg',
    medicineType: 'Antihistamine / Allergy',
    medicineQuantity: 60,
    price: 12.00,
    imageUrl: 'https://via.placeholder.com/150?text=Loratadine'
  },
  {
    medicineName: 'Amoxicillin 500mg',
    medicineType: 'Antibiotic',
    medicineQuantity: 50,
    price: 15.00,
    imageUrl: 'https://via.placeholder.com/150?text=Amoxicillin'
  },
  {
    medicineName: 'Cetirizine 10mg',
    medicineType: 'Antihistamine / Allergy',
    medicineQuantity: 70,
    price: 10.00,
    imageUrl: 'https://via.placeholder.com/150?text=Cetirizine'
  },
  {
    medicineName: 'Omeprazole 20mg',
    medicineType: 'Antacid / Stomach',
    medicineQuantity: 45,
    price: 18.00,
    imageUrl: 'https://via.placeholder.com/150?text=Omeprazole'
  },
  {
    medicineName: 'Cough Syrup 100ml',
    medicineType: 'Cough / Cold',
    medicineQuantity: 40,
    price: 14.00,
    imageUrl: 'https://via.placeholder.com/150?text=Cough+Syrup'
  },
  {
    medicineName: 'Flu-away Capsule',
    medicineType: 'Flu / Cold',
    medicineQuantity: 65,
    price: 16.00,
    imageUrl: 'https://via.placeholder.com/150?text=Flu-away'
  },
  {
    medicineName: 'Diarrhea Relief',
    medicineType: 'Digestive',
    medicineQuantity: 55,
    price: 11.00,
    imageUrl: 'https://via.placeholder.com/150?text=Diarrhea+Relief'
  },
  {
    medicineName: 'Vitamin C 1000mg',
    medicineType: 'Supplement',
    medicineQuantity: 90,
    price: 20.00,
    imageUrl: 'https://via.placeholder.com/150?text=Vitamin+C'
  }
];

async function addMedicines() {
  try {
    console.log('🚀 Starting to add sample medicines...\n');

    for (const medicine of sampleMedicines) {
      // Check if medicine already exists
      const existing = await prisma.medicine.findFirst({
        where: { medicineName: medicine.medicineName }
      });

      if (existing) {
        console.log(`⏭️  Skipping "${medicine.medicineName}" - already exists`);
      } else {
        await prisma.medicine.create({
          data: medicine
        });
        console.log(`✅ Added "${medicine.medicineName}" - ${medicine.medicineType}`);
      }
    }

    console.log('\n🎉 Finished adding medicines!');
    
    // Show total count
    const total = await prisma.medicine.count();
    console.log(`📊 Total medicines in database: ${total}`);

  } catch (error) {
    console.error('❌ Error adding medicines:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMedicines();

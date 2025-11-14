const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const symptomsData = require('../data/symptoms.json');

// Extract medicine names from recommendation prompts
function extractMedicines() {
  const medicines = new Set();
  
  // Go through each symptom category
  Object.values(symptomsData).forEach(category => {
    category.forEach(item => {
      if (item.type === 'recommendation' && item.prompt) {
        // Get the first line which usually contains the medicine name
        const firstLine = item.prompt[0];
        
        // Extract medicine name (everything before the colon or dosage)
        const match = firstLine.match(/^([^(:]+?)(?:\s*\(|:|\s+\d)/);
        if (match) {
          const medicine = match[1].trim();
          medicines.add(medicine);
        }
      }
    });
  });
  
  return Array.from(medicines);
}

async function seedMedicines() {
  console.log('🌱 Seeding medicines from symptoms.json...');
  
  const medicineNames = extractMedicines();
  console.log(`Found ${medicineNames.length} unique medicines`);
  
  let added = 0;
  let skipped = 0;
  
  for (const name of medicineNames) {
    try {
      // Check if medicine already exists
      const existing = await prisma.medicine.findFirst({
        where: {
          medicineName: {
            equals: name,
            mode: 'insensitive'
          }
        }
      });
      
      if (existing) {
        console.log(`⏭️  Skipped: ${name} (already exists)`);
        skipped++;
        continue;
      }
      
      // Add new medicine - default to OTC since these are from AI recommendations
      await prisma.medicine.create({
        data: {
          medicineName: name,
          medicineType: 'OTC',
          medicineQuantity: 100, // Default stock
          price: 10.00, // Default price
          imageUrl: null // Leave blank as requested
        }
      });
      
      console.log(`✅ Added: ${name}`);
      added++;
      
    } catch (error) {
      console.error(`❌ Error adding ${name}:`, error.message);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Added: ${added}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${medicineNames.length}`);
}

seedMedicines()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

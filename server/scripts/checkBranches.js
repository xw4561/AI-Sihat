const prisma = require('../prisma/client');

(async function(){
  try{
    const branches = await prisma.pharmacyBranch.findMany();
    console.log('FOUND', JSON.stringify(branches, null, 2));
  }catch(e){
    console.error('ERR', e && e.stack ? e.stack : e);
  }finally{
    await prisma.$disconnect();
  }
})();

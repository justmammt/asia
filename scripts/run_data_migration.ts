const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`
    UPDATE "Vehicle" v
    SET 
      insurance_interval = vt.insurance_interval,
      tax_interval = vt.tax_interval,
      revision_interval = vt.revision_interval
    FROM "VehicleType" vt
    WHERE v.type_id = vt.id;
  `;
  console.log('Data migration completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

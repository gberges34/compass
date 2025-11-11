import { prisma } from './src/prisma';

async function testEnrichment() {
  const tempTask = await prisma.tempCapturedTask.create({
    data: {
      name: 'Test enrichment',
      source: 'TODOIST',
      processed: false,
    }
  });

  console.log('Created temp task:', tempTask.id);

  // Simulate transaction failure
  try {
    await prisma.$transaction(async (tx) => {
      // This succeeds
      const task = await tx.task.create({
        data: {
          name: 'Enriched task',
          status: 'NEXT',
          priority: 'MUST',
          category: 'ADMIN',
          context: 'COMPUTER',
          energyRequired: 'MEDIUM',
          duration: 30,
          definitionOfDone: 'Done',
        }
      });

      // Force failure by trying to mark non-existent temp task
      await tx.tempCapturedTask.update({
        where: { id: 'invalid-id' },
        data: { processed: true }
      });
    });
  } catch (error) {
    console.log('Transaction rolled back (expected)');
  }

  // Verify rollback
  const tempTaskAfter = await prisma.tempCapturedTask.findUnique({
    where: { id: tempTask.id }
  });
  const taskCount = await prisma.task.count({
    where: { name: 'Enriched task' }
  });

  console.log('Temp task still unprocessed:', !tempTaskAfter?.processed); // Should be true
  console.log('Task was NOT created:', taskCount === 0); // Should be true

  // Cleanup
  await prisma.tempCapturedTask.delete({ where: { id: tempTask.id } });
}

testEnrichment().then(() => process.exit(0));

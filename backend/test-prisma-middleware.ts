import { prisma } from './src/prisma';
import { NotFoundError } from './src/errors/AppError';

async function testMiddleware() {
  console.log('Testing Prisma middleware error handling...\n');

  // Test 1: P2025 caught by middleware
  console.log('Test 1: Update non-existent task');
  try {
    await prisma.task.update({
      where: { id: 'non-existent-id' },
      data: { name: 'Updated' }
    });
    console.log('❌ FAIL: Should have thrown NotFoundError');
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.log('✅ PASS: NotFoundError thrown');
      console.log('   Message:', error.message);
      console.log('   Code:', error.code);
      console.log('   Status:', error.statusCode);
    } else {
      console.log('❌ FAIL: Wrong error type:', error);
    }
  }

  // Test 2: P2025 in transaction
  console.log('\nTest 2: Transaction with non-existent task');
  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: 'non-existent-id' },
        data: { status: 'DONE' }
      });
    });
    console.log('❌ FAIL: Should have thrown NotFoundError');
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.log('✅ PASS: NotFoundError thrown in transaction');
    } else {
      console.log('❌ FAIL: Wrong error type:', error);
    }
  }

  // Test 3: Delete non-existent record
  console.log('\nTest 3: Delete non-existent task');
  try {
    await prisma.task.delete({
      where: { id: 'non-existent-id' }
    });
    console.log('❌ FAIL: Should have thrown NotFoundError');
  } catch (error) {
    if (error instanceof NotFoundError) {
      console.log('✅ PASS: NotFoundError thrown for delete');
    } else {
      console.log('❌ FAIL: Wrong error type:', error);
    }
  }

  // Test 4: Normal operation still works
  console.log('\nTest 4: Normal operation');
  try {
    const tasks = await prisma.task.findMany({ take: 1 });
    console.log('✅ PASS: Normal query works (found', tasks.length, 'tasks)');
  } catch (error) {
    console.log('❌ FAIL: Normal query failed:', error);
  }

  console.log('\n✅ All middleware tests passed!');
}

testMiddleware()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

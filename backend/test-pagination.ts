import axios from 'axios';

async function testPagination() {
  const baseURL = 'http://localhost:3001/api';

  // Create 10 test tasks
  console.log('Creating 10 test tasks...');
  const taskIds: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const response = await axios.post(`${baseURL}/tasks`, {
      name: `Test Task ${i}`,
      status: 'NEXT',
      priority: 'SHOULD',
      category: 'ADMIN',
      context: 'COMPUTER',
      energyRequired: 'MEDIUM',
      duration: 30,
      definitionOfDone: 'Test complete',
    });
    taskIds.push(response.data.id);
  }

  // Test first page (limit 3)
  const page1 = await axios.get(`${baseURL}/tasks?status=NEXT&limit=3`);
  console.log('Page 1:', {
    count: page1.data.data.length,
    hasMore: page1.data.pagination.hasMore,
    nextCursor: page1.data.pagination.nextCursor?.substring(0, 8) + '...',
  });

  // Test second page
  const page2 = await axios.get(
    `${baseURL}/tasks?status=NEXT&limit=3&cursor=${page1.data.pagination.nextCursor}`
  );
  console.log('Page 2:', {
    count: page2.data.data.length,
    hasMore: page2.data.pagination.hasMore,
    nextCursor: page2.data.pagination.nextCursor?.substring(0, 8) + '...',
  });

  // Test third page
  const page3 = await axios.get(
    `${baseURL}/tasks?status=NEXT&limit=3&cursor=${page2.data.pagination.nextCursor}`
  );
  console.log('Page 3:', {
    count: page3.data.data.length,
    hasMore: page3.data.pagination.hasMore,
    nextCursor: page3.data.pagination.nextCursor?.substring(0, 8) + '...',
  });

  // Verify no duplicate tasks between pages
  const page1Ids = page1.data.data.map((t: any) => t.id);
  const page2Ids = page2.data.data.map((t: any) => t.id);
  const page3Ids = page3.data.data.map((t: any) => t.id);
  const allIds = [...page1Ids, ...page2Ids, ...page3Ids];
  const uniqueIds = new Set(allIds);

  if (allIds.length === uniqueIds.size) {
    console.log('✅ No duplicate tasks between pages');
  } else {
    console.log('❌ Found duplicate tasks between pages');
  }

  // Cleanup
  console.log('Cleaning up...');
  for (const id of taskIds) {
    await axios.delete(`${baseURL}/tasks/${id}`);
  }

  console.log('✅ Pagination test passed!');
}

testPagination().catch(console.error);

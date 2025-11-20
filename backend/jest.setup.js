// jest.setup.js
// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/compass_test?schema=public';
process.env.PORT = '3002';
process.env.API_SECRET = process.env.API_SECRET || 'test-api-secret-for-testing-only';

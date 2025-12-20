/**
 * Jest Test Setup
 * 
 * This file runs before each test file and sets up:
 * - Environment variables for testing
 * - Database connection for integration tests
 * - Global test utilities
 */

import 'dotenv/config';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global beforeAll - runs once before all tests
beforeAll(async () => {
    console.log('🧪 Starting test suite...');
});

// Global afterAll - runs once after all tests
afterAll(async () => {
    console.log('✅ Test suite complete.');
});

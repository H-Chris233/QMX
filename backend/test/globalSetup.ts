/**
 * Jest Global Setup for PostgreSQL Test Database
 * Automatically manages PostgreSQL Docker container for tests
 */

import { execSync } from 'child_process';

const CONTAINER_NAME = 'qmx-postgres-test-global';
const TEST_PORT = '5435';

async function waitForPostgres(): Promise<void> {
  console.log('⏳ Waiting for PostgreSQL to be ready...');
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      execSync(`docker exec ${CONTAINER_NAME} pg_isready -U qmx_test`, { stdio: 'ignore' });
      console.log('✅ PostgreSQL is ready');
      return;
    } catch (e) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('PostgreSQL failed to start after 30 attempts');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

export default async function globalSetup(): Promise<void> {
  console.log('🐳 Setting up PostgreSQL test database...');
  
  try {
    // Check if Docker is available
    execSync('docker --version', { stdio: 'ignore' });
  } catch {
    throw new Error('Docker is not available. Please install Docker to run tests.');
  }
  
  // Clean up any existing container
  try {
    execSync(`docker stop ${CONTAINER_NAME} 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`docker rm ${CONTAINER_NAME} 2>/dev/null || true`, { stdio: 'ignore' });
  } catch (e) {
    // Ignore cleanup errors
  }
  
  // Start PostgreSQL container
  execSync(`
    docker run -d \
      --name ${CONTAINER_NAME} \
      -e POSTGRES_USER=qmx_test \
      -e POSTGRES_PASSWORD=qmx_test_password \
      -e POSTGRES_DB=qmx_test \
      -p ${TEST_PORT}:5432 \
      postgres:15-alpine
  `, { stdio: 'pipe' });
  
  // Wait for PostgreSQL to be ready
  await waitForPostgres();
  
  // Set environment variables
  process.env.DATABASE_URL = `postgresql://qmx_test:qmx_test_password@localhost:${TEST_PORT}/qmx_test`;
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.LOG_STDOUT = 'true';
  process.env.REDIS_ENABLED = 'false';
  
  console.log(`🔗 Database URL: ${process.env.DATABASE_URL}`);
  
  // Apply database schema using drizzle-kit
  console.log('🗄️ Setting up database schema...');
  try {
    execSync('pnpm run db:push --force', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    console.log('✅ Database schema set up complete');
  } catch (error) {
    console.error('❌ Failed to set up database schema:', error.message);
    throw error;
  }
}
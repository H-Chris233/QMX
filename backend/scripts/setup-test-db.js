#!/usr/bin/env node

/**
 * PostgreSQL Test Database Setup Script
 * 
 * This script sets up the PostgreSQL test database for Jest tests.
 * It can be run manually before tests, or integrated into the test pipeline.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🐘 Setting up PostgreSQL test database...');

// Check if Docker is available
try {
  execSync('docker --version', { stdio: 'ignore' });
  console.log('✅ Docker is available');
} catch (error) {
  console.log('❌ Docker is not installed or not running');
  console.log('');
  console.log('Please install Docker and try again:');
  console.log('  - Docker Desktop: https://www.docker.com/products/docker-desktop');
  console.log('  - Or use your package manager');
  process.exit(1);
}

// Create test database container
try {
  console.log('📦 Starting PostgreSQL test container...');
  
  // Stop existing container if it exists
  try {
    execSync('docker stop qmx-postgres-test 2>/dev/null || true', { stdio: 'ignore' });
    execSync('docker rm qmx-postgres-test 2>/dev/null || true', { stdio: 'ignore' });
  } catch (e) {
    // Ignore errors if container doesn't exist
  }
  
  // Start new container
  execSync(`
    docker run -d \
      --name qmx-postgres-test \
      -e POSTGRES_USER=qmx_test \
      -e POSTGRES_PASSWORD=qmx_test_password \
      -e POSTGRES_DB=qmx_test \
      -p 5433:5432 \
      postgres:15-alpine
  `, { stdio: 'pipe' });
  
  console.log('⏳ Waiting for PostgreSQL to be ready...');
  
  // Wait for PostgreSQL to be ready
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    try {
      execSync('docker exec qmx-postgres-test pg_isready -U qmx_test', { stdio: 'ignore' });
      console.log('✅ PostgreSQL is ready');
      break;
    } catch (e) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('PostgreSQL failed to start after 30 attempts');
      }
      // Wait 2 seconds before retry
      execSync('sleep 2', { stdio: 'ignore' });
    }
  }
  
  console.log('');
  console.log('📋 Test Database Connection Info:');
  console.log('   Host: localhost');
  console.log('   Port: 5433');
  console.log('   Database: qmx_test');
  console.log('   Username: qmx_test');
  console.log('   Password: qmx_test_password');
  console.log('');
  console.log('🔗 Connection URL:');
  console.log('   postgresql://qmx_test:qmx_test_password@localhost:5433/qmx_test');
  console.log('');
  
  // Update .env.test file
  const envTestPath = path.join(__dirname, '..', '.env.test');
  const envContent = `# Test Environment Configuration
NODE_ENV=test
PORT=3002
DATABASE_URL=postgresql://qmx_test:qmx_test_password@localhost:5433/qmx_test
LOG_LEVEL=error
LOG_STDOUT=true
REDIS_ENABLED=false
`;
  
  fs.writeFileSync(envTestPath, envContent);
  console.log('✅ Updated .env.test file');
  
  console.log('');
  console.log('🎉 Test database setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run: pnpm run db:push  (apply schema)');
  console.log('  2. Run: npm test          (run tests)');
  console.log('  3. Or:   pnpm test:backend (from root)');
  
  process.exit(0);
  
} catch (error) {
  console.error('❌ Failed to setup test database:', error.message);
  process.exit(1);
}

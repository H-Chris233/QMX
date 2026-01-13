/**
 * Jest Global Teardown for PostgreSQL Test Database
 * Cleans up the PostgreSQL container after tests complete
 */

import { execSync } from 'child_process';

const CONTAINER_NAME = 'qmx-postgres-test-global';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up PostgreSQL test database...');
  
  try {
    execSync(`docker stop ${CONTAINER_NAME} 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`docker rm ${CONTAINER_NAME} 2>/dev/null || true`, { stdio: 'ignore' });
    console.log('✅ Test database cleaned up');
  } catch (e) {
    console.warn('⚠️ Warning: Failed to cleanup test database:', e.message);
  }
}
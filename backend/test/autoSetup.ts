/**
 * PostgreSQL Test Database Auto-Setup
 * 
 * This module automatically sets up a PostgreSQL test database using Docker
 * and tears it down after tests complete.
 */

import { execSync } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

export class TestDatabaseManager {
  private containerName = 'qmx-postgres-test-auto';
  private port = '5434'; // Use different port to avoid conflicts
  
  async isDockerAvailable(): Promise<boolean> {
    try {
      execSync('docker --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  
  async start(): Promise<void> {
    console.log('🐳 Setting up PostgreSQL test database...');
    
    // Check if Docker is available
    if (!(await this.isDockerAvailable())) {
      throw new Error('Docker is not available. Please install Docker to run tests.');
    }
    
    // Clean up any existing container
    await this.cleanup();
    
    try {
      // Start PostgreSQL container
      execSync(`
        docker run -d \
          --name ${this.containerName} \
          -e POSTGRES_USER=qmx_test \
          -e POSTGRES_PASSWORD=qmx_test_password \
          -e POSTGRES_DB=qmx_test \
          -p ${this.port}:5432 \
          -d postgres:15-alpine
      `, { stdio: 'pipe' });
      
      console.log('⏳ Waiting for PostgreSQL to be ready...');
      
      // Wait for PostgreSQL to be ready
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        try {
          execSync(`docker exec ${this.containerName} pg_isready -U qmx_test`, { stdio: 'ignore' });
          console.log('✅ PostgreSQL test database is ready');
          break;
        } catch (e) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error('PostgreSQL failed to start after 30 attempts');
          }
          await sleep(2000);
        }
      }
      
      // Set environment variable for the test database
      process.env.DATABASE_URL = `postgresql://qmx_test:qmx_test_password@localhost:${this.port}/qmx_test`;
      process.env.NODE_ENV = 'test';
      process.env.LOG_LEVEL = 'error';
      process.env.LOG_STDOUT = 'true';
      process.env.REDIS_ENABLED = 'false';
      
      console.log(`🔗 Database URL: ${process.env.DATABASE_URL}`);
      
    } catch (error) {
      console.error('❌ Failed to start test database:', error.message);
      throw error;
    }
  }
  
  async cleanup(): Promise<void> {
    try {
      // Stop and remove existing container if it exists
      execSync(`docker stop ${this.containerName} 2>/dev/null || true`, { stdio: 'ignore' });
      execSync(`docker rm ${this.containerName} 2>/dev/null || true`, { stdio: 'ignore' });
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  
  async stop(): Promise<void> {
    console.log('🧹 Cleaning up PostgreSQL test database...');
    await this.cleanup();
    console.log('✅ Test database cleaned up');
  }
}

// Global instance
const testDbManager = new TestDatabaseManager();

// Jest global setup and teardown
export const globalSetup = async (): Promise<void> => {
  await testDbManager.start();
  
  // Import and run drizzle push to set up schema
  const { execSync } = require('child_process');
  try {
    console.log('🗄️ Setting up database schema...');
    execSync('pnpm run db:push', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
    console.log('✅ Database schema set up');
  } catch (error) {
    console.error('❌ Failed to set up database schema:', error.message);
    throw error;
  }
};

export const globalTeardown = async (): Promise<void> => {
  await testDbManager.stop();
};

export default testDbManager;
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
    '!src/simple-server.ts',
    '!src/memory-server.ts',
    '!src/scripts/**',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  testTimeout: 30000,
  
  // 移除全局设置，每个测试文件自己管理数据库
  
  // 测试环境设置
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  
  // 并行测试配置
  maxWorkers: '50%', // 限制并发数避免资源冲突
  
  // 详细输出
  verbose: true,
};

export default config;
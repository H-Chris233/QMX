import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  clearMocks: true,
  
  // Global setup and teardown for PostgreSQL test database
  globalSetup: '<rootDir>/test/globalSetup.ts',
  globalTeardown: '<rootDir>/test/globalTeardown.ts',
  
  // 覆盖率配置 - 提升覆盖率标准
  collectCoverage: false, // 默认关闭，通过 --coverage 或 test:coverage 启用
  collectCoverageFrom: [
    'src/**/*.ts',
    // 排除测试文件
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!test/**',
    // 排除入口和服务器文件
    '!src/index.ts',
    '!src/simple-server.ts',
    '!src/memory-server.ts',
    '!src/app.ts',
    // 排除脚本和工具
    '!src/scripts/**',
    '!src/seed/**',
    // 排除类型定义
    '!src/types/**',
    '!src/**/*.d.ts',
    // 排除配置文件
    '!src/config/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],
  
  // 覆盖率阈值 - 目标 90%
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
  
  testMatch: [
    '**/__tests__/**/*.spec.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  testTimeout: 30000,
  
  // 测试环境设置
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  
  // 并行测试配置
  maxWorkers: '50%',
  
  // 详细输出
  verbose: true,
};

export default config;
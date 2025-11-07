#!/usr/bin/env node

/**
 * E2E测试文件结构验证脚本
 * 检查所有必需的测试文件是否已创建
 */

const { existsSync, statSync, readFileSync } = require('fs');
const { join } = require('path');

const requiredFiles = [
  // Page Objects
  'tests/e2e/page-objects/AppPage.ts',
  'tests/e2e/page-objects/StudentManagementPage.ts',
  'tests/e2e/page-objects/FinancialStatisticsPage.ts',
  'tests/e2e/page-objects/DashboardPage.ts',
  
  // Feature Tests
  'tests/e2e/features/student-management-core.spec.ts',
  'tests/e2e/features/financial-transactions.spec.ts',
  'tests/e2e/features/dashboard-stats.spec.ts',
  'tests/e2e/features/csv-export.spec.ts',
  'tests/e2e/features/installment-management.spec.ts',
  'tests/e2e/features/integration.spec.ts',
  
  // Utils
  'tests/e2e/utils/test-utils.ts',
  
  // Config
  'playwright.core.config.ts',
  
  // Scripts
  'scripts/run-e2e-core.js',
  
  // Documentation
  'tests/e2e/README.md'
];

const componentDataTestIds = [
  'src/MainApp.vue',
  'src/components/StudentManagement.vue',
  'src/components/FinancialStatistics.vue',
  'src/components/Dashboard.vue'
];

function checkFile(filePath) {
  const exists = existsSync(filePath);
  if (exists) {
    const stats = statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`✅ ${filePath} (${sizeKB}KB)`);
    return true;
  } else {
    console.log(`❌ ${filePath} - 文件不存在`);
    return false;
  }
}

function checkDataTestIds(filePath) {
  if (!existsSync(filePath)) {
    console.log(`❌ ${filePath} - 文件不存在`);
    return false;
  }
  
  const content = readFileSync(filePath, 'utf8');
  const hasDataTestId = content.includes('data-testid=');
  
  if (hasDataTestId) {
    console.log(`✅ ${filePath} - 包含 data-testid`);
    return true;
  } else {
    console.log(`⚠️  ${filePath} - 未找到 data-testid`);
    return false;
  }
}

function main() {
  console.log('🔍 验证E2E核心流程测试文件结构...\n');
  
  let allFilesExist = true;
  
  console.log('📁 检查必需文件:');
  requiredFiles.forEach(file => {
    if (!checkFile(file)) {
      allFilesExist = false;
    }
  });
  
  console.log('\n🏷️  检查组件 data-testid:');
  componentDataTestIds.forEach(file => {
    checkDataTestIds(file);
  });
  
  console.log('\n📊 验证结果:');
  if (allFilesExist) {
    console.log('✅ 所有必需文件已创建');
    console.log('🚀 E2E核心流程测试准备就绪');
    console.log('\n📋 下一步:');
    console.log('  1. 运行 npm run e2e:install 安装浏览器');
    console.log('  2. 运行 npm run e2e:core 执行测试');
    console.log('  3. 查看 tests/e2e/README.md 了解更多信息');
  } else {
    console.log('❌ 部分文件缺失，请检查上述错误');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, checkDataTestIds };
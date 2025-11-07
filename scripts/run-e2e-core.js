#!/usr/bin/env node

/**
 * E2E核心流程测试运行脚本
 * 提供便捷的测试执行和报告生成功能
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestOptions {
  browser?: string;
  headed?: boolean;
  updateSnapshots?: boolean;
  generateReport?: boolean;
  coverage?: boolean;
  grep?: string;
  project?: string;
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
🧪 E2E核心流程测试运行器

用法:
  npm run test:e2e:core [选项]

选项:
  --browser <name>     指定浏览器 (chromium|firefox|webkit|all)
  --headed             显示浏览器界面
  --update-snapshots   更新截图
  --report             生成HTML报告
  --coverage           生成覆盖率报告
  --grep <pattern>     运行匹配的测试
  --project <name>     运行指定项目
  --help               显示此帮助信息

示例:
  npm run test:e2e:core                           # 运行所有核心流程测试
  npm run test:e2e:core --browser chromium         # 仅在Chrome中运行
  npm run test:e2e:core --headed                  # 显示浏览器界面
  npm run test:e2e:core --report                 # 生成测试报告
  npm run test:e2e:core --grep "学员管理"          # 运行学员管理相关测试
  npm run test:e2e:core --project chromium-core    # 运行指定项目
`);
}

/**
 * 解析命令行参数
 */
function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--browser':
        options.browser = args[++i];
        break;
      case '--headed':
        options.headed = true;
        break;
      case '--update-snapshots':
        options.updateSnapshots = true;
        break;
      case '--report':
        options.generateReport = true;
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--grep':
        options.grep = args[++i];
        break;
      case '--project':
        options.project = args[++i];
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * 构建Playwright命令
 */
function buildCommand(options: TestOptions): string {
  let command = 'npx playwright test';
  
  // 使用核心流程配置
  command += ' --config=playwright.core.config.ts';
  
  // 指定浏览器
  if (options.browser && options.browser !== 'all') {
    command += ` --project=${options.browser}-core`;
  } else if (options.project) {
    command += ` --project=${options.project}`;
  }
  
  // 显示浏览器界面
  if (options.headed) {
    command += ' --headed';
  }
  
  // 更新截图
  if (options.updateSnapshots) {
    command += ' --update-snapshots';
  }
  
  // 测试过滤
  if (options.grep) {
    command += ` --grep="${options.grep}"`;
  }
  
  // 覆盖率
  if (options.coverage) {
    command += ' --coverage';
  }
  
  return command;
}

/**
 * 确保目录存在
 */
function ensureDirectories(): void {
  const dirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'playwright-report',
    'coverage'
  ];

  dirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`📁 创建目录: ${dir}`);
    }
  });
}

/**
 * 运行测试
 */
async function runTests(): Promise<void> {
  console.log('🚀 开始运行E2E核心流程测试...\n');
  
  const options = parseArgs();
  
  // 确保必要目录存在
  ensureDirectories();
  
  // 构建命令
  const command = buildCommand(options);
  console.log(`📋 执行命令: ${command}\n`);
  
  try {
    // 运行测试
    execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CI: process.env.CI || 'false'
      }
    });
    
    console.log('\n✅ E2E核心流程测试完成！');
    
    // 生成报告
    if (options.generateReport) {
      console.log('\n📊 生成测试报告...');
      try {
        execSync('npx playwright show-report', { stdio: 'inherit' });
        console.log('📈 报告已生成，请在浏览器中查看');
      } catch (error) {
        console.log('⚠️  报告生成失败，请手动运行: npx playwright show-report');
      }
    }
    
    // 显示测试结果摘要
    showTestSummary();
    
  } catch (error) {
    console.error('\n❌ E2E核心流程测试失败！');
    process.exit(1);
  }
}

/**
 * 显示测试结果摘要
 */
function showTestSummary(): void {
  console.log('\n📋 测试覆盖范围:');
  console.log('  ✅ 学员管理 - 增删改查、分页、筛选');
  console.log('  ✅ 现金交易 - 创建、查询、金额单位转换');
  console.log('  ✅ 统计仪表盘 - 数据加载、一致性验证');
  console.log('  ✅ CSV导出 - 筛选结果导出、文件内容验证');
  console.log('  ✅ 分期计划 - 创建、状态更新、统计同步');
  console.log('  ✅ 集成测试 - 跨模块数据一致性');
  
  console.log('\n📁 生成的文件:');
  console.log('  📸 test-results/screenshots/ - 失败截图');
  console.log('  🎥 test-results/videos/ - 测试视频');
  console.log('  🔍 test-results/traces/ - 详细追踪');
  console.log('  📊 playwright-report/ - HTML报告');
  console.log('  📄 test-results/results.json - JSON结果');
}

/**
 * 检查环境
 */
function checkEnvironment(): void {
  console.log('🔍 检查测试环境...\n');
  
  // 检查Node.js版本
  const nodeVersion = process.version;
  console.log(`  Node.js版本: ${nodeVersion}`);
  
  // 检查是否安装了Playwright
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    console.log('  ✅ Playwright已安装');
  } catch {
    console.log('  ❌ Playwright未安装，请运行: npm install @playwright/test');
    process.exit(1);
  }
  
  // 检查浏览器
  try {
    execSync('npx playwright install --dry-run', { stdio: 'pipe' });
    console.log('  ✅ 浏览器已安装');
  } catch {
    console.log('  ⚠️  建议运行: npx playwright install');
  }
  
  console.log('');
}

// 主程序
if (require.main === module) {
  checkEnvironment();
  runTests().catch(console.error);
}

export { runTests, parseArgs, buildCommand };
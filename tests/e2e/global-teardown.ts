import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';

/**
 * 全局测试清理
 * 1. 清理测试数据
 * 2. 收集测试结果
 * 3. 清理临时文件
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始 E2E 测试全局清理...');
  
  try {
    // 清理测试数据
    await cleanupTestData();
    
    // 收集测试结果摘要
    await collectTestSummary();
    
    console.log('✅ E2E 测试全局清理完成');
  } catch (error) {
    console.error('❌ E2E 测试全局清理失败:', error);
    // 不抛出错误，避免影响测试结果
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('🗑️  清理测试数据...');
  
  try {
    // 调用后端清理接口
    const response = await fetch('http://localhost:3001/api/v1/test/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'cleanup',
        environment: 'test',
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('  ✅ 测试数据清理完成:', result.message);
    } else if (response.status === 404) {
      console.log('  ⚠️  未找到测试清理接口，跳过数据清理');
    } else {
      console.log('  ⚠️  测试数据清理失败');
    }
  } catch (error) {
    console.log('  ⚠️  无法连接到测试清理接口');
  }
}

/**
 * 收集测试结果摘要
 */
async function collectTestSummary() {
  console.log('📊 收集测试结果摘要...');
  
  try {
    // 检查测试结果文件
    const resultFiles = [
      'test-results/results.json',
      'test-results/results.xml',
    ];
    
    let summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
    };
    
    // 尝试读取JSON结果文件
    try {
      const jsonResultsExists = await fs.access('test-results/results.json').then(() => true).catch(() => false);
      if (jsonResultsExists) {
        const jsonResults = JSON.parse(await fs.readFile('test-results/results.json', 'utf-8'));
        summary = {
          totalTests: jsonResults.suites?.reduce((acc: number, suite: any) => 
            acc + suite.specs?.reduce((specAcc: number, spec: any) => 
              specAcc + (spec.tests?.length || 0), 0), 0) || 0,
          passedTests: jsonResults.suites?.reduce((acc: number, suite: any) => 
            acc + suite.specs?.reduce((specAcc: number, spec: any) => 
              specAcc + (spec.tests?.filter((test: any) => test.results?.[0]?.status === 'passed').length || 0), 0), 0) || 0,
          failedTests: jsonResults.suites?.reduce((acc: number, suite: any) => 
            acc + suite.specs?.reduce((specAcc: number, spec: any) => 
              specAcc + (spec.tests?.filter((test: any) => test.results?.[0]?.status === 'failed').length || 0), 0), 0) || 0,
          skippedTests: jsonResults.suites?.reduce((acc: number, suite: any) => 
            acc + suite.specs?.reduce((specAcc: number, spec: any) => 
              specAcc + (spec.tests?.filter((test: any) => test.results?.[0]?.status === 'skipped').length || 0), 0), 0) || 0,
          duration: jsonResults.duration || 0,
        };
      }
    } catch (parseError) {
      console.log('  ⚠️  无法解析测试结果JSON文件');
    }
    
    console.log(`  📈 测试结果摘要:`);
    console.log(`     - 总测试数: ${summary.totalTests}`);
    console.log(`     - 通过: ${summary.passedTests}`);
    console.log(`     - 失败: ${summary.failedTests}`);
    console.log(`     - 跳过: ${summary.skippedTests}`);
    console.log(`     - 耗时: ${(summary.duration / 1000).toFixed(2)}s`);
    
    // 写入摘要文件
    await fs.writeFile('test-results/summary.txt', `
E2E 测试结果摘要
================
总测试数: ${summary.totalTests}
通过: ${summary.passedTests}
失败: ${summary.failedTests}
跳过: ${summary.skippedTests}
耗时: ${(summary.duration / 1000).toFixed(2)}s

生成时间: ${new Date().toISOString()}
    `.trim());
    
  } catch (error) {
    console.log('  ⚠️  无法收集测试结果摘要:', error);
  }
}

export default globalTeardown;
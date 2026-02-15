import fs from 'fs/promises';
import path from 'path';
import type { FullConfig, FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface SummaryStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  timedOutTests: number;
  interruptedTests: number;
  duration: number;
}

class SummaryReporter implements Reporter {
  private summary: SummaryStats = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    timedOutTests: 0,
    interruptedTests: 0,
    duration: 0,
  };

  onTestEnd(_test: TestCase, result: TestResult): void {
    this.summary.totalTests += 1;
    this.summary.duration += result.duration ?? 0;

    switch (result.status) {
      case 'passed':
        this.summary.passedTests += 1;
        break;
      case 'failed':
        this.summary.failedTests += 1;
        break;
      case 'skipped':
        this.summary.skippedTests += 1;
        break;
      case 'timedOut':
        this.summary.timedOutTests += 1;
        break;
      case 'interrupted':
        this.summary.interruptedTests += 1;
        break;
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    const outputDir = path.resolve(process.cwd(), 'test-results');
    await fs.mkdir(outputDir, { recursive: true });

    const payload = {
      ...this.summary,
      runStatus: result.status,
      generatedAt: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(payload, null, 2),
      'utf-8'
    );

    const text = [
      'E2E 测试结果摘要',
      '================',
      `总测试数: ${payload.totalTests}`,
      `通过: ${payload.passedTests}`,
      `失败: ${payload.failedTests}`,
      `跳过: ${payload.skippedTests}`,
      `超时: ${payload.timedOutTests}`,
      `中断: ${payload.interruptedTests}`,
      `耗时: ${(payload.duration / 1000).toFixed(2)}s`,
      `运行状态: ${payload.runStatus}`,
      `生成时间: ${payload.generatedAt}`,
    ].join('\n');

    await fs.writeFile(path.join(outputDir, 'summary.txt'), text, 'utf-8');

    console.log('📈 Reporter 测试结果摘要:');
    console.log(`   - 总测试数: ${payload.totalTests}`);
    console.log(`   - 通过: ${payload.passedTests}`);
    console.log(`   - 失败: ${payload.failedTests}`);
    console.log(`   - 跳过: ${payload.skippedTests}`);
    console.log(`   - 超时: ${payload.timedOutTests}`);
    console.log(`   - 中断: ${payload.interruptedTests}`);
    console.log(`   - 耗时: ${(payload.duration / 1000).toFixed(2)}s`);
  }
}

export default SummaryReporter;


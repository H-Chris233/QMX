import { type Page, expect } from '@playwright/test';

/**
 * 仪表盘页面对象模型
 * 封装仪表盘相关的操作
 */
export class DashboardPage {
  constructor(public readonly page: Page) {}

  /**
   * 等待仪表盘页面加载
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.locator('[data-testid="dashboard"]').waitFor({ state: 'visible' });
    await this.page.locator('[data-testid="loading-progress"]').waitFor({ state: 'hidden' }).catch(() => {});
  }

  /**
   * 点击刷新按钮
   */
  async clickRefresh(): Promise<void> {
    await this.page.locator('[data-testid="dashboard-refresh-btn"]').click();
    await this.waitForPageLoad();
  }

  /**
   * 获取总收入
   */
  async getTotalRevenue(): Promise<string> {
    return await this.page.locator('[data-testid="total-revenue"]').textContent() || '0';
  }

  /**
   * 获取活跃学员数
   */
  async getActiveStudents(): Promise<string> {
    return await this.page.locator('[data-testid="active-students"]').textContent() || '0';
  }

  /**
   * 获取平均成绩
   */
  async getAverageGrade(): Promise<string> {
    return await this.page.locator('[data-testid="average-grade"]').textContent() || '0';
  }

  /**
   * 获取即将过期会员数量
   */
  async getExpiringCount(): Promise<string> {
    return await this.page.locator('[data-testid="expiring-count"]').textContent() || '0';
  }

  /**
   * 获取即将过期的会员列表
   */
  async getExpiringMembers(): Promise<Array<{
    name: string;
    days: string;
    studentId: string;
  }>> {
    const members = [];
    const memberElements = await this.page.locator('[data-testid^="expiring-member-"]').all();
    
    for (const element of memberElements) {
      const name = await element.locator('.member-name').textContent();
      const daysText = await element.locator('.member-days').textContent();
      const testId = await element.getAttribute('data-testid');
      const studentId = testId?.replace('expiring-member-', '') || '';
      const dayMatch = daysText?.match(/(\d+)\s*天/);
      const days = dayMatch ? `${dayMatch[1]}天` : '';
      
      if (name && days) {
        members.push({ name: name.trim(), days, studentId });
      }
    }
    
    return members;
  }

  /**
   * 验证数字格式（应该有千分位分隔符）
   */
  async verifyNumberFormat(number: string): Promise<boolean> {
    // 检查是否有千分位分隔符（可选）
    const numberRegex = /^[\d,]+$/;
    return numberRegex.test(number.trim());
  }

  /**
   * 验证成绩格式（应该是保留一位或两位小数）
   */
  async verifyGradeFormat(grade: string): Promise<boolean> {
    const gradeRegex = /^\d+(\.\d{1,2})?$/;
    return gradeRegex.test(grade.trim());
  }

  /**
   * 验证金额格式（包含¥符号，可选两位小数）
   */
  async verifyCurrencyFormat(amount: string): Promise<boolean> {
    const currencyRegex = /^¥[\d,]+(\.\d{2})?$/;
    return currencyRegex.test(amount.trim());
  }

  /**
   * 将字符串转换为数字
   */
  parseStringToNumber(value: string): number {
    return parseInt(value.replace(/[,]/g, ''), 10);
  }

  /**
   * 将金额字符串转换为数字（分）
   */
  parseCurrencyToCents(amount: string): Promise<number> {
    const cleanAmount = amount.replace(/[¥,]/g, '');
    return Promise.resolve(Math.round(parseFloat(cleanAmount) * 100));
  }

  /**
   * 等待数据加载完成
   */
  async waitForDataLoad(): Promise<void> {
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="loading-progress"]');
      return element === null || element.style.display === 'none';
    });
    
    // 等待统计数据卡片显示实际数据（不是骨架屏）
    await this.page.locator('[data-testid="stats-grid"] .stat-card:not(.skeleton)').first().waitFor({ state: 'visible' });
  }

  /**
   * 检查是否正在加载
   */
  async isLoading(): Promise<boolean> {
    return await this.page.locator('[data-testid="loading-progress"]').isVisible().catch(() => false);
  }

  /**
   * 验证所有统计卡片都加载完成
   */
  async verifyAllCardsLoaded(): Promise<boolean> {
    const cards = [
      '[data-testid="revenue-card"]',
      '[data-testid="students-card"]',
      '[data-testid="grades-card"]',
      '[data-testid="membership-card"]'
    ];

    for (const cardSelector of cards) {
      const card = this.page.locator(cardSelector);
      const className = (await card.getAttribute('class')) || '';
      const isSkeleton = className.includes('skeleton');
      if (isSkeleton) {
        return false;
      }
    }

    return true;
  }
}

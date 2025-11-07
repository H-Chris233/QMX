import { type Page, expect } from '@playwright/test';

/**
 * 财务统计页面对象模型
 * 封装财务统计相关的操作
 */
export class FinancialStatisticsPage {
  constructor(public readonly page: Page) {}

  /**
   * 等待财务统计页面加载
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.locator('[data-testid="financial-statistics"]').waitFor({ state: 'visible' });
    await this.page.locator('[data-testid="loading-progress"]').waitFor({ state: 'hidden' }).catch(() => {});
  }

  /**
   * 点击刷新按钮
   */
  async clickRefresh(): Promise<void> {
    await this.page.locator('[data-testid="refresh-btn"]').click();
    await this.waitForPageLoad();
  }

  /**
   * 点击添加交易按钮
   */
  async clickAddTransaction(): Promise<void> {
    await this.page.locator('[data-testid="add-transaction-btn"]').click();
  }

  /**
   * 获取总收入
   */
  async getTotalIncome(): Promise<string> {
    return await this.page.locator('[data-testid="total-income"]').textContent() || '0';
  }

  /**
   * 获取总支出
   */
  async getTotalExpense(): Promise<string> {
    return await this.page.locator('[data-testid="total-expense"]').textContent() || '0';
  }

  /**
   * 获取净收益
   */
  async getNetProfit(): Promise<string> {
    return await this.page.locator('[data-testid="net-profit"]').textContent() || '0';
  }

  /**
   * 获取分期付款数量
   */
  async getInstallmentCount(): Promise<string> {
    return await this.page.locator('[data-testid="installment-count"]').textContent() || '0';
  }

  /**
   * 获取待处理分期数量
   */
  async getPendingInstallments(): Promise<string> {
    return await this.page.locator('[data-testid="pending-installments"]').textContent() || '0';
  }

  /**
   * 验证金额格式（应该包含¥符号和两位小数）
   */
  async verifyCurrencyFormat(amount: string): Promise<boolean> {
    // 格式应该类似 "¥1,234.56" 或 "¥1234.56"
    const currencyRegex = /^¥[\d,]+\.\d{2}$/;
    return currencyRegex.test(amount.trim());
  }

  /**
   * 将金额字符串转换为数字（分）
   */
  async parseCurrencyToCents(amount: string): Promise<number> {
    const cleanAmount = amount.replace(/[¥,]/g, '');
    return Math.round(parseFloat(cleanAmount) * 100);
  }

  /**
   * 验证财务统计数据的一致性
   */
  async verifyFinancialConsistency(): Promise<boolean> {
    const incomeText = await this.getTotalIncome();
    const expenseText = await this.getTotalExpense();
    const profitText = await this.getNetProfit();

    const incomeCents = await this.parseCurrencyToCents(incomeText);
    const expenseCents = await this.parseCurrencyToCents(expenseText);
    const profitCents = await this.parseCurrencyToCents(profitText);

    // 验证：净收益 = 总收入 - 总支出
    return profitCents === (incomeCents - expenseCents);
  }

  /**
   * 等待数据加载完成
   */
  async waitForDataLoad(): Promise<void> {
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="loading-progress"]');
      return element === null || element.style.display === 'none';
    });
  }

  /**
   * 检查是否正在加载
   */
  async isLoading(): Promise<boolean> {
    return await this.page.locator('[data-testid="loading-progress"]').isVisible().catch(() => false);
  }
}
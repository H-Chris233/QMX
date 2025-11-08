import { type Page, expect } from '@playwright/test';

/**
 * 测试辅助工具类
 * 提供通用的测试工具函数
 */
export class TestUtils {
  constructor(public readonly page: Page) {}

  /**
   * 等待并验证API响应
   */
  async waitForApiResponse(urlPattern: string, timeout: number = 10000): Promise<any> {
    return await this.page.waitForResponse(
      response => response.url().includes(urlPattern),
      { timeout }
    );
  }

  /**
   * 拦截并模拟API响应
   */
  async mockApiResponse(urlPattern: string, response: any, status: number = 200): Promise<void> {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * 模拟API错误
   */
  async mockApiError(urlPattern: string, errorType: 'failed' | 'timeout' = 'failed'): Promise<void> {
    await this.page.route(urlPattern, route => {
      if (errorType === 'failed') {
        route.abort('failed');
      } else {
        // 不处理，让请求超时
      }
    });
  }

  /**
   * 清除所有路由拦截
   */
  async clearAllRoutes(): Promise<void> {
    await this.page.unroute('**/*');
  }

  /**
   * 等待元素出现并验证可见性
   */
  async waitForElementVisible(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 等待元素消失
   */
  async waitForElementHidden(selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.locator(selector).waitFor({ state: 'hidden', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 安全地获取元素文本
   */
  async safeGetText(selector: string): Promise<string> {
    try {
      return await this.page.locator(selector).textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * 安全地检查元素是否存在
   */
  async safeExists(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).count() > 0;
    } catch {
      return false;
    }
  }

  /**
   * 安全地点击元素
   */
  async safeClick(selector: string): Promise<boolean> {
    try {
      await this.page.locator(selector).first().click();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 等待网络空闲
   */
  async waitForNetworkIdle(timeout: number = 5000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * 获取页面性能指标
   */
  async getPerformanceMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.start),
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        memoryUsage: (performance as any).memory ? {
          used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
        } : null
      };
    });
  }

  /**
   * 截图并保存
   */
  async takeScreenshot(name: string, fullPage: boolean = true): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${name}-${timestamp}.png`;
    
    await this.page.screenshot({
      path: `test-results/screenshots/${fileName}`,
      fullPage
    });
    
    return fileName;
  }

  /**
   * 验证金额格式
   */
  verifyCurrencyFormat(amount: string): boolean {
    const currencyRegex = /^¥[\d,]+\.\d{2}$/;
    return currencyRegex.test(amount.trim());
  }

  /**
   * 验证数字格式（带千分位）
   */
  verifyNumberFormat(number: string): boolean {
    const numberRegex = /^[\d,]+$/;
    return numberRegex.test(number.trim());
  }

  /**
   * 验证成绩格式
   */
  verifyGradeFormat(grade: string): boolean {
    const gradeRegex = /^\d+(\.\d{1,2})?$/;
    return gradeRegex.test(grade.trim());
  }

  /**
   * 验证日期格式 (YYYY-MM-DD)
   */
  verifyDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date.trim())) return false;

    try {
      const d = new Date(date.trim());
      return d instanceof Date && !isNaN(d.getTime());
    } catch {
      return false;
    }
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDateYYYYMMDD(date: Date | string): string {
    let d: Date;

    if (typeof date === 'string') {
      d = new Date(date);
    } else {
      d = date;
    }

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  /**
   * 获取当前UTC日期 (YYYY-MM-DD)
   */
  getTodayYYYYMMDD(): string {
    return this.formatDateYYYYMMDD(new Date());
  }

  /**
   * 验证页面中的日期显示格式
   */
  async verifyDateDisplayFormat(selector: string): Promise<boolean> {
    try {
      const dateText = await this.safeGetText(selector);
      return this.verifyDateFormat(dateText.trim());
    } catch {
      return false;
    }
  }

  /**
   * 将金额字符串转换为分
   */
  parseCurrencyToCents(amount: string): number {
    const cleanAmount = amount.replace(/[¥,]/g, '');
    return Math.round(parseFloat(cleanAmount) * 100);
  }

  /**
   * 将数字字符串转换为整数
   */
  parseStringToNumber(value: string): number {
    return parseInt(value.replace(/[,]/g, ''), 10);
  }

  /**
   * 等待并处理确认弹窗
   */
  async handleConfirmModal(shouldConfirm: boolean = true): Promise<void> {
    try {
      // 等待确认弹窗出现
      await this.page.waitForSelector('.modal-overlay, .dialog', { timeout: 3000 });
      
      if (shouldConfirm) {
        // 查找确认按钮
        const confirmSelectors = [
          'button:has-text("确认")',
          'button:has-text("确定")',
          'button:has-text("删除")',
          'button.confirm',
          'button.btn-primary'
        ];
        
        for (const selector of confirmSelectors) {
          if (await this.safeClick(selector)) {
            break;
          }
        }
      } else {
        // 查找取消按钮
        const cancelSelectors = [
          'button:has-text("取消")',
          'button:has-text("关闭")',
          'button.cancel',
          'button.btn-secondary'
        ];
        
        for (const selector of cancelSelectors) {
          if (await this.safeClick(selector)) {
            break;
          }
        }
      }
      
      // 等待弹窗消失
      await this.waitForElementHidden('.modal-overlay, .dialog');
    } catch (error) {
      console.log('没有确认弹窗或处理失败:', error);
    }
  }

  /**
   * 等待并处理错误提示
   */
  async handleErrorToast(): Promise<string> {
    try {
      await this.page.waitForSelector('.error-toast, .alert-error, [role="alert"]', { timeout: 3000 });
      const errorText = await this.safeGetText('.error-toast, .alert-error, [role="alert"]');
      
      // 尝试关闭错误提示
      const closeSelectors = [
        '.error-toast .close',
        '.alert-error .close',
        '[role="alert"] .close',
        'button:has-text("×")',
        'button:has-text("关闭")'
      ];
      
      for (const selector of closeSelectors) {
        if (await this.safeClick(selector)) {
          break;
        }
      }
      
      return errorText;
    } catch {
      return '';
    }
  }

  /**
   * 等待并处理成功提示
   */
  async handleSuccessToast(): Promise<string> {
    try {
      await this.page.waitForSelector('.success-toast, .alert-success, .toast-success', { timeout: 3000 });
      const successText = await this.safeGetText('.success-toast, .alert-success, .toast-success');
      
      // 尝试关闭成功提示
      const closeSelectors = [
        '.success-toast .close',
        '.alert-success .close',
        '.toast-success .close'
      ];
      
      for (const selector of closeSelectors) {
        if (await this.safeClick(selector)) {
          break;
        }
      }
      
      return successText;
    } catch {
      return '';
    }
  }

  /**
   * 模拟键盘输入
   */
  async simulateKeyboard(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.page.keyboard.press(key);
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * 设置视口大小并等待
   */
  async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
    await this.page.waitForTimeout(500);
  }

  /**
   * 滚动到元素
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.page.locator(selector).first().scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
  }

  /**
   * 等待文件下载
   */
  async waitForDownload(timeout: number = 10000): Promise<any> {
    return await this.page.waitForEvent('download', { timeout });
  }

  /**
   * 验证文件名格式
   */
  verifyFileNameFormat(fileName: string, pattern: RegExp): boolean {
    return pattern.test(fileName);
  }

  /**
   * 计算两个数值之间的差异百分比
   */
  calculatePercentageDifference(value1: number, value2: number): number {
    const average = (value1 + value2) / 2;
    return Math.abs(value1 - value2) / average * 100;
  }

  /**
   * 验证数值在容差范围内
   */
  isWithinTolerance(actual: number, expected: number, tolerancePercent: number = 5): boolean {
    const difference = Math.abs(actual - expected);
    const tolerance = expected * (tolerancePercent / 100);
    return difference <= tolerance;
  }
}

/**
 * 数据生成工具
 */
export class DataGenerator {
  /**
   * 生成随机学员数据
   */
  static generateStudentData(): any {
    const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
    const subjects = ['Shooting', 'Archery', 'Others'];
    const classes = ['TenTry', 'Month', 'Year', 'Others'];
    
    return {
      name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000),
      phone: '138' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      class: classes[Math.floor(Math.random() * classes.length)],
      age: Math.floor(Math.random() * 50) + 10,
      note: '测试学员数据'
    };
  }

  /**
   * 生成随机交易数据
   */
  static generateTransactionData(): any {
    const types = ['income', 'expense'];
    const categories = ['学费', '教材费', '场地费', '器材费', '其他'];
    
    return {
      type: types[Math.floor(Math.random() * types.length)],
      amount: Math.floor(Math.random() * 10000) + 100, // 100-10100分
      category: categories[Math.floor(Math.random() * categories.length)],
      description: '测试交易记录',
      date: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * 生成随机分期付款数据
   */
  static generateInstallmentData(): any {
    const statuses = ['pending', 'completed', 'overdue'];
    
    return {
      totalAmount: Math.floor(Math.random() * 50000) + 5000, // 50-500元
      periodCount: Math.floor(Math.random() * 12) + 1, // 1-12期
      status: statuses[Math.floor(Math.random() * statuses.length)],
      description: '测试分期付款'
    };
  }
}

/**
 * 断言扩展
 */
export class CustomAssertions {
  /**
   * 验证API响应格式
   */
  static async expectValidApiResponse(response: any): Promise<void> {
    expect(response).toBeDefined();
    expect(typeof response.success).toBe('boolean');
    expect(response.success).toBe(true);
  }

  /**
   * 验证错误响应格式
   */
  static async expectErrorResponse(response: any, expectedError?: string): Promise<void> {
    expect(response).toBeDefined();
    expect(typeof response.success).toBe('boolean');
    expect(response.success).toBe(false);
    
    if (expectedError) {
      expect(response.error || response.message).toContain(expectedError);
    }
  }

  /**
   * 验证分页信息
   */
  static async expectValidPagination(pagination: any): Promise<void> {
    expect(pagination).toBeDefined();
    expect(typeof pagination.page).toBe('number');
    expect(typeof pagination.total_pages).toBe('number');
    expect(typeof pagination.total).toBe('number');
    expect(pagination.page).toBeGreaterThan(0);
    expect(pagination.total_pages).toBeGreaterThan(0);
    expect(pagination.total).toBeGreaterThanOrEqual(0);
  }

  /**
   * 验证学员数据格式
   */
  static async expectValidStudentData(student: any): Promise<void> {
    expect(student).toBeDefined();
    expect(typeof student.uid).toBe('number');
    expect(typeof student.name).toBe('string');
    expect(typeof student.phone).toBe('string');
    expect(student.name).toBeTruthy();
    expect(student.phone).toBeTruthy();
  }

  /**
   * 验证交易数据格式
   */
  static async expectValidTransactionData(transaction: any): Promise<void> {
    expect(transaction).toBeDefined();
    expect(typeof transaction.id).toBe('number');
    expect(typeof transaction.type).toBe('string');
    expect(typeof transaction.amount).toBe('number');
    expect(['income', 'expense', 'installment']).toContain(transaction.type);
    expect(transaction.amount).toBeGreaterThanOrEqual(0);
  }
}
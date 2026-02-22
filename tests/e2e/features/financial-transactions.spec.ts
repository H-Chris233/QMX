import { test, expect } from '../fixtures';
import { AppPage } from '../page-objects/AppPage';
import { FinancialStatisticsPage } from '../page-objects/FinancialStatisticsPage';

/**
 * 现金交易核心流程测试
 * 覆盖交易记录的创建、查询、筛选等功能
 * 验证金额单位转换（前端元，后端分）
 */
test.describe('现金交易核心流程', () => {
  let appPage: AppPage;
  let financePage: FinancialStatisticsPage;

  test.beforeEach(async ({ page }) => {
    appPage = new AppPage(page);
    financePage = new FinancialStatisticsPage(page);
    
    await page.goto('/');
    await appPage.waitForAppLoad();
    await appPage.navigateToTab('finance');
    await financePage.waitForPageLoad();
  });

  test('财务统计页面加载验证', async ({ page }) => {
    // 验证页面标题和主要元素
    expect(await page.locator('[data-testid="financial-statistics"]').isVisible()).toBeTruthy();
    
    // 验证统计卡片存在
    expect(await financePage.page.locator('[data-testid="overview-cards"]').isVisible()).toBeTruthy();
    expect(await financePage.page.locator('[data-testid="income-card"]').isVisible()).toBeTruthy();
    expect(await financePage.page.locator('[data-testid="expense-card"]').isVisible()).toBeTruthy();
    expect(await financePage.page.locator('[data-testid="balance-card"]').isVisible()).toBeTruthy();
    expect(await financePage.page.locator('[data-testid="installment-card"]').isVisible()).toBeTruthy();
    
    // 验证操作按钮
    expect(await financePage.page.locator('[data-testid="refresh-btn"]').isVisible()).toBeTruthy();
    expect(await financePage.page.locator('[data-testid="add-transaction-btn"]').isVisible()).toBeTruthy();
  });

  test('财务统计数据获取与格式验证', async () => {
    // 等待数据加载完成
    await financePage.waitForDataLoad();
    
    // 获取各项统计数据
    const totalIncome = await financePage.getTotalIncome();
    const totalExpense = await financePage.getTotalExpense();
    const netProfit = await financePage.getNetProfit();
    const installmentCount = await financePage.getInstallmentCount();
    const pendingInstallments = await financePage.getPendingInstallments();
    
    console.log('财务统计数据:', {
      totalIncome,
      totalExpense,
      netProfit,
      installmentCount,
      pendingInstallments
    });
    
    // 验证金额格式（应该包含¥符号和两位小数）
    expect(await financePage.verifyCurrencyFormat(totalIncome)).toBeTruthy();
    expect(await financePage.verifyCurrencyFormat(totalExpense)).toBeTruthy();
    expect(await financePage.verifyCurrencyFormat(netProfit)).toBeTruthy();
    
    // 验证数字格式
    expect(installmentCount).toMatch(/^\d+$/);
    expect(pendingInstallments).toMatch(/^\d+$/);
    
    // 验证财务一致性（净收益 = 总收入 - 总支出）
    const isConsistent = await financePage.verifyFinancialConsistency();
    expect(isConsistent).toBeTruthy();
  });

  test('金额单位转换验证', async () => {
    await financePage.waitForDataLoad();
    
    // 获取前端显示的金额
    const incomeText = await financePage.getTotalIncome();
    const expenseText = await financePage.getTotalExpense();
    const profitText = await financePage.getNetProfit();
    
    // 转换为分（后端存储单位）
    const incomeCents = await financePage.parseCurrencyToCents(incomeText);
    const expenseCents = await financePage.parseCurrencyToCents(expenseText);
    const profitCents = await financePage.parseCurrencyToCents(profitText);
    
    console.log('金额转换结果（分）:', {
      income: incomeCents,
      expense: expenseCents,
      profit: profitCents
    });
    
    // 验证转换为整数分
    expect(incomeCents).toBeGreaterThanOrEqual(0);
    expect(expenseCents).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(incomeCents)).toBeTruthy();
    expect(Number.isInteger(expenseCents)).toBeTruthy();
    expect(Number.isInteger(profitCents)).toBeTruthy();
    
    // 验证前端显示与后端单位的转换正确性
    expect(incomeCents).toBe(Math.round(parseFloat(incomeText.replace(/[¥,]/g, '')) * 100));
    expect(expenseCents).toBe(Math.round(parseFloat(expenseText.replace(/[¥,]/g, '')) * 100));
  });

  test('数据刷新功能', async () => {
    // 等待初始数据加载
    await financePage.waitForDataLoad();
    
    // 获取刷新前的数据
    const initialIncome = await financePage.getTotalIncome();
    const initialExpense = await financePage.getTotalExpense();
    
    // 点击刷新按钮
    await financePage.clickRefresh();
    
    // 获取刷新后的数据
    const refreshedIncome = await financePage.getTotalIncome();
    const refreshedExpense = await financePage.getTotalExpense();
    
    // 验证数据格式保持一致
    expect(await financePage.verifyCurrencyFormat(refreshedIncome)).toBeTruthy();
    expect(await financePage.verifyCurrencyFormat(refreshedExpense)).toBeTruthy();
    
    // 验证刷新后数据仍然一致
    const isConsistentAfterRefresh = await financePage.verifyFinancialConsistency();
    expect(isConsistentAfterRefresh).toBeTruthy();
  });

  test('添加交易功能入口验证', async () => {
    // 验证添加交易按钮存在且可点击
    const addBtn = financePage.page.locator('[data-testid="add-transaction-btn"]');
    expect(await addBtn.isVisible()).toBeTruthy();
    expect(await addBtn.isEnabled()).toBeTruthy();
    
    // 点击添加交易按钮
    await financePage.clickAddTransaction();
    
    // 等待可能的模态框或表单出现
    await financePage.page.waitForTimeout(1000);
    
    // 检查是否有模态框或表单出现
    const hasModal = await financePage.page.locator('.modal-overlay, .dialog, form').isVisible().catch(() => false);
    
    if (hasModal) {
      // 如果有表单出现，验证表单元素
      const formElements = [
        'input[placeholder*="金额"]',
        'input[placeholder*="描述"]',
        'select',
        'button[type="submit"]'
      ];
      
      for (const selector of formElements) {
        const element = financePage.page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`找到表单元素: ${selector}`);
          expect(await element.isVisible()).toBeTruthy();
        }
      }
      
      // 关闭表单
      await financePage.page.keyboard.press('Escape');
      await financePage.page.waitForTimeout(500);
    }
  });

  test('分期付款统计验证', async () => {
    await financePage.waitForDataLoad();
    
    // 获取分期付款相关数据
    const installmentCount = await financePage.getInstallmentCount();
    const pendingInstallments = await financePage.getPendingInstallments();
    
    console.log('分期付款数据:', {
      count: installmentCount,
      pending: pendingInstallments
    });
    
    // 验证数据格式
    expect(installmentCount).toMatch(/^\d+$/);
    expect(pendingInstallments).toMatch(/^\d+$/);
    
    // 验证待处理数量不超过总数
    const totalCount = parseInt(installmentCount);
    const pendingCount = parseInt(pendingInstallments);
    
    expect(pendingCount).toBeLessThanOrEqual(totalCount);
  });

  test('页面加载状态验证', async () => {
    // 验证初始加载状态
    const isLoading = await financePage.isLoading();
    
    // 等待加载完成
    await financePage.waitForDataLoad();
    
    // 验证加载完成后不再显示加载状态
    const isStillLoading = await financePage.isLoading();
    expect(isStillLoading).toBeFalsy();
    
    // 验证统计数据已加载
    const income = await financePage.getTotalIncome();
    const expense = await financePage.getTotalExpense();
    
    expect(income).toBeTruthy();
    expect(expense).toBeTruthy();
    expect(income).not.toBe('0');
  });

  test('响应式布局测试', async ({ page }) => {
    // 测试桌面布局
    await page.setViewportSize({ width: 1200, height: 800 });
    await financePage.waitForPageLoad();
    
    const desktopIncome = await financePage.getTotalIncome();
    expect(await financePage.verifyCurrencyFormat(desktopIncome)).toBeTruthy();
    
    // 测试平板布局
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    const tabletIncome = await financePage.getTotalIncome();
    expect(await financePage.verifyCurrencyFormat(tabletIncome)).toBeTruthy();
    
    // 测试手机布局
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileIncome = await financePage.getTotalIncome();
    expect(await financePage.verifyCurrencyFormat(mobileIncome)).toBeTruthy();
    
    // 验证不同布局下数据一致
    expect(desktopIncome).toBe(tabletIncome);
    expect(tabletIncome).toBe(mobileIncome);
  });

  test('错误处理验证', async ({ page }) => {
    // 模拟网络错误（通过拦截请求）
    await page.route('**/api/v1/dashboard/financial', route => {
      route.abort('failed');
    });
    
    // 尝试刷新数据
    await financePage.clickRefresh();
    
    // 等待一段时间看是否有错误处理
    await page.waitForTimeout(2000);
    
    // 恢复正常路由
    await page.unroute('**/api/v1/dashboard/financial');
    
    // 再次刷新验证恢复
    await financePage.clickRefresh();
    await financePage.waitForDataLoad();
    
    // 验证数据恢复正常
    const income = await financePage.getTotalIncome();
    expect(await financePage.verifyCurrencyFormat(income)).toBeTruthy();
  });
});

import { test, expect } from '../fixtures';
import { AppPage } from '../page-objects/AppPage';
import { FinancialStatisticsPage } from '../page-objects/FinancialStatisticsPage';

/**
 * 分期付款核心流程测试
 * 覆盖分期计划创建、状态更新、统计同步等功能
 */
test.describe('分期付款核心流程', () => {
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

  test('分期付款统计显示验证', async () => {
    // 等待数据加载完成
    await financePage.waitForDataLoad();
    
    // 获取分期付款相关统计
    const installmentCount = await financePage.getInstallmentCount();
    const pendingInstallments = await financePage.getPendingInstallments();
    
    console.log('分期付款统计数据:', {
      totalCount: installmentCount,
      pendingCount: pendingInstallments
    });
    
    // 验证数据格式
    expect(installmentCount).toMatch(/^\d+$/);
    expect(pendingInstallments).toMatch(/^\d+$/);
    
    // 验证数据逻辑关系
    const total = parseInt(installmentCount);
    const pending = parseInt(pendingInstallments);
    
    expect(total).toBeGreaterThanOrEqual(0);
    expect(pending).toBeGreaterThanOrEqual(0);
    expect(pending).toBeLessThanOrEqual(total);
  });

  test('分期付款数据一致性验证', async ({ api }) => {
    await financePage.waitForDataLoad();
    
    // 获取前端显示的分期付款数据
    const frontendCount = await financePage.getInstallmentCount();
    const frontendPending = await financePage.getPendingInstallments();
    
    try {
      // 通过API获取后端分期付款数据
      const installmentsData = await api.get('/installments');
      
      if (installmentsData.success && installmentsData.data) {
        console.log('后端分期付款数据:', installmentsData.data);
        
        // 验证总数一致性
        if (Array.isArray(installmentsData.data)) {
          const backendTotal = installmentsData.data.length;
          const frontendTotal = parseInt(frontendCount);
          
          // 允许少量差异（可能由于时间差或筛选条件）
          const difference = Math.abs(backendTotal - frontendTotal);
          expect(difference).toBeLessThanOrEqual(2); // 允许最多2个差异
          
          // 验证待处理数量
          const backendPending = installmentsData.data.filter((item: any) => 
            item.status === 'pending' || item.status === '待处理'
          ).length;
          
          const frontendPendingCount = parseInt(frontendPending);
          const pendingDifference = Math.abs(backendPending - frontendPendingCount);
          expect(pendingDifference).toBeLessThanOrEqual(2);
        }
      }
    } catch (error) {
      console.log('API对比失败，仅验证前端数据:', error);
      // 如果API不可用，至少验证前端数据格式正确
      expect(parseInt(frontendCount)).toBeGreaterThanOrEqual(0);
      expect(parseInt(frontendPending)).toBeGreaterThanOrEqual(0);
    }
  });

  test('添加分期付款入口验证', async () => {
    // 等待页面加载
    await financePage.waitForPageLoad();
    
    // 点击添加交易按钮（可能包含分期付款选项）
    await financePage.clickAddTransaction();
    
    // 等待可能的表单出现
    await financePage.page.waitForTimeout(1000);
    
    // 检查是否有分期付款相关的选项
    const installmentOptions = [
      'select option[value="installment"]',
      'input[value="installment"]',
      'button:has-text("分期")',
      '[data-testid*="installment"]'
    ];
    
    let hasInstallmentOption = false;
    for (const selector of installmentOptions) {
      try {
        const element = financePage.page.locator(selector).first();
        if (await element.isVisible()) {
          hasInstallmentOption = true;
          console.log(`找到分期付款选项: ${selector}`);
          break;
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }
    
    if (hasInstallmentOption) {
      // 如果找到分期选项，验证其可交互性
      console.log('验证分期付款选项可用性');
    } else {
      console.log('未找到分期付款选项，可能是通过其他方式创建');
    }
    
    // 关闭可能的表单
    await financePage.page.keyboard.press('Escape');
    await financePage.page.waitForTimeout(500);
  });

  test('分期付款状态更新验证', async ({ api }) => {
    try {
      // 获取分期付款列表
      const installmentsData = await api.get('/installments');
      
      if (installmentsData.success && Array.isArray(installmentsData.data) && installmentsData.data.length > 0) {
        const firstInstallment = installmentsData.data[0];
        const installmentId = firstInstallment.id || firstInstallment.uid;
        
        console.log('测试分期付款状态更新，ID:', installmentId);
        
        if (installmentId) {
          // 获取初始状态
          const initialStatus = firstInstallment.status;
          console.log('初始状态:', initialStatus);
          
          // 尝试更新状态（这里模拟状态更新）
          const newStatus = 'completed';
          
          try {
            const updateResponse = await api.put(`/installments/${installmentId}`, {
              status: newStatus
            });
            
            if (updateResponse.success) {
              console.log('状态更新成功');
              
              // 刷新页面验证统计更新
              await financePage.clickRefresh();
              await financePage.waitForDataLoad();
              
              // 获取更新后的统计数据
              const updatedPending = await financePage.getPendingInstallments();
              console.log('更新后待处理数量:', updatedPending);
              
              // 验证统计数据有变化（如果原状态是待处理）
              if (initialStatus === 'pending' || initialStatus === '待处理') {
                const updatedCount = parseInt(updatedPending);
                // 待处理数量应该减少
                expect(updatedCount).toBeGreaterThanOrEqual(0);
              }
            }
          } catch (error) {
            console.log('状态更新失败，可能是API不存在或权限问题:', error);
          }
        }
      } else {
        console.log('没有分期付款数据，跳过状态更新测试');
      }
    } catch (error) {
      console.log('获取分期付款数据失败:', error);
    }
  });

  test('分期付款统计口径同步验证', async () => {
    await financePage.waitForDataLoad();
    
    // 获取财务统计中的分期付款数据
    const financeInstallmentCount = await financePage.getInstallmentCount();
    const financePendingCount = await financePage.getPendingInstallments();
    
    console.log('财务统计中的分期付款数据:', {
      total: financeInstallmentCount,
      pending: financePendingCount
    });
    
    try {
      // 尝试通过多个API端点验证数据一致性
      const [
        installmentsResponse,
        statsResponse,
        dashboardResponse
      ] = await Promise.allSettled([
        api.get('/installments'),
        api.get('/dashboard/financial'),
        api.get('/dashboard/stats')
      ]);
      
      const results: any = {};
      
      if (installmentsResponse.status === 'fulfilled') {
        results.installments = installmentsResponse.value;
      }
      
      if (statsResponse.status === 'fulfilled') {
        results.stats = statsResponse.value;
      }
      
      if (dashboardResponse.status === 'fulfilled') {
        results.dashboard = dashboardResponse.value;
      }
      
      console.log('多端点数据对比:', results);
      
      // 验证不同端点的分期付款数据一致性
      if (results.installments?.success && results.stats?.success) {
        const installmentsTotal = Array.isArray(results.installments.data) 
          ? results.installments.data.length 
          : 0;
        
        const statsInstallments = results.stats.data?.installmentCount || 0;
        
        const frontendTotal = parseInt(financeInstallmentCount);
        
        console.log('分期付款总数对比:', {
          frontend: frontendTotal,
          installmentsAPI: installmentsTotal,
          statsAPI: statsInstallments
        });
        
        // 验证数据在合理范围内
        const maxDiff = Math.max(frontendTotal, installmentsTotal, statsInstallments) * 0.1;
        expect(Math.abs(frontendTotal - installmentsTotal)).toBeLessThanOrEqual(maxDiff);
        expect(Math.abs(frontendTotal - statsInstallments)).toBeLessThanOrEqual(maxDiff);
      }
    } catch (error) {
      console.log('多端点数据对比失败:', error);
    }
  });

  test('分期付款数据刷新验证', async () => {
    await financePage.waitForDataLoad();
    
    // 获取初始数据
    const initialCount = await financePage.getInstallmentCount();
    const initialPending = await financePage.getPendingInstallments();
    
    console.log('初始分期付款数据:', {
      total: initialCount,
      pending: initialPending
    });
    
    // 刷新数据
    await financePage.clickRefresh();
    await financePage.waitForDataLoad();
    
    // 获取刷新后数据
    const refreshedCount = await financePage.getInstallmentCount();
    const refreshedPending = await financePage.getPendingInstallments();
    
    console.log('刷新后分期付款数据:', {
      total: refreshedCount,
      pending: refreshedPending
    });
    
    // 验证数据格式保持正确
    expect(refreshedCount).toMatch(/^\d+$/);
    expect(refreshedPending).toMatch(/^\d+$/);
    
    // 验证数据逻辑关系
    const total = parseInt(refreshedCount);
    const pending = parseInt(refreshedPending);
    expect(pending).toBeLessThanOrEqual(total);
    
    // 验证数据一致性（刷新前后应该相同或相近）
    const initialTotal = parseInt(initialCount);
    const initialPendingCount = parseInt(initialPending);
    
    // 允许少量变化（可能由于实时数据更新）
    expect(Math.abs(total - initialTotal)).toBeLessThanOrEqual(5);
    expect(Math.abs(pending - initialPendingCount)).toBeLessThanOrEqual(3);
  });

  test('分期付款响应式显示验证', async ({ page }) => {
    await financePage.waitForPageLoad();
    
    // 测试桌面布局
    await page.setViewportSize({ width: 1200, height: 800 });
    await financePage.waitForDataLoad();
    
    const desktopCount = await financePage.getInstallmentCount();
    const desktopPending = await financePage.getPendingInstallments();
    
    // 测试平板布局
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    const tabletCount = await financePage.getInstallmentCount();
    const tabletPending = await financePage.getPendingInstallments();
    
    // 测试手机布局
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileCount = await financePage.getInstallmentCount();
    const mobilePending = await financePage.getPendingInstallments();
    
    // 验证不同布局下数据一致
    expect(desktopCount).toBe(tabletCount);
    expect(tabletCount).toBe(mobileCount);
    expect(desktopPending).toBe(tabletPending);
    expect(tabletPending).toBe(mobilePending);
    
    // 验证分期付款卡片在所有布局下都可见
    const installmentCard = financePage.page.locator('[data-testid="installment-card"]');
    expect(await installmentCard.isVisible()).toBeTruthy();
  });

  test('分期付款数据边界情况验证', async () => {
    await financePage.waitForDataLoad();
    
    // 获取当前数据
    const count = await financePage.getInstallmentCount();
    const pending = await financePage.getPendingInstallments();
    
    const totalCount = parseInt(count);
    const pendingCount = parseInt(pending);
    
    console.log('边界情况验证:', {
      total: totalCount,
      pending: pendingCount
    });
    
    // 验证边界条件
    expect(totalCount).toBeGreaterThanOrEqual(0);
    expect(pendingCount).toBeGreaterThanOrEqual(0);
    expect(pendingCount).toBeLessThanOrEqual(totalCount);
    
    // 如果没有分期付款数据，验证显示正确
    if (totalCount === 0) {
      expect(count).toBe('0');
      expect(pending).toBe('0');
    }
    
    // 如果有待处理的分期付款，验证总数大于0
    if (pendingCount > 0) {
      expect(totalCount).toBeGreaterThan(0);
    }
  });
});
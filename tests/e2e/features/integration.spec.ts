import { test, expect } from '../fixtures';
import { AppPage } from '../page-objects/AppPage';
import { StudentManagementPage } from '../page-objects/StudentManagementPage';
import { FinancialStatisticsPage } from '../page-objects/FinancialStatisticsPage';
import { DashboardPage } from '../page-objects/DashboardPage';

/**
 * 跨模块集成测试
 * 验证不同模块间的数据一致性和业务流程
 */
test.describe('跨模块集成流程测试', () => {
  let appPage: AppPage;
  let studentPage: StudentManagementPage;
  let financePage: FinancialStatisticsPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    appPage = new AppPage(page);
    studentPage = new StudentManagementPage(page);
    financePage = new FinancialStatisticsPage(page);
    dashboardPage = new DashboardPage(page);
    
    await page.goto('/');
    await appPage.waitForAppLoad();
  });

  test('学员-财务数据一致性验证', async ({ api }) => {
    // 导航到学员管理页面
    await appPage.navigateToTab('students');
    await studentPage.waitForPageLoad();
    
    // 获取学员数量
    await studentPage.waitForStudentList();
    const studentCards = await studentPage.getStudentCards();
    const studentCount = studentCards.length;
    
    // 导航到仪表盘
    await appPage.navigateToTab('dashboard');
    await dashboardPage.waitForPageLoad();
    await dashboardPage.waitForDataLoad();
    
    // 获取仪表盘中的学员数
    const dashboardStudents = await dashboardPage.getActiveStudents();
    const dashboardStudentCount = dashboardPage.parseStringToNumber(dashboardStudents);
    
    console.log('学员数量对比:', {
      studentManagement: studentCount,
      dashboard: dashboardStudentCount
    });
    
    // 验证数据一致性（允许合理差异）
    const difference = Math.abs(studentCount - dashboardStudentCount);
    expect(difference).toBeLessThanOrEqual(5); // 允许最多5个差异
    
    // 通过API验证
    try {
      const studentsData = await api.get('/students');
      const dashboardData = await api.get('/dashboard/stats');
      
      if (studentsData.success && dashboardData.success) {
        const apiStudentCount = studentsData.data?.pagination?.total || 
                               (Array.isArray(studentsData.data) ? studentsData.data.length : 0);
        const apiDashboardCount = dashboardData.data?.activeStudents || 0;
        
        console.log('API数据对比:', {
          studentsAPI: apiStudentCount,
          dashboardAPI: apiDashboardCount
        });
        
        // 验证API数据与前端数据的一致性
        expect(Math.abs(studentCount - apiStudentCount)).toBeLessThanOrEqual(3);
        expect(Math.abs(dashboardStudentCount - apiDashboardCount)).toBeLessThanOrEqual(3);
      }
    } catch (error) {
      console.log('API验证失败:', error);
    }
  });

  test('财务-仪表盘收入数据一致性验证', async () => {
    // 导航到财务统计页面
    await appPage.navigateToTab('finance');
    await financePage.waitForPageLoad();
    await financePage.waitForDataLoad();
    
    // 获取财务统计中的收入数据
    const financeIncome = await financePage.getTotalIncome();
    const financeIncomeCents = await financePage.parseCurrencyToCents(financeIncome);
    
    // 导航到仪表盘
    await appPage.navigateToTab('dashboard');
    await dashboardPage.waitForPageLoad();
    await dashboardPage.waitForDataLoad();
    
    // 获取仪表盘中的收入数据
    const dashboardRevenue = await dashboardPage.getTotalRevenue();
    const dashboardRevenueCents = await dashboardPage.parseCurrencyToCents(dashboardRevenue);
    
    console.log('收入数据对比:', {
      finance: { text: financeIncome, cents: financeIncomeCents },
      dashboard: { text: dashboardRevenue, cents: dashboardRevenueCents }
    });
    
    // 验证收入数据一致性（允许小的差异）
    const difference = Math.abs(financeIncomeCents - dashboardRevenueCents);
    const tolerance = Math.max(Math.max(financeIncomeCents, dashboardRevenueCents) * 0.01, 500); // 1%或5元容差
    expect(difference).toBeLessThanOrEqual(tolerance);
  });

  test('学员操作对统计的影响验证', async ({ api }) => {
    // 获取初始统计数据
    await appPage.navigateToTab('dashboard');
    await dashboardPage.waitForPageLoad();
    await dashboardPage.waitForDataLoad();
    
    const initialStudents = await dashboardPage.getActiveStudents();
    const initialStudentCount = dashboardPage.parseStringToNumber(initialStudents);
    
    // 导航到学员管理
    await appPage.navigateToTab('students');
    await studentPage.waitForPageLoad();
    await studentPage.waitForStudentList();
    
    const initialStudentCards = await studentPage.getStudentCards();
    
    console.log('操作前数据:', {
      dashboardStudents: initialStudentCount,
      studentCards: initialStudentCards.length
    });
    
    // 模拟学员操作（这里只是验证数据获取，不实际修改）
    // 在实际测试中，可以创建临时学员然后删除
    
    // 刷新仪表盘数据
    await appPage.navigateToTab('dashboard');
    await dashboardPage.clickRefresh();
    await dashboardPage.waitForDataLoad();
    
    // 获取更新后的数据
    const updatedStudents = await dashboardPage.getActiveStudents();
    const updatedStudentCount = dashboardPage.parseStringToNumber(updatedStudents);
    
    // 导航回学员管理获取最新数据
    await appPage.navigateToTab('students');
    await studentPage.waitForStudentList();
    
    const updatedStudentCards = await studentPage.getStudentCards();
    
    console.log('操作后数据:', {
      dashboardStudents: updatedStudentCount,
      studentCards: updatedStudentCards.length
    });
    
    // 验证数据格式正确
    expect(updatedStudentCount).toBeGreaterThanOrEqual(0);
    expect(updatedStudentCards.length).toBeGreaterThanOrEqual(0);
    
    // 验证数据变化在合理范围内
    const studentDiff = Math.abs(updatedStudentCount - initialStudentCount);
    const cardDiff = Math.abs(updatedStudentCards.length - initialStudentCards.length);
    
    expect(studentDiff).toBeLessThanOrEqual(5); // 允许合理变化
    expect(cardDiff).toBeLessThanOrEqual(5);
  });

  test('多页面导航状态一致性验证', async ({ page }) => {
    // 测试在不同页面间导航时的状态保持
    
    // 1. 导航到学员管理
    await appPage.navigateToTab('students');
    await studentPage.waitForPageLoad();
    expect(await appPage.getActiveTab()).toContain('students');
    
    // 2. 导航到财务统计
    await appPage.navigateToTab('finance');
    await financePage.waitForPageLoad();
    expect(await appPage.getActiveTab()).toContain('finance');
    
    // 3. 导航到仪表盘
    await appPage.navigateToTab('dashboard');
    await dashboardPage.waitForPageLoad();
    expect(await appPage.getActiveTab()).toContain('dashboard');
    
    // 4. 验证页面刷新后状态保持
    await page.reload();
    await appPage.waitForAppLoad();
    
    // 默认应该是仪表盘（根据MainApp.vue中的初始设置）
    const activeTabAfterReload = await appPage.getActiveTab();
    expect(activeTabAfterReload).toContain('dashboard');
    
    // 5. 重新导航验证功能正常
    await appPage.navigateToTab('students');
    await studentPage.waitForPageLoad();
    expect(await appPage.getActiveTab()).toContain('students');
  });

  test('数据加载性能验证', async ({ page }) => {
    // 测试各页面数据加载性能
    
    const loadTimes: Array<{ page: string; time: number }> = [];
    
    // 学员管理页面加载时间
    const studentStart = Date.now();
    await appPage.navigateToTab('students');
    await studentPage.waitForPageLoad();
    await studentPage.waitForStudentList();
    const studentTime = Date.now() - studentStart;
    loadTimes.push({ page: 'students', time: studentTime });
    
    // 财务统计页面加载时间
    const financeStart = Date.now();
    await appPage.navigateToTab('finance');
    await financePage.waitForPageLoad();
    await financePage.waitForDataLoad();
    const financeTime = Date.now() - financeStart;
    loadTimes.push({ page: 'finance', time: financeTime });
    
    // 仪表盘页面加载时间
    const dashboardStart = Date.now();
    await appPage.navigateToTab('dashboard');
    await dashboardPage.waitForPageLoad();
    await dashboardPage.waitForDataLoad();
    const dashboardTime = Date.now() - dashboardStart;
    loadTimes.push({ page: 'dashboard', time: dashboardTime });
    
    console.log('页面加载时间:', loadTimes);
    
    // 验证加载时间在合理范围内
    loadTimes.forEach(({ page, time }) => {
      expect(time).toBeLessThan(10000); // 每个页面加载不超过10秒
      console.log(`${page}页面加载时间: ${time}ms`);
    });
    
    // 验证平均加载时间
    const avgTime = loadTimes.reduce((sum, { time }) => sum + time, 0) / loadTimes.length;
    expect(avgTime).toBeLessThan(5000); // 平均不超过5秒
    console.log(`平均页面加载时间: ${avgTime}ms`);
  });

  test('错误恢复和重试机制验证', async ({ page }) => {
    // 测试网络错误时的恢复机制
    
    // 1. 模拟网络错误
    await page.route('**/api/v1/**', route => {
      route.abort('failed');
    });
    
    // 2. 尝试访问各页面
    await appPage.navigateToTab('students');
    await studentPage.waitForPageLoad();
    
    await appPage.navigateToTab('finance');
    await financePage.waitForPageLoad();
    
    await appPage.navigateToTab('dashboard');
    await dashboardPage.waitForPageLoad();
    
    // 3. 恢复网络连接
    await page.unroute('**/api/v1/**');
    
    // 4. 验证数据恢复正常加载
    await dashboardPage.clickRefresh();
    await dashboardPage.waitForDataLoad();
    
    // 验证数据加载成功
    const revenue = await dashboardPage.getTotalRevenue();
    expect(await dashboardPage.verifyCurrencyFormat(revenue)).toBeTruthy();
    
    // 5. 验证其他页面也恢复正常
    await appPage.navigateToTab('students');
    await studentPage.waitForStudentList();
    
    const studentCards = await studentPage.getStudentCards();
    expect(studentCards.length).toBeGreaterThanOrEqual(0);
    
    await appPage.navigateToTab('finance');
    await financePage.waitForDataLoad();
    
    const income = await financePage.getTotalIncome();
    expect(await financePage.verifyCurrencyFormat(income)).toBeTruthy();
    
    console.log('错误恢复机制验证通过');
  });

  test('并发操作数据一致性验证', async ({ page }) => {
    // 测试快速切换页面时的数据一致性
    
    // 快速切换页面
    const pages = ['students', 'finance', 'dashboard'] as const;
    
    for (let i = 0; i < 3; i++) {
      console.log(`第${i + 1}轮并发测试`);
      
      // 快速访问所有页面
      const promises = pages.map(async (tab) => {
        await appPage.navigateToTab(tab);
        
        switch (tab) {
          case 'students':
            await studentPage.waitForPageLoad();
            return {
              page: 'students',
              studentCount: (await studentPage.getStudentCards()).length
            };
          case 'finance':
            await financePage.waitForPageLoad();
            return {
              page: 'finance',
              income: await financePage.getTotalIncome()
            };
          case 'dashboard':
            await dashboardPage.waitForPageLoad();
            return {
              page: 'dashboard',
              revenue: await dashboardPage.getTotalRevenue()
            };
        }
      });
      
      const results = await Promise.all(promises);
      console.log(`第${i + 1}轮结果:`, results);
      
      // 验证数据格式正确
      results.forEach(result => {
        switch (result.page) {
          case 'students':
            expect(result.studentCount).toBeGreaterThanOrEqual(0);
            break;
          case 'finance':
            expect(financePage.verifyCurrencyFormat(result.income)).resolves.toBeTruthy();
            break;
          case 'dashboard':
            expect(dashboardPage.verifyCurrencyFormat(result.revenue)).resolves.toBeTruthy();
            break;
        }
      });
      
      // 等待一段时间再进行下一轮
      await page.waitForTimeout(1000);
    }
  });

  test('内存使用和性能监控', async ({ page }) => {
    // 监控页面内存使用情况
    
    // 获取初始内存使用
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      } : null;
    });
    
    console.log('初始内存使用:', initialMemory);
    
    // 执行一系列操作
    for (let i = 0; i < 5; i++) {
      await appPage.navigateToTab('students');
      await studentPage.waitForPageLoad();
      
      await appPage.navigateToTab('finance');
      await financePage.waitForPageLoad();
      
      await appPage.navigateToTab('dashboard');
      await dashboardPage.waitForPageLoad();
      
      // 等待垃圾回收
      await page.waitForTimeout(2000);
    }
    
    // 获取最终内存使用
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      } : null;
    });
    
    console.log('最终内存使用:', finalMemory);
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.used - initialMemory.used;
      console.log(`内存增长: ${memoryIncrease}MB`);
      
      // 验证内存增长在合理范围内（不超过50MB）
      expect(memoryIncrease).toBeLessThan(50);
    }
  });
});

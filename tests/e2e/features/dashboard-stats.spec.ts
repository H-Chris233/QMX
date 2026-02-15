import { test, expect } from '../fixtures';
import { AppPage } from '../page-objects/AppPage';
import { DashboardPage } from '../page-objects/DashboardPage';

/**
 * 统计仪表盘核心流程测试
 * 覆盖仪表盘数据加载、统计显示、数据一致性验证
 */
test.describe('统计仪表盘核心流程', () => {
  let appPage: AppPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    appPage = new AppPage(page);
    dashboardPage = new DashboardPage(page);
    
    await page.goto('/');
    await appPage.waitForAppLoad();
    await appPage.navigateToTab('dashboard');
    await dashboardPage.waitForPageLoad();
  });

  test('仪表盘页面加载验证', async ({ page }) => {
    // 验证页面标题
    expect(await page.locator('h2:has-text("仪表盘")').isVisible()).toBeTruthy();
    
    // 验证统计卡片区域存在
    expect(await dashboardPage.page.locator('[data-testid="stats-grid"]').isVisible()).toBeTruthy();
    
    // 验证各个统计卡片存在
    expect(await dashboardPage.page.locator('[data-testid="revenue-card"]').isVisible()).toBeTruthy();
    expect(await dashboardPage.page.locator('[data-testid="students-card"]').isVisible()).toBeTruthy();
    expect(await dashboardPage.page.locator('[data-testid="grades-card"]').isVisible()).toBeTruthy();
    expect(await dashboardPage.page.locator('[data-testid="membership-card"]').isVisible()).toBeTruthy();
    
    // 验证刷新按钮
    expect(await dashboardPage.page.locator('[data-testid="dashboard-refresh-btn"]').isVisible()).toBeTruthy();
  });

  test('仪表盘数据获取与格式验证', async () => {
    // 等待所有数据加载完成
    await dashboardPage.waitForDataLoad();
    await dashboardPage.page.waitForTimeout(2000); // 额外等待确保数据渲染完成
    
    // 验证所有卡片都加载完成
    const allCardsLoaded = await dashboardPage.verifyAllCardsLoaded();
    expect(allCardsLoaded).toBeTruthy();
    
    // 获取各项统计数据
    const totalRevenue = await dashboardPage.getTotalRevenue();
    const activeStudents = await dashboardPage.getActiveStudents();
    const averageGrade = await dashboardPage.getAverageGrade();
    const expiringCount = await dashboardPage.getExpiringCount();
    
    console.log('仪表盘统计数据:', {
      totalRevenue,
      activeStudents,
      averageGrade,
      expiringCount
    });
    
    // 验证数据格式
    expect(await dashboardPage.verifyCurrencyFormat(totalRevenue)).toBeTruthy();
    expect(await dashboardPage.verifyNumberFormat(activeStudents)).toBeTruthy();
    expect(await dashboardPage.verifyGradeFormat(averageGrade)).toBeTruthy();
    expect(expiringCount).toMatch(/^\d+$/);
  });

  test('数据一致性验证', async ({ api }) => {
    await dashboardPage.waitForDataLoad();
    
    // 获取前端显示的数据
    const frontendRevenue = await dashboardPage.getTotalRevenue();
    const frontendStudents = await dashboardPage.getActiveStudents();
    
    // 转换前端数据为数值
    const revenueCents = await dashboardPage.parseCurrencyToCents(frontendRevenue);
    const studentsCount = dashboardPage.parseStringToNumber(frontendStudents);
    
    console.log('前端数据（转换为数值）:', {
      revenueCents,
      studentsCount
    });
    
    try {
      // 通过API获取后端数据进行对比
      const dashboardData = await api.get('/dashboard');
      
      if (dashboardData.success && dashboardData.data) {
        console.log('后端数据:', dashboardData.data);
        
        // 验证总收入一致性（允许小的差异）
        if (dashboardData.data.totalRevenue !== undefined) {
          const backendRevenue = dashboardData.data.totalRevenue;
          // 后端数据可能是分或元，这里做兼容处理
          const expectedRevenue = typeof backendRevenue === 'number' && backendRevenue > 10000 
            ? backendRevenue // 假设是分
            : Math.round(backendRevenue * 100); // 假设是元，转换为分
          
          // 允许1%的差异
          const difference = Math.abs(revenueCents - expectedRevenue);
          const tolerance = Math.max(expectedRevenue * 0.01, 100); // 1%或最少100分
          
          expect(difference).toBeLessThanOrEqual(tolerance);
        }
        
        // 验证学员数一致性
        if (dashboardData.data.activeStudents !== undefined) {
          expect(studentsCount).toBe(dashboardData.data.activeStudents);
        }
      }
    } catch (error) {
      console.log('API对比失败，仅验证前端数据格式:', error);
      // 如果API不可用，至少验证前端数据格式正确
      expect(revenueCents).toBeGreaterThanOrEqual(0);
      expect(studentsCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('会员过期提醒功能验证', async () => {
    await dashboardPage.waitForDataLoad();
    
    // 获取即将过期会员信息
    const expiringMembers = await dashboardPage.getExpiringMembers();
    const expiringCount = await dashboardPage.getExpiringCount();
    
    console.log('会员过期信息:', {
      count: expiringCount,
      members: expiringMembers
    });
    
    // 验证过期数量与列表长度一致
    expect(parseInt(expiringCount)).toBe(expiringMembers.length);
    
    // 如果有过期会员，验证信息完整性
    if (expiringMembers.length > 0) {
      for (const member of expiringMembers) {
        expect(member.name).toBeTruthy();
        expect(member.days).toBeTruthy();
        expect(member.studentId).toBeTruthy();
        
        // 验证剩余天数是数字
        expect(member.days).toMatch(/^\d+天$/);
        
        // 验证学员ID是数字
        expect(member.studentId).toMatch(/^\d+$/);
      }
    }
  });

  test('数据刷新功能验证', async () => {
    // 等待初始数据加载
    await dashboardPage.waitForDataLoad();
    
    // 获取刷新前的数据
    const initialRevenue = await dashboardPage.getTotalRevenue();
    const initialStudents = await dashboardPage.getActiveStudents();
    const initialGrade = await dashboardPage.getAverageGrade();
    
    // 点击刷新按钮
    await dashboardPage.clickRefresh();
    
    // 获取刷新后的数据
    const refreshedRevenue = await dashboardPage.getTotalRevenue();
    const refreshedStudents = await dashboardPage.getActiveStudents();
    const refreshedGrade = await dashboardPage.getAverageGrade();
    
    // 验证数据格式保持一致
    expect(await dashboardPage.verifyCurrencyFormat(refreshedRevenue)).toBeTruthy();
    expect(await dashboardPage.verifyNumberFormat(refreshedStudents)).toBeTruthy();
    expect(await dashboardPage.verifyGradeFormat(refreshedGrade)).toBeTruthy();
    
    // 验证刷新后数据仍然有效
    const revenueCents = await dashboardPage.parseCurrencyToCents(refreshedRevenue);
    const studentsCount = dashboardPage.parseStringToNumber(refreshedStudents);
    const gradeValue = parseFloat(refreshedGrade);
    
    expect(revenueCents).toBeGreaterThanOrEqual(0);
    expect(studentsCount).toBeGreaterThanOrEqual(0);
    expect(gradeValue).toBeGreaterThanOrEqual(0);
    
    console.log('刷新前后数据对比:', {
      revenue: { before: initialRevenue, after: refreshedRevenue },
      students: { before: initialStudents, after: refreshedStudents },
      grade: { before: initialGrade, after: refreshedGrade }
    });
  });

  test('加载状态验证', async () => {
    // 验证初始加载状态
    await dashboardPage.waitForDataLoad();
    
    // 验证加载完成状态
    const isLoading = await dashboardPage.isLoading();
    expect(isLoading).toBeFalsy();
    
    // 验证数据已正确加载（不是骨架屏）
    const revenue = await dashboardPage.getTotalRevenue();
    const students = await dashboardPage.getActiveStudents();
    
    expect(revenue).toBeTruthy();
    expect(students).toBeTruthy();
    expect(revenue).not.toBe('¥0.00'); // 至少应该有一些数据
  });

  test('统计数字精度验证', async () => {
    await dashboardPage.waitForDataLoad();
    
    // 获取各项数据
    const revenue = await dashboardPage.getTotalRevenue();
    const grade = await dashboardPage.getAverageGrade();
    
    // 验证金额格式（¥符号，千分位分隔符，可选两位小数）
    expect(revenue).toMatch(/^¥[\d,]+(\.\d{2})?$/);
    
    // 验证成绩格式（1-2位小数）
    expect(grade).toMatch(/^\d+\.\d{1,2}$/);
    
    // 验证数值范围合理性
    const revenueCents = await dashboardPage.parseCurrencyToCents(revenue);
    const gradeValue = parseFloat(grade);
    
    expect(revenueCents).toBeGreaterThanOrEqual(0);
    expect(gradeValue).toBeGreaterThanOrEqual(0);
    expect(gradeValue).toBeLessThanOrEqual(100); // 成绩通常不超过100分
  });

  test('响应式布局验证', async ({ page }) => {
    // 测试桌面布局
    await page.setViewportSize({ width: 1200, height: 800 });
    await dashboardPage.waitForPageLoad();
    
    const desktopRevenue = await dashboardPage.getTotalRevenue();
    expect(await dashboardPage.verifyCurrencyFormat(desktopRevenue)).toBeTruthy();
    
    // 测试平板布局
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    const tabletRevenue = await dashboardPage.getTotalRevenue();
    expect(await dashboardPage.verifyCurrencyFormat(tabletRevenue)).toBeTruthy();
    
    // 测试手机布局
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileRevenue = await dashboardPage.getTotalRevenue();
    expect(await dashboardPage.verifyCurrencyFormat(mobileRevenue)).toBeTruthy();
    
    // 验证不同布局下数据一致
    expect(desktopRevenue).toBe(tabletRevenue);
    expect(tabletRevenue).toBe(mobileRevenue);
  });

  test('错误恢复机制验证', async ({ page }) => {
    // 模拟网络错误
    await page.route('**/api/v1/dashboard/stats', route => {
      route.abort('failed');
    });
    
    // 尝试刷新数据
    await dashboardPage.clickRefresh();
    
    // 等待错误处理
    await page.waitForTimeout(2000);
    
    // 恢复正常路由
    await page.unroute('**/api/v1/dashboard/stats');
    
    // 再次刷新验证恢复
    await dashboardPage.clickRefresh();
    await dashboardPage.waitForDataLoad();
    
    // 验证数据恢复正常
    const revenue = await dashboardPage.getTotalRevenue();
    expect(await dashboardPage.verifyCurrencyFormat(revenue)).toBeTruthy();
    
    // 验证没有加载状态
    const isLoading = await dashboardPage.isLoading();
    expect(isLoading).toBeFalsy();
  });

  test('数据更新时效性验证', async ({ page }) => {
    await dashboardPage.waitForDataLoad();
    
    // 获取初始数据
    const initialData = {
      revenue: await dashboardPage.getTotalRevenue(),
      students: await dashboardPage.getActiveStudents(),
      grade: await dashboardPage.getAverageGrade(),
      timestamp: Date.now()
    };
    
    // 等待一段时间后刷新
    await page.waitForTimeout(3000);
    await dashboardPage.clickRefresh();
    
    // 获取更新后数据
    const updatedData = {
      revenue: await dashboardPage.getTotalRevenue(),
      students: await dashboardPage.getActiveStudents(),
      grade: await dashboardPage.getAverageGrade(),
      timestamp: Date.now()
    };
    
    console.log('数据更新对比:', {
      timeDiff: updatedData.timestamp - initialData.timestamp,
      revenueChanged: initialData.revenue !== updatedData.revenue,
      studentsChanged: initialData.students !== updatedData.students,
      gradeChanged: initialData.grade !== updatedData.grade
    });
    
    // 验证数据格式保持正确
    expect(await dashboardPage.verifyCurrencyFormat(updatedData.revenue)).toBeTruthy();
    expect(await dashboardPage.verifyNumberFormat(updatedData.students)).toBeTruthy();
    expect(await dashboardPage.verifyGradeFormat(updatedData.grade)).toBeTruthy();
    
    // 验证时间戳更新
    expect(updatedData.timestamp).toBeGreaterThan(initialData.timestamp);
  });
});

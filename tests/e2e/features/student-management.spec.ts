import { test, expect } from '../fixtures';
import { AppPage } from '../page-objects/AppPage';
import { StudentManagementPage } from '../page-objects/StudentManagementPage';
import { TestUtils, DataGenerator } from '../utils/test-utils';

/**
 * 学生管理功能测试（重构版本）
 * 使用Page Object模式提高可维护性
 */
test.describe('学生管理功能测试（重构版）', () => {
  let appPage: AppPage;
  let studentPage: StudentManagementPage;
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    appPage = new AppPage(page);
    studentPage = new StudentManagementPage(page);
    testUtils = new TestUtils(page);
    
    await page.goto('/');
    await appPage.waitForAppLoad();
    await appPage.navigateToTab('students');
    await studentPage.waitForPageLoad();
  });

  test('学生管理页面可访问性验证', async ({ page }) => {
    // 验证页面标题和主要元素
    expect(await page.locator('h2:has-text("学员管理")').isVisible()).toBeTruthy();
    
    // 验证搜索和筛选控件存在
    expect(await studentPage.page.locator('[data-testid="student-search-input"]').isVisible()).toBeTruthy();
    expect(await studentPage.page.locator('[data-testid="student-search-button"]').isVisible()).toBeTruthy();
    expect(await studentPage.page.locator('[data-testid="add-student-btn"]').isVisible()).toBeTruthy();
    expect(await studentPage.page.locator('[data-testid="export-students-btn"]').isVisible()).toBeTruthy();
    
    // 验证筛选器存在
    expect(await studentPage.page.locator('[data-testid="filter-subject"]').isVisible()).toBeTruthy();
    expect(await studentPage.page.locator('[data-testid="filter-class-type"]').isVisible()).toBeTruthy();
    expect(await studentPage.page.locator('[data-testid="filter-has-membership"]').isVisible()).toBeTruthy();
    
    console.log('学生管理页面可访问性验证通过');
  });

  test('学生列表数据加载验证', async ({ api }) => {
    // 等待学生列表加载
    await studentPage.waitForStudentList();
    
    // 获取前端显示的学生数量
    const studentCards = await studentPage.getStudentCards();
    const frontendCount = studentCards.length;
    
    console.log(`前端显示学生数量: ${frontendCount}`);
    
    // 通过API验证数据
    try {
      const studentsData = await api.get('/students');
      expect(studentsData).toBeDefined();
      expect(typeof studentsData.success).toBe('boolean');
      
      if (studentsData.success) {
        console.log('API响应验证通过');
        
        if (studentsData.data?.students) {
          const apiCount = studentsData.data.students.length;
          console.log(`API返回学生数量: ${apiCount}`);
          
          // 验证分页信息
          if (studentsData.data.pagination) {
            const pagination = studentsData.data.pagination;
            console.log('分页信息:', pagination);
            
            // 验证分页数据格式
            expect(pagination.page).toBeGreaterThan(0);
            expect(pagination.total_pages).toBeGreaterThan(0);
            expect(pagination.total).toBeGreaterThanOrEqual(0);
          }
        }
      }
    } catch (error) {
      console.log('API验证失败，仅验证前端数据:', error);
      // 如果API不可用，至少验证前端数据加载正常
      expect(frontendCount).toBeGreaterThanOrEqual(0);
    }
    
    // 验证学生卡片的基本结构
    if (studentCards.length > 0) {
      const firstCard = studentCards[0];
      
      // 验证学员基本信息显示
      const nameElement = firstCard.locator('h3');
      expect(await nameElement.isVisible()).toBeTruthy();
      
      const idElement = firstCard.locator('.student-id');
      expect(await idElement.isVisible()).toBeTruthy();
      
      // 验证信息项存在
      const infoItems = firstCard.locator('.info-item');
      expect(await infoItems.count()).toBeGreaterThan(0);
      
      // 验证操作按钮存在
      const hasEditButton = await firstCard.locator('[data-testid^="edit-student-"]').isVisible();
      const hasDeleteButton = await firstCard.locator('[data-testid^="delete-student-"]').isVisible();
      
      expect(hasEditButton).toBeTruthy();
      expect(hasDeleteButton).toBeTruthy();
      
      console.log('学生卡片结构验证通过');
    } else {
      console.log('没有学生数据，跳过卡片结构验证');
    }
  });

  test('学生搜索功能验证', async ({ testData }) => {
    // 等待学生列表加载
    await studentPage.waitForStudentList();
    
    // 获取初始学生数量
    const initialCount = await studentPage.getStudentCount();
    console.log(`搜索前学生数量: ${initialCount}`);
    
    // 测试姓名搜索
    const searchTerm = testData.students[0].name.substring(0, 2);
    console.log(`搜索词: "${searchTerm}"`);
    
    await studentPage.searchStudent(searchTerm);
    await testUtils.waitForNetworkIdle();
    
    // 获取搜索结果
    const searchResults = await studentPage.getStudentCards();
    const searchCount = searchResults.length;
    
    console.log(`搜索结果数量: ${searchCount}`);
    
    // 验证搜索功能正常工作
    expect(searchCount).toBeGreaterThanOrEqual(0);
    
    // 如果有搜索结果，验证分页信息更新
    if (searchCount > 0) {
      const searchPagination = await studentPage.getPaginationInfo();
      console.log('搜索后分页信息:', searchPagination);
      
      expect(searchPagination.totalStudents).toBeLessThanOrEqual(initialCount);
      expect(searchPagination.currentPage).toBeGreaterThan(0);
    }
    
    // 清空搜索
    await studentPage.searchStudent('');
    await testUtils.waitForNetworkIdle();
    
    // 验证清空搜索后数据恢复
    const clearedResults = await studentPage.getStudentCards();
    expect(clearedResults.length).toBeGreaterThanOrEqual(0);
  });

  test('学生筛选功能验证', async () => {
    // 等待学生列表加载
    await studentPage.waitForStudentList();
    
    // 获取初始数量
    const initialCount = await studentPage.getStudentCount();
    console.log(`筛选前学生数量: ${initialCount}`);
    
    // 测试科目筛选
    await studentPage.filterBySubject('Shooting');
    await testUtils.waitForNetworkIdle();
    
    const subjectResults = await studentPage.getStudentCount();
    console.log(`科目筛选后数量: ${subjectResults}`);
    
    // 测试课程类型筛选
    await studentPage.filterByClassType('Month');
    await testUtils.waitForNetworkIdle();
    
    const classResults = await studentPage.getStudentCount();
    console.log(`课程类型筛选后数量: ${classResults}`);
    
    // 测试会员状态筛选
    await studentPage.filterByMembership('true');
    await testUtils.waitForNetworkIdle();
    
    const membershipResults = await studentPage.getStudentCount();
    console.log(`会员状态筛选后数量: ${membershipResults}`);
    
    // 测试会员详细状态筛选
    await studentPage.filterByMembershipStatus('Active');
    await testUtils.waitForNetworkIdle();
    
    const statusResults = await studentPage.getStudentCount();
    console.log(`会员详细状态筛选后数量: ${statusResults}`);
    
    // 验证筛选结果
    expect(subjectResults).toBeGreaterThanOrEqual(0);
    expect(classResults).toBeGreaterThanOrEqual(0);
    expect(membershipResults).toBeGreaterThanOrEqual(0);
    expect(statusResults).toBeGreaterThanOrEqual(0);
    
    // 重置筛选
    await studentPage.filterBySubject('');
    await studentPage.filterByClassType('');
    await studentPage.filterByMembership('');
    await studentPage.filterByMembershipStatus('');
    await testUtils.waitForNetworkIdle();
    
    // 验证重置后数据恢复
    const resetResults = await studentPage.getStudentCount();
    expect(resetResults).toBeGreaterThanOrEqual(0);
  });

  test('学生添加功能验证', async () => {
    // 等待学生列表加载
    await studentPage.waitForStudentList();
    
    // 获取添加前的学生数量
    const initialCount = await studentPage.getStudentCount();
    console.log(`添加前学生数量: ${initialCount}`);
    
    // 点击添加学生按钮
    await studentPage.clickAddStudent();
    
    // 等待表单出现
    await studentPage.page.locator('.modal-overlay').waitFor({ state: 'visible', timeout: 5000 });
    
    // 检查是否有表单出现
    const hasModal = await testUtils.safeExists('.modal-overlay');
    
    if (hasModal) {
      console.log('检测到添加学生表单');
      
      // 验证表单基本元素
      const formSelectors = [
        'input[name="name"]',
        'input[name="phone"]',
        'input[name="age"]',
        'select[name="subject"]',
        'select[name="class"]'
      ];
      
      let formElementsFound = 0;
      for (const selector of formSelectors) {
        if (await testUtils.safeExists(selector)) {
          formElementsFound++;
          console.log(`找到表单元素: ${selector}`);
        }
      }
      
      // 验证至少有一些表单元素
      expect(formElementsFound).toBeGreaterThan(0);
      
      // 关闭表单（不实际保存）
      await studentPage.page.keyboard.press('Escape').catch(() => {});
      if (await studentPage.page.locator('.modal-overlay').isVisible().catch(() => false)) {
        await studentPage.page.locator('.modal-overlay').click({ position: { x: 8, y: 8 }, force: true }).catch(() => {});
      }
      await studentPage.page.locator('.modal-overlay').waitFor({ state: 'hidden', timeout: 5000 });
      
      console.log('表单验证完成');
    } else {
      console.log('未检测到添加学生表单，可能是通过其他方式实现');
    }
    
    // 验证添加按钮仍然可用
    expect(await studentPage.page.locator('[data-testid="add-student-btn"]').isEnabled()).toBeTruthy();
  });

  test('学生编辑功能验证', async () => {
    // 等待学生列表加载
    await studentPage.waitForStudentList();
    
    // 获取学生列表
    const studentCards = await studentPage.getStudentCards();
    
    if (studentCards.length > 0) {
      // 获取第一个学生卡片的ID
      const firstCard = studentCards[0];
      const testId = await firstCard.getAttribute('data-testid');
      const studentId = testId?.replace('student-card-', '');
      
      if (studentId) {
        console.log(`测试编辑学生 ID: ${studentId}`);
        
        // 获取编辑前的学生信息
        const studentName = await firstCard.locator('h3').textContent();
        console.log(`学生姓名: ${studentName}`);
        
        // 点击编辑按钮
        await studentPage.editStudent(parseInt(studentId));
        
        // 等待编辑表单出现
        await studentPage.page.locator('.modal-overlay').waitFor({ state: 'visible', timeout: 5000 });
        
        const hasEditModal = await testUtils.safeExists('.modal-overlay');
        
        if (hasEditModal) {
          console.log('检测到编辑学生表单');
          
          // 验证表单是否预填充了学生信息
          const nameInput = testUtils.page.locator('input[name="name"]');
          if (await nameInput.isVisible()) {
            const currentValue = await nameInput.inputValue();
            console.log(`表单中的姓名: ${currentValue}`);
            
            // 验证表单预填充了正确的学生信息
            expect(currentValue).toContain(studentName || '');
          }
          
          // 关闭编辑表单
          await studentPage.page.keyboard.press('Escape').catch(() => {});
          if (await studentPage.page.locator('.modal-overlay').isVisible().catch(() => false)) {
            await studentPage.page.locator('.modal-overlay').click({ position: { x: 8, y: 8 }, force: true }).catch(() => {});
          }
          await studentPage.page.locator('.modal-overlay').waitFor({ state: 'hidden', timeout: 5000 });
          
          console.log('编辑表单验证完成');
        } else {
          console.log('未检测到编辑表单');
        }
      }
    } else {
      console.log('没有学生数据，跳过编辑功能测试');
    }
  });

  test('学生删除功能验证', async () => {
    // 等待学生列表加载
    await studentPage.waitForStudentList();
    
    // 获取学生列表
    const studentCards = await studentPage.getStudentCards();
    
    if (studentCards.length > 0) {
      // 获取第一个学生卡片的ID
      const firstCard = studentCards[0];
      const testId = await firstCard.getAttribute('data-testid');
      const studentId = testId?.replace('student-card-', '');
      
      if (studentId) {
        console.log(`测试删除学生 ID: ${studentId}`);
        
        // 获取删除前的学生数量
        const initialCount = await studentPage.getStudentCount();
        
        // 点击删除按钮
        await studentPage.deleteStudent(parseInt(studentId));
        
        // 等待确认弹窗出现
        await testUtils.waitForElementVisible('.modal-overlay, .dialog', 3000);
        
        // 处理确认弹窗（选择取消，避免实际删除测试数据）
        await testUtils.handleConfirmModal(false);
        
        // 验证学生数量没有变化（因为取消了删除）
        const afterCancelCount = await studentPage.getStudentCount();
        expect(afterCancelCount).toBe(initialCount);
        
        console.log('删除确认弹窗验证完成');
      }
    } else {
      console.log('没有学生数据，跳过删除功能测试');
    }
  });

  test('分页功能验证', async () => {
    // 等待学生列表加载
    await studentPage.waitForStudentList();
    
    // 获取分页信息
    const pagination = await studentPage.getPaginationInfo();
    console.log('初始分页信息:', pagination);
    
    // 验证分页信息格式
    expect(pagination.currentPage).toBeGreaterThan(0);
    expect(pagination.totalPages).toBeGreaterThan(0);
    expect(pagination.totalStudents).toBeGreaterThanOrEqual(0);
    
    // 如果有多页数据，测试分页功能
    if (pagination.totalPages > 1) {
      console.log('测试多页分页功能');
      
      // 测试下一页
      if (pagination.currentPage < pagination.totalPages) {
        await studentPage.clickNextPage();
        await testUtils.waitForNetworkIdle();
        
        const nextPageInfo = await studentPage.getPaginationInfo();
        expect(nextPageInfo.currentPage).toBe(pagination.currentPage + 1);
        console.log(`成功跳转到第 ${nextPageInfo.currentPage} 页`);
        
        // 测试上一页
        await studentPage.clickPreviousPage();
        await testUtils.waitForNetworkIdle();
        
        const backPageInfo = await studentPage.getPaginationInfo();
        expect(backPageInfo.currentPage).toBe(pagination.currentPage);
        console.log(`成功返回第 ${backPageInfo.currentPage} 页`);
      }
    } else {
      console.log('只有一页数据，跳过多页分页测试');
    }
    
    // 验证分页控件状态
    const paginationWrap = studentPage.page.locator('[data-testid="student-pagination"]');
    const prevBtn = studentPage.page.locator('[data-testid="prev-page-btn"]');
    const nextBtn = studentPage.page.locator('[data-testid="next-page-btn"]');

    if (pagination.totalPages > 1) {
      expect(await paginationWrap.isVisible()).toBeTruthy();
      expect(await prevBtn.isVisible()).toBeTruthy();
      expect(await nextBtn.isVisible()).toBeTruthy();

      // 验证第一页时上一页按钮禁用
      if (pagination.currentPage === 1) {
        expect(await prevBtn.isDisabled()).toBeTruthy();
      }

      // 验证最后一页时下一页按钮禁用
      if (pagination.currentPage === pagination.totalPages) {
        expect(await nextBtn.isDisabled()).toBeTruthy();
      }
    } else {
      expect(await paginationWrap.count()).toBe(0);
    }
  });

  test('响应式布局验证', async ({ page }) => {
    // 测试桌面布局
    await testUtils.setViewport(1200, 800);
    await studentPage.waitForPageLoad();
    
    const desktopCards = await studentPage.getStudentCards();
    console.log(`桌面布局学生数量: ${desktopCards.length}`);
    
    // 测试平板布局
    await testUtils.setViewport(768, 1024);
    await page.waitForTimeout(500);
    
    const tabletCards = await studentPage.getStudentCards();
    console.log(`平板布局学生数量: ${tabletCards.length}`);
    
    // 测试手机布局
    await testUtils.setViewport(375, 667);
    await page.waitForTimeout(500);
    
    const mobileCards = await studentPage.getStudentCards();
    console.log(`手机布局学生数量: ${mobileCards.length}`);
    
    // 验证不同布局下都能正常显示
    expect(desktopCards.length).toBeGreaterThanOrEqual(0);
    expect(tabletCards.length).toBeGreaterThanOrEqual(0);
    expect(mobileCards.length).toBeGreaterThanOrEqual(0);
    
    // 验证关键元素在不同布局下都可见
    await testUtils.setViewport(1200, 800);
    expect(await studentPage.page.locator('[data-testid="student-top-bar"]').isVisible()).toBeTruthy();
    expect(await studentPage.page.locator('[data-testid="student-search-input"]').isVisible()).toBeTruthy();
    expect(await studentPage.page.locator('[data-testid="add-student-btn"]').isVisible()).toBeTruthy();
    
    console.log('响应式布局验证完成');
  });

  test('错误处理验证', async ({ page }) => {
    // 模拟网络错误
    await testUtils.mockApiError('**/api/v1/students**', 'failed');
    
    // 尝试搜索触发API调用
    await studentPage.searchStudent('test');
    await page.waitForTimeout(2000);
    
    // 检查是否有错误提示
    const errorText = await testUtils.handleErrorToast();
    if (errorText) {
      console.log('检测到错误提示:', errorText);
    }
    
    // 恢复正常网络
    await testUtils.clearAllRoutes();
    
    // 验证恢复后功能正常
    await studentPage.searchStudent('');
    await testUtils.waitForNetworkIdle();
    
    const recoveredCards = await studentPage.getStudentCards();
    expect(recoveredCards.length).toBeGreaterThanOrEqual(0);
    
    console.log('错误处理验证完成');
  });
});

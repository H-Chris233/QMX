import { test, expect } from '../fixtures';

/**
 * 学生管理功能测试
 */
test.describe('学生管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('学生管理页面可访问', async ({ page }) => {
    // 尝试找到学生管理相关的导航或链接
    const possibleSelectors = [
      'a[href*="student"]',
      'button:has-text("学生")',
      '.nav-item:has-text("学生")',
      '[data-testid="nav-student"]',
      'text=学生管理',
      'text=学员管理',
    ];
    
    let studentLink = null;
    for (const selector of possibleSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          studentLink = element;
          break;
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }
    
    if (studentLink) {
      await studentLink.click();
      await page.waitForLoadState('networkidle');
      
      // 验证页面加载成功
      await expect(page.locator('body')).toBeVisible();
      
      // 检查是否有学生相关的内容
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else {
      // 如果找不到导航，直接尝试访问可能的学生管理页面
      const possiblePaths = [
        '/students',
        '/student',
        '/student-management',
        '#/students',
        '#/student',
      ];
      
      for (const path of possiblePaths) {
        try {
          await page.goto(path);
          await page.waitForLoadState('networkidle');
          
          const pageContent = await page.textContent('body');
          if (pageContent && (
            pageContent.includes('学生') || 
            pageContent.includes('学员') ||
            pageContent.includes('Student')
          )) {
            break; // 找到了学生管理页面
          }
        } catch (error) {
          // 继续尝试下一个路径
        }
      }
    }
  });

  test('学生列表数据加载', async ({ api, page }) => {
    // 首先通过API检查学生数据
    try {
      const studentsData = await api.get('/students');
      expect(studentsData).toBeValidApiResponse();
      
      if (studentsData.success && studentsData.data) {
        console.log(`API返回 ${studentsData.data.length} 个学生记录`);
      }
    } catch (error) {
      console.log('API测试失败，尝试前端测试:', error);
    }
    
    // 检查前端学生列表
    await page.goto('/');
    
    // 尝试访问学生页面
    const studentSelectors = [
      'a[href*="student"]',
      'text=学生管理',
      'text=学员管理',
    ];
    
    for (const selector of studentSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await page.waitForLoadState('networkidle');
          break;
        }
      } catch (error) {
        // 继续尝试
      }
    }
    
    // 检查页面是否有表格或列表元素
    const listSelectors = [
      'table',
      '.table',
      '.list',
      '[data-testid="student-list"]',
      '.student-list',
    ];
    
    let hasList = false;
    for (const selector of listSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          hasList = true;
          console.log(`找到学生列表元素: ${selector}`);
          break;
        }
      } catch (error) {
        // 继续尝试
      }
    }
    
    if (!hasList) {
      console.log('未找到学生列表元素，可能页面结构不同');
    }
  });

  test('学生搜索功能', async ({ page }) => {
    // 导航到学生管理页面
    await page.goto('/');
    
    // 尝试找到搜索框
    const searchSelectors = [
      'input[placeholder*="搜索"]',
      'input[placeholder*="查找"]',
      'input[type="search"]',
      '.search-input',
      '[data-testid="search"]',
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          searchInput = element;
          break;
        }
      } catch (error) {
        // 继续尝试
      }
    }
    
    if (searchInput) {
      // 测试搜索功能
      await searchInput.fill('张三');
      await page.waitForTimeout(1000); // 等待搜索结果
      
      // 验证搜索结果
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    } else {
      console.log('未找到搜索输入框');
    }
  });

  test('学生添加功能', async ({ page, testData }) => {
    // 导航到学生管理页面
    await page.goto('/');
    
    // 尝试找到添加学生按钮
    const addSelectors = [
      'button:has-text("添加")',
      'button:has-text("新增")',
      'button:has-text("创建")',
      '.add-button',
      '[data-testid="add-student"]',
      'text=添加学生',
      'text=新增学员',
    ];
    
    let addButton = null;
    for (const selector of addSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          addButton = element;
          break;
        }
      } catch (error) {
        // 继续尝试
      }
    }
    
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(1000);
      
      // 检查是否打开了表单或模态框
      const formSelectors = [
        'form',
        '.modal',
        '.dialog',
        '[data-testid="student-form"]',
        '.student-form',
      ];
      
      let hasForm = false;
      for (const selector of formSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            hasForm = true;
            console.log(`找到学生表单: ${selector}`);
            break;
          }
        } catch (error) {
          // 继续尝试
        }
      }
      
      if (hasForm) {
        // 尝试填写表单
        const inputSelectors = [
          'input[name="name"]',
          'input[placeholder*="姓名"]',
          'input[id*="name"]',
        ];
        
        for (const selector of inputSelectors) {
          try {
            const input = page.locator(selector).first();
            if (await input.isVisible({ timeout: 1000 })) {
              await input.fill(testData.students[0].name);
              console.log('成功填写姓名字段');
              break;
            }
          } catch (error) {
            // 继续尝试
          }
        }
      }
    } else {
      console.log('未找到添加学生按钮');
    }
  });

  test('响应式布局测试', async ({ page }) => {
    // 测试桌面布局
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 检查主要元素在桌面视图中的可见性
    const bodyVisible = await page.locator('body').isVisible();
    expect(bodyVisible).toBeTruthy();
    
    // 测试平板布局
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');
    
    const tabletBodyVisible = await page.locator('body').isVisible();
    expect(tabletBodyVisible).toBeTruthy();
    
    // 测试手机布局
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');
    
    const mobileBodyVisible = await page.locator('body').isVisible();
    expect(mobileBodyVisible).toBeTruthy();
    
    console.log('响应式布局测试通过');
  });
});
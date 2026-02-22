import { type Page, expect } from '@playwright/test';

/**
 * 学员管理页面对象模型
 * 封装学员管理相关的操作
 */
export class StudentManagementPage {
  constructor(public readonly page: Page) {}

  private async ensureSidebarClosed(): Promise<void> {
    const isOpen = await this.page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="mobile-sidebar"], .sidebar') as HTMLElement | null;
      if (!sidebar) return false;
      const dataFlag = sidebar.getAttribute('data-sidebar-open');
      if (dataFlag === 'true') return true;
      if (dataFlag === 'false') return false;
      return sidebar.classList.contains('sidebar-open');
    }).catch(() => false);

    if (!isOpen) return;

    await this.page.evaluate(() => {
      const closeBtn = document.querySelector('.sidebar-close') as HTMLElement | null;
      closeBtn?.click();
    }).catch(() => {});

    await this.page.waitForFunction(() => {
      const sidebar = document.querySelector('[data-testid="mobile-sidebar"], .sidebar') as HTMLElement | null;
      if (!sidebar) return true;
      const dataFlag = sidebar.getAttribute('data-sidebar-open');
      if (dataFlag === 'false') return true;
      return !sidebar.classList.contains('sidebar-open');
    }, { timeout: 2200 }).catch(() => {});
  }

  private isRateLimitMessage(message?: string | null): boolean {
    if (!message) return false;
    return /429|too many requests|请求过于频繁/i.test(message);
  }

  private async dismissErrorModalIfPresent(): Promise<string | null> {
    const overlay = this.page.locator('.error-modal-overlay');
    if (!(await overlay.isVisible().catch(() => false))) {
      return null;
    }

    const message = await overlay.textContent().catch(() => null);

    const closeButton = this.page
      .locator('.error-modal-overlay button:has-text("确定"), .error-modal-overlay button:has-text("关闭")')
      .first();

    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click({ force: true }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    return message;
  }

  private async runWithRateLimitRetry(action: () => Promise<void>): Promise<void> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      await this.dismissErrorModalIfPresent();
      await action();
      await this.page.waitForTimeout(800);
      const modalMessage = await this.dismissErrorModalIfPresent();
      if (!this.isRateLimitMessage(modalMessage)) {
        return;
      }

      await this.page.waitForTimeout(1200 * attempt);
    }
  }

  /**
   * 等待学员管理页面加载
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.locator('[data-testid="student-management"]').waitFor({ state: 'visible' });
  }

  /**
   * 搜索学员
   */
  async searchStudent(searchTerm: string): Promise<void> {
    await this.runWithRateLimitRetry(async () => {
      await this.page.locator('[data-testid="student-search-input"]').fill(searchTerm);
      const searchButton = this.page.locator('[data-testid="student-search-button"]');
      if (await searchButton.isVisible().catch(() => false)) {
        await searchButton.click({ timeout: 2000 }).catch(async () => {
          await this.dismissErrorModalIfPresent();
          const forceClicked = await searchButton.click({ force: true, timeout: 1000 }).then(() => true).catch(() => false);
          if (!forceClicked) {
            await this.page.locator('[data-testid="student-search-input"]').press('Enter');
          }
        });
      } else {
        await this.page.locator('[data-testid="student-search-input"]').press('Enter');
      }
    });
  }

  /**
   * 按科目筛选
   */
  async filterBySubject(subject: string): Promise<void> {
    await this.runWithRateLimitRetry(async () => {
      await this.page.locator('[data-testid="filter-subject"]').selectOption(subject);
    });
  }

  /**
   * 按课程类型筛选
   */
  async filterByClassType(classType: string): Promise<void> {
    await this.runWithRateLimitRetry(async () => {
      await this.page.locator('[data-testid="filter-class-type"]').selectOption(classType);
    });
  }

  /**
   * 按会员状态筛选
   */
  async filterByMembership(hasMembership: string): Promise<void> {
    await this.runWithRateLimitRetry(async () => {
      await this.page.locator('[data-testid="filter-has-membership"]').selectOption(hasMembership);
    });
  }

  /**
   * 按会员状态详细筛选
   */
  async filterByMembershipStatus(status: string): Promise<void> {
    const detailedFilter = this.page.locator('[data-testid="filter-membership-status"]');
    if (await detailedFilter.count()) {
      await this.runWithRateLimitRetry(async () => {
        await detailedFilter.selectOption(status);
      });
      return;
    }

    // 当前页面仅提供 has_membership 筛选，兼容旧测试入口。
    const normalized = status === '' ? '' : status === 'Active' ? 'true' : 'false';
    await this.filterByMembership(normalized);
  }

  /**
   * 点击添加学员按钮
   */
  async clickAddStudent(): Promise<void> {
    await this.page.locator('[data-testid="add-student-btn"]').click();
  }

  /**
   * 点击导出学员数据按钮
   */
  async clickExportStudents(): Promise<void> {
    await this.ensureSidebarClosed();
    const exportButton = this.page.locator('[data-testid="export-students-btn"]');
    await exportButton.click({ timeout: 2500 }).catch(async () => {
      await this.ensureSidebarClosed();
      const forceClicked = await exportButton.click({ force: true, timeout: 1200 }).then(() => true).catch(() => false);
      if (!forceClicked) {
        await exportButton.evaluate((element) => {
          (element as HTMLElement).click();
        });
      }
    });
  }

  /**
   * 获取学员列表中的所有学员卡片
   */
  async getStudentCards(): Promise<any[]> {
    return await this.page.locator('[data-testid^="student-card-"]').all();
  }

  /**
   * 获取指定ID的学员卡片
   */
  async getStudentCard(studentId: number): Promise<any> {
    return this.page.locator(`[data-testid="student-card-${studentId}"]`);
  }

  /**
   * 点击编辑学员
   */
  async editStudent(studentId: number): Promise<void> {
    await this.page.locator(`[data-testid="edit-student-${studentId}"]`).click();
  }

  /**
   * 点击删除学员
   */
  async deleteStudent(studentId: number): Promise<void> {
    await this.page.locator(`[data-testid="delete-student-${studentId}"]`).click();
  }

  /**
   * 获取分页信息
   */
  async getPaginationInfo(): Promise<{
    currentPage: number;
    totalPages: number;
    totalStudents: number;
  }> {
    const pageInfo = this.page.locator('[data-testid="page-info"]');
    if ((await pageInfo.count()) === 0) {
      return {
        currentPage: 1,
        totalPages: 1,
        totalStudents: await this.getStudentCount()
      };
    }

    const pageInfoText = await pageInfo.textContent();
    const match = pageInfoText?.match(/(\d+) \/ (\d+) \(共 (\d+) 人\)/);
    
    if (match) {
      return {
        currentPage: parseInt(match[1]),
        totalPages: parseInt(match[2]),
        totalStudents: parseInt(match[3])
      };
    }
    
    return { currentPage: 1, totalPages: 1, totalStudents: 0 };
  }

  /**
   * 点击上一页
   */
  async clickPreviousPage(): Promise<void> {
    const prevBtn = this.page.locator('[data-testid="prev-page-btn"]');
    if (!(await prevBtn.isDisabled())) {
      await prevBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * 点击下一页
   */
  async clickNextPage(): Promise<void> {
    const nextBtn = this.page.locator('[data-testid="next-page-btn"]');
    if (!(await nextBtn.isDisabled())) {
      await nextBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * 检查学员卡片是否显示指定信息
   */
  async verifyStudentInfo(studentId: number, expectedInfo: {
    name?: string;
    phone?: string;
    subject?: string;
    age?: string;
    class?: string;
  }): Promise<boolean> {
    const card = await this.getStudentCard(studentId);
    
    if (expectedInfo.name) {
      const name = await card.locator('h3').textContent();
      if (name !== expectedInfo.name) return false;
    }
    
    if (expectedInfo.phone) {
      const phone = await card.locator('.info-value:has-text("' + expectedInfo.phone + '")').isVisible();
      if (!phone) return false;
    }
    
    if (expectedInfo.subject) {
      const subject = await card.locator('.info-value:has-text("' + expectedInfo.subject + '")').isVisible();
      if (!subject) return false;
    }
    
    return true;
  }

  /**
   * 获取学员数量
   */
  async getStudentCount(): Promise<number> {
    const cards = await this.getStudentCards();
    return cards.length;
  }

  /**
   * 等待学员列表加载
   */
  async waitForStudentList(): Promise<void> {
    const list = this.page.locator('[data-testid="student-list"]');
    for (let attempt = 1; attempt <= 2; attempt++) {
      const visible = await list.isVisible().catch(() => false);
      if (visible) return;

      await list.waitFor({ state: 'visible', timeout: 4000 }).catch(async () => {
        const message = await this.dismissErrorModalIfPresent();
        if (this.isRateLimitMessage(message)) {
          await this.page.waitForTimeout(1200 * attempt);
        }
      });
    }
    await list.waitFor({ state: 'visible', timeout: 6000 });
  }
}

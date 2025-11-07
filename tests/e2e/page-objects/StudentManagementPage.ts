import { type Page, expect } from '@playwright/test';

/**
 * 学员管理页面对象模型
 * 封装学员管理相关的操作
 */
export class StudentManagementPage {
  constructor(public readonly page: Page) {}

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
    await this.page.locator('[data-testid="student-search-input"]').fill(searchTerm);
    await this.page.locator('[data-testid="student-search-button"]').click();
    await this.page.waitForTimeout(1000); // 等待搜索结果
  }

  /**
   * 按科目筛选
   */
  async filterBySubject(subject: string): Promise<void> {
    await this.page.locator('[data-testid="filter-subject"]').selectOption(subject);
    await this.page.waitForTimeout(1000);
  }

  /**
   * 按课程类型筛选
   */
  async filterByClassType(classType: string): Promise<void> {
    await this.page.locator('[data-testid="filter-class-type"]').selectOption(classType);
    await this.page.waitForTimeout(1000);
  }

  /**
   * 按会员状态筛选
   */
  async filterByMembership(hasMembership: string): Promise<void> {
    await this.page.locator('[data-testid="filter-has-membership"]').selectOption(hasMembership);
    await this.page.waitForTimeout(1000);
  }

  /**
   * 按会员状态详细筛选
   */
  async filterByMembershipStatus(status: string): Promise<void> {
    await this.page.locator('[data-testid="filter-membership-status"]').selectOption(status);
    await this.page.waitForTimeout(1000);
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
    await this.page.locator('[data-testid="export-students-btn"]').click();
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
    const pageInfoText = await this.page.locator('[data-testid="page-info"]').textContent();
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
    await this.page.locator('[data-testid="student-list"]').waitFor({ state: 'visible' });
  }
}
import { type Page, expect } from '@playwright/test';

/**
 * 主应用页面对象模型
 * 封装应用级别的操作和导航
 */
export class AppPage {
  constructor(public readonly page: Page) {}

  /**
   * 导航到指定标签页
   */
  async navigateToTab(tabId: 'dashboard' | 'students' | 'finance' | 'grades' | 'settings'): Promise<void> {
    await this.page.locator(`[data-testid="nav-${tabId}"]`).click();
    // 等待对应内容区域可见
    await this.page.locator(`[data-testid="${tabId}-tab"]`).waitFor({ state: 'visible' });
  }

  /**
   * 获取当前激活的标签页
   */
  async getActiveTab(): Promise<string | null> {
    const activeTab = this.page.locator('.nav-menu-item.active');
    if (await activeTab.isVisible()) {
      return await activeTab.getAttribute('data-testid');
    }
    return null;
  }

  /**
   * 等待应用加载完成
   */
  async waitForAppLoad(): Promise<void> {
    await this.page.locator('[data-testid="main-content"]').waitFor({ state: 'visible' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 检查错误弹窗是否存在
   */
  async hasError(): Promise<boolean> {
    return await this.page.locator('[data-testid*="error"]').isVisible().catch(() => false);
  }

  /**
   * 获取页面标题
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * 刷新页面
   */
  async refresh(): Promise<void> {
    await this.page.reload();
    await this.waitForAppLoad();
  }
}
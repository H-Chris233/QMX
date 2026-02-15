import { type Page, expect } from '@playwright/test';

/** E2E 测试使用的固定密码（与 global-setup 中设置的一致） */
const TEST_PASSWORD = 'test1234';

/**
 * 主应用页面对象模型
 * 封装应用级别的操作和导航
 */
export class AppPage {
  constructor(public readonly page: Page) {}

  private async dismissErrorModalIfPresent(): Promise<void> {
    const overlay = this.page.locator('.error-modal-overlay');
    if (!(await overlay.isVisible().catch(() => false))) {
      return;
    }

    const closeButton = this.page
      .locator('.error-modal-overlay button:has-text("确定"), .error-modal-overlay button:has-text("关闭")')
      .first();

    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click({ force: true }).catch(() => {});
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  /**
   * 导航到指定标签页
   */
  async navigateToTab(tabId: 'dashboard' | 'students' | 'finance' | 'grades' | 'settings'): Promise<void> {
    const navItem = this.page.locator(`[data-testid="nav-${tabId}"]`);
    await this.dismissErrorModalIfPresent();
    await navItem.click().catch(async () => {
      await this.dismissErrorModalIfPresent();
      await navItem.click({ force: true });
    });
    // 等待导航项变为激活状态
    await expect(navItem).toHaveClass(/active/, { timeout: 10000 });
    // 等待内容区过渡动画完成
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 获取当前激活的标签页
   */
  async getActiveTab(): Promise<string | null> {
    const activeTab = this.page.locator('.nav-item.active').first();
    if (await activeTab.isVisible()) {
      return await activeTab.getAttribute('data-testid');
    }
    return null;
  }

  /**
   * 准备应用环境并导航到首页
   * 在 page.goto('/') 之前调用，注入 localStorage 绕过用户协议
   * 使用方式：替代 beforeEach 中的 page.goto('/') + waitForAppLoad()
   */
  async setupAndNavigate(): Promise<void> {
    // 1. 在页面加载前注入 localStorage，绕过用户协议
    await this.page.addInitScript(() => {
      localStorage.setItem('qmx_agreed_to_terms', 'true');
    });

    // 2. 导航到首页（此时 main.ts 读取 localStorage 发现已同意，挂载 MainApp）
    await this.page.goto('/');

    // 3. 处理登录
    await this.handleAuthFlow();
  }

  /**
   * 等待应用加载完成
   * 自动处理用户协议同意和登录流程
   */
  async waitForAppLoad(): Promise<void> {
    const mainContent = this.page.locator('[data-testid="main-content"]');

    // 快速检测：主内容是否已经可见（已登录状态）
    if (await mainContent.isVisible().catch(() => false)) {
      await this.page.waitForLoadState('networkidle');
      return;
    }

    // 如果还在用户协议页或登录页，通过 addInitScript 重新导航
    await this.page.addInitScript(() => {
      localStorage.setItem('qmx_agreed_to_terms', 'true');
    });
    await this.page.goto('/');

    // 处理登录
    await this.handleAuthFlow();
  }

  /**
   * 处理认证流程（登录或设置密码）
   */
  private async handleAuthFlow(): Promise<void> {
    const loginBtn = this.page.locator('.login-btn');
    const mainContent = this.page.locator('[data-testid="main-content"]');

    // 等待登录页或主内容出现
    await Promise.race([
      loginBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      mainContent.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    ]);

    // 如果登录按钮可见，完成登录
    if (await loginBtn.isVisible().catch(() => false)) {
      await this.performLogin();
    }

    // 等待主内容区域可见
    await mainContent.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 执行登录操作
   */
  private async performLogin(): Promise<void> {
    const passwordInputs = this.page.locator('input[type="password"]');
    const count = await passwordInputs.count();
    const visibleInputIndexes: number[] = [];

    for (let i = 0; i < count; i++) {
      if (await passwordInputs.nth(i).isVisible().catch(() => false)) {
        visibleInputIndexes.push(i);
      }
    }

    if (visibleInputIndexes.length >= 2) {
      // 首次访问：设置密码 + 确认密码
      await passwordInputs.nth(visibleInputIndexes[0]).fill(TEST_PASSWORD);
      await passwordInputs.nth(visibleInputIndexes[1]).fill(TEST_PASSWORD);
    } else if (visibleInputIndexes.length === 1) {
      // 已有密码：输入密码登录
      await passwordInputs.nth(visibleInputIndexes[0]).fill(TEST_PASSWORD);
    } else if (count > 0) {
      // 兜底：如果可见性判断异常，至少填充第一个输入框
      await passwordInputs.first().fill(TEST_PASSWORD);
    }

    await this.page.locator('.login-btn').click();

    // 等待登录成功后主内容出现
    await this.page.locator('[data-testid="main-content"]').waitFor({ state: 'visible', timeout: 15000 });
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
    // 刷新后 addInitScript 仍然生效，只需处理认证
    await this.handleAuthFlow();
  }
}

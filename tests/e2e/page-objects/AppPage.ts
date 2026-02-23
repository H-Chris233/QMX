import { type Page, expect } from '@playwright/test';

/** E2E 测试使用的固定密码（与 global-setup 中设置的一致） */
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '1234';
type TabId = 'dashboard' | 'students' | 'finance' | 'grades' | 'settings';

/**
 * 主应用页面对象模型
 * 封装应用级别的操作和导航
 */
export class AppPage {
  constructor(public readonly page: Page) {}

  private getTabLabel(tabId: TabId): string {
    const tabLabelMap: Record<TabId, string> = {
      dashboard: '仪表盘',
      students: '学员管理',
      finance: '收支统计',
      grades: '成绩管理',
      settings: '设置',
    };
    return tabLabelMap[tabId];
  }

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

  private async clickDesktopNav(tabId: TabId): Promise<boolean> {
    const navItem = this.page.locator(`[data-testid="nav-${tabId}"]`).first();
    const visible = await navItem.isVisible().catch(() => false);
    if (!visible) return false;

    const pointerClicked = await navItem
      .click({ timeout: 2500 })
      .then(() => true)
      .catch(() => false);

    if (!pointerClicked) {
      await this.dismissErrorModalIfPresent();

      const forceClicked = await navItem
        .click({ force: true, timeout: 1500 })
        .then(() => true)
        .catch(() => false);

      if (!forceClicked) {
        await navItem.evaluate((element) => {
          (element as HTMLElement).click();
        });
      }
    }
    return true;
  }

  private async clickMobileSidebarNav(tabId: TabId): Promise<boolean> {
    const sidebarItemByTestId = this.page.locator(`[data-testid="sidebar-nav-${tabId}"]`).first();
    const sidebarItemByText = this.page
      .locator('.sidebar .sidebar-menu li', { hasText: this.getTabLabel(tabId) })
      .first();
    const sidebarItem = (await sidebarItemByTestId.count().catch(() => 0)) > 0 ? sidebarItemByTestId : sidebarItemByText;
    const toggleBtn = this.page.locator('.sidebar-toggle').first();

    const alreadyVisible = await sidebarItem.isVisible().catch(() => false);
    if (!alreadyVisible) {
      const toggleVisible = await toggleBtn.isVisible().catch(() => false);
      if (!toggleVisible) return false;
      await toggleBtn.click().catch(async () => {
        await toggleBtn.click({ force: true });
      });
      await sidebarItem.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
    }

    const handle = await sidebarItem.elementHandle({ timeout: 2000 }).catch(() => null);
    if (!handle) return false;
    await handle.evaluate((element) => {
      (element as HTMLElement).click();
    });
    await handle.dispose().catch(() => {});
    return true;
  }

  private async clickTabByDomScript(tabId: TabId): Promise<boolean> {
    return this.page.evaluate((id) => {
      const nav = document.querySelector(`[data-testid="nav-${id}"]`) as HTMLElement | null;
      if (!nav) return false;
      nav.click();
      return true;
    }, tabId).catch(() => false);
  }

  private async isSidebarOpen(): Promise<boolean> {
    return this.page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="mobile-sidebar"], .sidebar') as HTMLElement | null;
      if (!sidebar) return false;
      const dataFlag = sidebar.getAttribute('data-sidebar-open');
      if (dataFlag === 'true') return true;
      if (dataFlag === 'false') return false;
      return sidebar.classList.contains('sidebar-open');
    }).catch(() => false);
  }

  private async waitSidebarClosed(timeout = 2200): Promise<boolean> {
    return this.page.waitForFunction(() => {
      const sidebar = document.querySelector('[data-testid="mobile-sidebar"], .sidebar') as HTMLElement | null;
      if (!sidebar) return true;
      const dataFlag = sidebar.getAttribute('data-sidebar-open');
      if (dataFlag === 'false') return true;
      return !sidebar.classList.contains('sidebar-open');
    }, { timeout }).then(() => true).catch(() => false);
  }

  private async closeSidebarIfOpen(): Promise<void> {
    if (!(await this.isSidebarOpen())) return;

    const closeBtn = this.page.locator('.sidebar-close').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
      if (await this.waitSidebarClosed()) return;
    }

    const overlay = this.page.locator('[data-testid="sidebar-overlay"], .sidebar-overlay').first();
    if (await overlay.isVisible().catch(() => false)) {
      await overlay.click({ force: true }).catch(() => {});
      if (await this.waitSidebarClosed()) return;
    }

    // DOM 级兜底：触发关闭按钮 click，避免直接改 class 导致响应式状态回写不一致。
    await this.page.evaluate(() => {
      const close = document.querySelector('.sidebar-close') as HTMLElement | null;
      close?.click();
    }).catch(() => {});

    await this.waitSidebarClosed();
  }

  /**
   * 导航到指定标签页
   */
  async navigateToTab(tabId: TabId): Promise<void> {
    const activeDesktopItem = this.page.locator(`[data-testid="nav-${tabId}"]`).first();
    const alreadyActive = await activeDesktopItem
      .evaluate((element) => element.classList.contains('active'))
      .catch(() => false);

    if (alreadyActive) {
      await this.closeSidebarIfOpen();
      await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      return;
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.dismissErrorModalIfPresent();

      // 优先使用 DOM click，移动端可避免打开侧栏导致的点击拦截。
      const clickedByScript = await this.clickTabByDomScript(tabId).catch(() => false);
      const clickedDesktop = clickedByScript ? false : await this.clickDesktopNav(tabId).catch(() => false);
      const clickedMobile = (clickedByScript || clickedDesktop)
        ? false
        : await this.clickMobileSidebarNav(tabId).catch(() => false);

      if (!clickedDesktop && !clickedMobile && !clickedByScript) {
        if (attempt === 3) {
          throw new Error(`无法定位可点击的导航入口: ${tabId}`);
        }
        await this.page.waitForTimeout(300);
        continue;
      }

      const activated = await expect(activeDesktopItem).toHaveClass(/active/, { timeout: 6000 })
        .then(() => true)
        .catch(() => false);

      if (activated) {
        await this.closeSidebarIfOpen();
        await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        return;
      }

      if (attempt < 3) {
        await this.page.waitForTimeout(300);
      }
    }

    await expect(activeDesktopItem).toHaveClass(/active/, { timeout: 3000 });
  }

  /**
   * 获取当前激活的标签页
   */
  async getActiveTab(): Promise<string | null> {
    return this.page.evaluate(() => {
      const desktopActive = document.querySelector('.nav-item.active') as HTMLElement | null;
      const desktopTestId = desktopActive?.getAttribute('data-testid');
      if (desktopTestId) return desktopTestId;

      const sidebarActive = document.querySelector('.sidebar-menu li.active') as HTMLElement | null;
      const sidebarTestId = sidebarActive?.getAttribute('data-testid');
      if (!sidebarTestId) return null;

      if (sidebarTestId.startsWith('sidebar-nav-')) {
        return `nav-${sidebarTestId.replace('sidebar-nav-', '')}`;
      }
      return sidebarTestId;
    }).catch(() => null);
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
    const visiblePasswordInputs = () => this.page.locator('input[type="password"]:visible');
    const loginButton = this.page.locator('.login-btn');
    const mainContent = this.page.locator('[data-testid="main-content"]');

    // 登录页在初始化时会发生重渲染；使用多次短重试避免单次操作被 DOM 抖动拖满 30s。
    for (let attempt = 1; attempt <= 3; attempt++) {
      const inputCount = await visiblePasswordInputs().count();

      if (inputCount >= 1) {
        await visiblePasswordInputs().first().fill(TEST_PASSWORD, { timeout: 2000 });
      } else {
        const fallbackInput = this.page.locator('input[type="password"]').first();
        await fallbackInput.waitFor({ state: 'visible', timeout: 3000 });
        await fallbackInput.fill(TEST_PASSWORD, { timeout: 2000 });
      }

      // 首次设置密码场景：确认密码输入框可能在首个输入后才稳定出现。
      const confirmInput = this.page.locator('input[type="password"][placeholder*="确认"]:visible').first();
      if ((await confirmInput.count()) > 0) {
        await confirmInput.fill(TEST_PASSWORD, { timeout: 2000 }).catch(async () => {
          if ((await visiblePasswordInputs().count()) >= 2) {
            await visiblePasswordInputs().nth(1).fill(TEST_PASSWORD, { timeout: 1000 }).catch(() => {});
          }
        });
      }

      await loginButton.click({ timeout: 3000 });

      const loginSucceeded = await mainContent
        .waitFor({ state: 'visible', timeout: 6000 })
        .then(() => true)
        .catch(() => false);

      if (loginSucceeded) {
        return;
      }

      // 如果仍停留在登录页，等待短暂稳定后重试。
      await this.page.waitForTimeout(250);
    }

    // 最后给出明确失败点，便于定位认证流程异常。
    await mainContent.waitFor({ state: 'visible', timeout: 8000 });
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

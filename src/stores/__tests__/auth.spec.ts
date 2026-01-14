/**
 * Auth Store 单元测试
 *
 * 测试覆盖：
 * 1. 状态初始化
 * 2. 获取认证状态
 * 3. 设置密码（首次访问）
 * 4. 验证密码
 * 5. 登出
 * 6. Getters计算属性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../auth';
import { AuthApiService } from '../../api/authApi';

// Mock ApiService
vi.mock('../../api/authApi', () => ({
  AuthApiService: {
    getStatus: vi.fn(),
    setupPassword: vi.fn(),
    verifyPassword: vi.fn()
  }
}));

describe('useAuthStore', () => {
  let pinia: ReturnType<typeof createPinia>;
  let store: ReturnType<typeof useAuthStore>;

  const createTestPinia = () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    return pinia;
  };

  beforeEach(() => {
    pinia = createTestPinia();
    vi.clearAllMocks();
    import.meta.env.VITE_ADMIN_PASSWORD_HASH = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. 状态初始化', () => {
    it('应该正确初始化认证状态', () => {
      store = useAuthStore();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.isFirstVisit).toBe(true);
      expect(store.isAdmin).toBe(false);
    });
  });

  describe('2. Getters计算属性', () => {
    it('hasPassword 应该在 isFirstVisit 为 false 时返回 true', () => {
      store = useAuthStore();
      store.isFirstVisit = false;
      expect(store.hasPassword).toBe(true);
    });

    it('hasPassword 应该在 isFirstVisit 为 true 时返回 false', () => {
      store = useAuthStore();
      store.isFirstVisit = true;
      expect(store.hasPassword).toBe(false);
    });

    it('isNetworkError 应该在错误包含网络错误时返回 true', () => {
      store = useAuthStore();
      store.error = '无法连接到服务器，请检查网络连接';
      expect(store.isNetworkError).toBe(true);
    });

    it('isNetworkError 应该在错误不包含网络错误时返回 false', () => {
      store = useAuthStore();
      store.error = '密码错误';
      expect(store.isNetworkError).toBe(false);
    });
  });

  describe('3. fetchStatus - 获取认证状态', () => {
    it('应该在首次访问时设置 isFirstVisit 为 true', async () => {
      store = useAuthStore();
      (AuthApiService.getStatus as vi.Mock).mockResolvedValue({
        isFirstVisit: true,
        adminConfigured: false
      });

      await store.fetchStatus();

      expect(store.isFirstVisit).toBe(true);
      expect(store.isAuthenticated).toBe(false);
    });

    it('应该在非首次访问时设置 isFirstVisit 为 false', async () => {
      store = useAuthStore();
      (AuthApiService.getStatus as vi.Mock).mockResolvedValue({
        isFirstVisit: false,
        adminConfigured: false
      });

      await store.fetchStatus();

      expect(store.isFirstVisit).toBe(false);
    });

    it('应该在获取状态时设置加载状态', async () => {
      store = useAuthStore();
      (AuthApiService.getStatus as vi.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ isFirstVisit: true }), 100))
      );

      const promise = store.fetchStatus();
      expect(store.isLoading).toBe(true);

      await promise;
      expect(store.isLoading).toBe(false);
    });

    it('应该在API错误时设置错误信息', async () => {
      store = useAuthStore();
      (AuthApiService.getStatus as vi.Mock).mockRejectedValue(new Error('Network error'));

      await store.fetchStatus();

      expect(store.error).toContain('无法连接到服务器');
    });

    it('当API错误且没有管理员密码时应该设置 isFirstVisit', async () => {
      store = useAuthStore();
      (AuthApiService.getStatus as vi.Mock).mockRejectedValue(new Error('Network error'));

      await store.fetchStatus();

      expect(store.isFirstVisit).toBe(true);
    });
  });

  describe('4. setPassword - 设置站点密码（首次访问）', () => {
    it('应该在密码长度小于4位时返回失败', async () => {
      store = useAuthStore();
      const result = await store.setPassword('123');
      expect(result).toBe(false);
      expect(store.error).toBe('密码长度至少4位');
    });

    it('应该在密码为空时返回失败', async () => {
      store = useAuthStore();
      const result = await store.setPassword('');
      expect(result).toBe(false);
      expect(store.error).toBe('密码长度至少4位');
    });

    it('应该成功设置密码并自动登录', async () => {
      store = useAuthStore();
      (AuthApiService.setupPassword as vi.Mock).mockResolvedValue({
        success: true
      });

      const result = await store.setPassword('test123');

      expect(result).toBe(true);
      expect(store.isAuthenticated).toBe(true);
      expect(store.isFirstVisit).toBe(false);
    });

    it('应该成功设置密码后设置 isAdmin 为 false', async () => {
      store = useAuthStore();
      (AuthApiService.setupPassword as vi.Mock).mockResolvedValue({
        success: true
      });

      await store.setPassword('test123');

      expect(store.isAdmin).toBe(false);
    });

    it('应该在设置失败时返回错误信息', async () => {
      store = useAuthStore();
      (AuthApiService.setupPassword as vi.Mock).mockResolvedValue({
        success: false,
        error: '密码设置失败'
      });

      const result = await store.setPassword('test123');

      expect(result).toBe(false);
      expect(store.error).toBe('密码设置失败');
    });

    it('应该在网络错误时设置错误信息', async () => {
      store = useAuthStore();
      (AuthApiService.setupPassword as vi.Mock).mockRejectedValue(new Error('Network error'));

      const result = await store.setPassword('test123');

      expect(result).toBe(false);
      expect(store.error).toContain('网络错误');
    });

    it('应该在设置密码时设置加载状态', async () => {
      store = useAuthStore();
      (AuthApiService.setupPassword as vi.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const promise = store.setPassword('test123');
      expect(store.isLoading).toBe(true);

      await promise;
      expect(store.isLoading).toBe(false);
    });
  });

  describe('5. verifyPassword - 验证密码', () => {
    it('应该在密码为空时返回失败', async () => {
      store = useAuthStore();
      const result = await store.verifyPassword('');
      expect(result).toBe(false);
      expect(store.error).toBe('请输入密码');
    });

    it('应该成功验证管理员密码', async () => {
      // 设置管理员密码环境变量
      import.meta.env.VITE_ADMIN_PASSWORD_HASH = '$2a$10$hashedpassword';

      store = useAuthStore();
      (AuthApiService.verifyPassword as vi.Mock).mockResolvedValue({
        success: true
      });

      const result = await store.verifyPassword('admin123');

      expect(result).toBe(true);
      expect(store.isAuthenticated).toBe(true);
      expect(store.isAdmin).toBe(true);
    });

    it('应该成功验证普通用户密码', async () => {
      store = useAuthStore();
      (AuthApiService.verifyPassword as vi.Mock).mockResolvedValue({
        success: true,
        data: { isAdmin: false }
      });

      const result = await store.verifyPassword('user123');

      expect(result).toBe(true);
      expect(store.isAuthenticated).toBe(true);
      expect(store.isAdmin).toBe(false);
    });

    it('应该在验证失败时返回错误信息', async () => {
      store = useAuthStore();
      (AuthApiService.verifyPassword as vi.Mock).mockResolvedValue({
        success: false,
        error: '密码错误'
      });

      const result = await store.verifyPassword('wrongpassword');

      expect(result).toBe(false);
      expect(store.error).toBe('密码错误');
    });

    it('应该在网络错误时设置错误信息', async () => {
      store = useAuthStore();
      (AuthApiService.verifyPassword as vi.Mock).mockRejectedValue(new Error('Network error'));

      const result = await store.verifyPassword('test123');

      expect(result).toBe(false);
      expect(store.error).toContain('网络错误');
    });

    it('应该在验证时设置加载状态', async () => {
      store = useAuthStore();
      (AuthApiService.verifyPassword as vi.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const promise = store.verifyPassword('test123');
      expect(store.isLoading).toBe(true);

      await promise;
      expect(store.isLoading).toBe(false);
    });
  });

  describe('6. logout - 登出', () => {
    it('应该正确登出并重置所有状态', () => {
      store = useAuthStore();
      store.isAuthenticated = true;
      store.isAdmin = true;
      store.error = 'Some error';

      store.logout();

      expect(store.isAuthenticated).toBe(false);
      expect(store.isAdmin).toBe(false);
      expect(store.error).toBeNull();
    });
  });

  describe('7. clearError - 清除错误', () => {
    it('应该清除错误信息', () => {
      store = useAuthStore();
      store.error = 'Some error';

      store.clearError();

      expect(store.error).toBeNull();
    });
  });

  describe('8. 边界条件测试', () => {
    it('should handle concurrent authentication attempts', async () => {
      store = useAuthStore();
      (AuthApiService.verifyPassword as vi.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 200))
      );

      const promise1 = store.verifyPassword('test123');
      const promise2 = store.verifyPassword('test123');

      expect(store.isLoading).toBe(true);

      await promise1;
      await promise2;

      expect(store.isLoading).toBe(false);
    });
  });
});

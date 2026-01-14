/**
 * Login 组件单元测试
 *
 * 测试覆盖：
 * 1. 首次访问密码设置界面
 * 2. 普通用户登录界面
 * 3. 管理员登录界面
 * 4. 密码验证
 * 5. 错误处理
 * 6. 加载状态
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountWithPinia, waitForDOMUpdate } from './test-utils';
import Login from '../Login.vue';
import { useAuthStore } from '../../stores/auth';

describe('Login', () => {
  let wrapper: ReturnType<typeof mountWithPinia>;
  let authStore: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    wrapper = mountWithPinia(Login);
    authStore = useAuthStore();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('1. 首次访问（设置密码）', () => {
    it('应该在首次访问时显示设置密码界面', async () => {
      authStore.isFirstVisit = true;
      authStore.isAuthenticated = false;

      await waitForDOMUpdate();

      const title = wrapper.find('.login-title');
      expect(title.text()).toContain('设置密码');
    });

    it('应该显示设置密码表单', async () => {
      authStore.isFirstVisit = true;

      await waitForDOMUpdate();

      const passwordInput = wrapper.find('input[type="password"]');
      expect(passwordInput.exists()).toBe(true);

      const submitBtn = wrapper.find('.login-btn');
      expect(submitBtn.text()).toContain('设置密码');
    });

    it('应该调用setPassword方法', async () => {
      authStore.isFirstVisit = true;
      const setPasswordSpy = vi.spyOn(authStore, 'setPassword').mockResolvedValue(true);

      await waitForDOMUpdate();

      const passwordInputs = wrapper.findAll('input[type="password"]');
      await passwordInputs[0].setValue('test1234');
      await passwordInputs[1].setValue('test1234');

      const submitBtn = wrapper.find('.login-btn');
      await submitBtn.trigger('click');

      expect(setPasswordSpy).toHaveBeenCalledWith('test1234');
    });

    it('应该验证密码最小长度', async () => {
      authStore.isFirstVisit = true;
      const setPasswordSpy = vi.spyOn(authStore, 'setPassword');

      await waitForDOMUpdate();

      const passwordInputs = wrapper.findAll('input[type="password"]');
      await passwordInputs[0].setValue('123');
      await passwordInputs[1].setValue('123');

      const submitBtn = wrapper.find('.login-btn');
      await submitBtn.trigger('click');

      // 不应该调用 setPassword
      expect(setPasswordSpy).not.toHaveBeenCalled();
    });
  });

  describe('2. 普通用户登录', () => {
    it('应该在非首次访问时显示登录界面', async () => {
      authStore.isFirstVisit = false;
      authStore.isAuthenticated = false;

      await waitForDOMUpdate();

      const title = wrapper.find('.login-title');
      expect(title.text()).toContain('请输入密码');
    });

    it('应该显示密码输入框和登录按钮', async () => {
      authStore.isFirstVisit = false;

      await waitForDOMUpdate();

      const passwordInput = wrapper.find('input[type="password"]');
      expect(passwordInput.exists()).toBe(true);

      const submitBtn = wrapper.find('.login-btn');
      expect(submitBtn.text()).toContain('登录');
    });

    it('应该调用verifyPassword方法', async () => {
      authStore.isFirstVisit = false;
      const verifyPasswordSpy = vi.spyOn(authStore, 'verifyPassword').mockResolvedValue(true);

      await waitForDOMUpdate();

      const passwordInput = wrapper.find('input[type="password"]');
      await passwordInput.setValue('user1234');

      const submitBtn = wrapper.find('.login-btn');
      await submitBtn.trigger('click');

      expect(verifyPasswordSpy).toHaveBeenCalledWith('user1234');
    });
  });

  describe('3. 管理员登录', () => {
    it('应该显示管理员密码输入提示', async () => {
      authStore.isFirstVisit = false;
      authStore.error = '请输入管理员密码';

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-message');
      expect(errorMsg.text()).toContain('管理员密码');
    });
  });

  describe('4. 成功状态', () => {
    it('应该在认证成功后显示欢迎信息', async () => {
      authStore.isAuthenticated = true;

      await waitForDOMUpdate();

      const welcomeMsg = wrapper.find('.welcome-message');
      expect(welcomeMsg.exists()).toBe(true);
    });
  });

  describe('5. 错误处理', () => {
    it('应该在密码错误时显示错误信息', async () => {
      authStore.isFirstVisit = false;
      authStore.error = '密码错误';
      authStore.isLoading = false;

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-message');
      expect(errorMsg.text()).toBe('密码错误');
    });

    it('应该在密码长度不足时显示错误', async () => {
      authStore.isFirstVisit = true;
      authStore.error = '密码长度至少4位';

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-message');
      expect(errorMsg.text()).toContain('4');
    });

    it('应该在网络错误时显示错误信息', async () => {
      authStore.isFirstVisit = false;
      authStore.error = '网络错误，验证失败';
      authStore.isNetworkError = true;

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-message');
      expect(errorMsg.text()).toContain('网络');
    });

    it('应该在有错误时显示错误样式', async () => {
      authStore.isFirstVisit = false;
      authStore.error = '密码错误';

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-message.error');
      expect(errorMsg.exists()).toBe(true);
    });
  });

  describe('6. 加载状态', () => {
    it('应该在加载时禁用登录按钮', async () => {
      authStore.isFirstVisit = false;
      authStore.isLoading = true;

      await waitForDOMUpdate();

      const submitBtn = wrapper.find('.login-btn');
      expect((submitBtn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('应该在加载时显示加载状态', async () => {
      authStore.isFirstVisit = false;
      authStore.isLoading = true;

      await waitForDOMUpdate();

      const loadingSpinner = wrapper.find('.loading-spinner');
      expect(loadingSpinner.exists()).toBe(true);
    });
  });

  describe('7. 键盘事件', () => {
    it('应该在按Enter键时提交表单', async () => {
      authStore.isFirstVisit = false;
      const verifyPasswordSpy = vi.spyOn(authStore, 'verifyPassword').mockResolvedValue(true);

      await waitForDOMUpdate();

      const passwordInput = wrapper.find('input[type="password"]');
      await passwordInput.setValue('user1234');
      await passwordInput.trigger('keyup.enter');

      expect(verifyPasswordSpy).toHaveBeenCalledWith('user1234');
    });

    it('应该在按Escape键时清除错误', async () => {
      authStore.isFirstVisit = false;
      authStore.error = '密码错误';
      const clearErrorSpy = vi.spyOn(authStore, 'clearError').mockReturnValue(undefined);

      await waitForDOMUpdate();

      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));

      expect(clearErrorSpy).toHaveBeenCalled();
    });
  });

  describe('8. AuthStore集成', () => {
    it('应该正确响应store状态变化', async () => {
      // 初始状态
      expect(wrapper.find('.login-container').exists()).toBe(true);

      // 设置首次访问
      authStore.isFirstVisit = true;
      await waitForDOMUpdate();
      expect(wrapper.find('.login-title').text()).toContain('设置密码');

      // 认证成功
      authStore.isAuthenticated = true;
      await waitForDOMUpdate();
      expect(wrapper.find('.welcome-message').exists()).toBe(true);
    });
  });

  describe('9. 输入验证', () => {
    it('应该验证密码不能为空', async () => {
      authStore.isFirstVisit = false;

      await waitForDOMUpdate();

      const passwordInput = wrapper.find('input[type="password"]');
      await passwordInput.setValue('');

      const submitBtn = wrapper.find('.login-btn');
      await submitBtn.trigger('click');

      // 空密码不应该调用验证
      expect(authStore.error).toBe('请输入密码');
    });

    it('应该验证密码最小长度为4位', async () => {
      authStore.isFirstVisit = true;

      await waitForDOMUpdate();

      const passwordInput = wrapper.find('input[type="password"]');
      await passwordInput.setValue('123');

      const submitBtn = wrapper.find('.login-btn');
      await submitBtn.trigger('click');

      expect(authStore.error).toBe('密码长度至少4位');
    });
  });

  describe('10. 边界条件', () => {
    it('应该处理非常长的密码', async () => {
      authStore.isFirstVisit = false;
      const verifyPasswordSpy = vi.spyOn(authStore, 'verifyPassword').mockResolvedValue(true);

      await waitForDOMUpdate();

      const passwordInput = wrapper.find('input[type="password"]');
      await passwordInput.setValue('a'.repeat(100));

      const submitBtn = wrapper.find('.login-btn');
      await submitBtn.trigger('click');

      expect(verifyPasswordSpy).toHaveBeenCalledWith('a'.repeat(100));
    });

    it('应该处理包含特殊字符的密码', async () => {
      authStore.isFirstVisit = false;
      const verifyPasswordSpy = vi.spyOn(authStore, 'verifyPassword').mockResolvedValue(true);

      await waitForDOMUpdate();

      const passwordInput = wrapper.find('input[type="password"]');
      await passwordInput.setValue('pass@#$%1234');

      const submitBtn = wrapper.find('.login-btn');
      await submitBtn.trigger('click');

      expect(verifyPasswordSpy).toHaveBeenCalledWith('pass@#$%1234');
    });
  });
});

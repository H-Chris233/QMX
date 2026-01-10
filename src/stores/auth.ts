import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { AuthApiService } from '../api/authApi';

/**
 * 简单密码认证状态管理
 * - 管理员密码通过环境变量 QMX_ADMIN_PASSWORD_HASH 设置（bcrypt哈希）
 * - 普通用户密码存储在后端数据库（bcrypt哈希）
 * - 管理员和普通用户权限相同
 * - 强制后端验证，不能绕过前端安全检查
 */
export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref<boolean>(false);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const isFirstVisit = ref<boolean>(false);
  const isAdmin = ref<boolean>(false);

  // 管理员密码哈希（环境变量）
  const adminPasswordHash = import.meta.env.VITE_ADMIN_PASSWORD_HASH || '';

  // Getters
  const hasPassword = computed(() => !isFirstVisit.value);
  const isNetworkError = computed(() =>
    error.value?.includes('网络错误') || error.value?.includes('无法连接')
  );

  // Actions

  /**
   * 获取密码状态（后端）
   */
  async function fetchStatus(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const status = await AuthApiService.getStatus();
      isFirstVisit.value = status.isFirstVisit;
      isAdmin.value = status.adminConfigured;

      // 如果是首次访问，不需要认证
      if (status.isFirstVisit) {
        isAuthenticated.value = false;
      }
      // 如果有管理员密码，尝试验证
      else if (adminPasswordHash) {
        // 提示用户需要输入管理员密码
        error.value = '请输入管理员密码';
      }
      // 否则等待用户输入密码
    } catch (e) {
      error.value = '无法连接到服务器，请检查网络连接';
      // 后端不可用且不是首次访问，无法登录
      if (!adminPasswordHash) {
        isFirstVisit.value = true;
      }
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 设置站点密码（第一次访问时）- 后端存储
   */
  async function setPassword(password: string): Promise<boolean> {
    if (!password || password.length < 4) {
      error.value = '密码长度至少4位';
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const result = await AuthApiService.setupPassword(password);
      if (result.success) {
        // 密码设置成功后自动登录
        isAuthenticated.value = true;
        isFirstVisit.value = false;
        isAdmin.value = false;
        return true;
      }
      error.value = result.error || '设置密码失败';
      return false;
    } catch (e) {
      error.value = '网络错误，设置失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 验证密码（强制后端验证）
   */
  async function verifyPassword(password: string): Promise<boolean> {
    if (!password) {
      error.value = '请输入密码';
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // 优先尝试验证管理员密码
      if (adminPasswordHash) {
        const adminResult = await AuthApiService.verifyPassword(password);
        if (adminResult.success) {
          isAuthenticated.value = true;
          isAdmin.value = true;
          return true;
        }
        // 管理员密码验证失败，不提示，继续尝试普通密码
      }

      // 后端验证普通用户密码
      const result = await AuthApiService.verifyPassword(password);
      if (result.success) {
        isAuthenticated.value = true;
        isAdmin.value = result.data?.isAdmin || false;
        return true;
      }

      error.value = result.error || '密码错误';
      return false;
    } catch (e) {
      error.value = '网络错误，验证失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 登出
   */
  function logout() {
    isAuthenticated.value = false;
    isAdmin.value = false;
    error.value = null;
  }

  /**
   * 清除错误信息
   */
  function clearError() {
    error.value = null;
  }

  return {
    // State
    isAuthenticated,
    isLoading,
    error,
    isFirstVisit,
    isAdmin,

    // Getters
    hasPassword,
    isNetworkError,

    // Actions
    fetchStatus,
    setPassword,
    verifyPassword,
    logout,
    clearError,
  };
});

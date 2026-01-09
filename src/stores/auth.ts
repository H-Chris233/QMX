import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { AuthApiService } from '../api/authApi';

const STORAGE_KEY_PASSWORD = 'qmx_site_password';

/**
 * 简单密码认证状态管理
 * - 管理员密码通过环境变量 QMX_ADMIN_PASSWORD 设置
 * - 普通用户密码第一次访问时设置，存储在后端数据库
 * - 管理员和普通用户权限相同
 */
export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref<boolean>(false);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const isFirstVisit = ref<boolean>(false);
  const isAdmin = ref<boolean>(false);

  // 管理员密码（环境变量）
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';

  // Getters
  const hasPassword = computed(() => !isFirstVisit.value);

  // Actions

  /**
   * 获取密码状态
   */
  async function fetchStatus(): Promise<void> {
    isLoading.value = true;
    try {
      const status = await AuthApiService.getStatus();
      isFirstVisit.value = status.isFirstVisit;
      isAdmin.value = status.adminConfigured;
      // 如果不是首次访问且有本地缓存的密码，尝试验证
      if (!status.isFirstVisit) {
        const cached = secureLocalStorage.getItem(STORAGE_KEY_PASSWORD);
        if (cached) {
          await verifyPassword(cached);
        }
      }
    } catch (e) {
      error.value = '获取密码状态失败';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 设置站点密码（第一次访问时）
   */
  async function setPassword(password: string): Promise<boolean> {
    if (!password || password.length < 4) {
      error.value = '密码长度至少4位';
      return false;
    }

    isLoading.value = true;
    try {
      const result = await AuthApiService.setupPassword(password);
      if (result.success) {
        // 保存到本地缓存
        secureLocalStorage.setItem(STORAGE_KEY_PASSWORD, password);
        isAuthenticated.value = true;
        isFirstVisit.value = false;
        error.value = null;
        return true;
      }
      error.value = result.error || '设置密码失败';
      return false;
    } catch (e) {
      error.value = '设置密码失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 验证密码
   */
  async function verifyPassword(password: string): Promise<boolean> {
    if (!password) {
      error.value = '请输入密码';
      return false;
    }

    // 优先验证环境变量中的管理员密码
    if (adminPassword && password === adminPassword) {
      isAuthenticated.value = true;
      isAdmin.value = true;
      error.value = null;
      return true;
    }

    isLoading.value = true;
    try {
      const result = await AuthApiService.verifyPassword(password);
      if (result.success) {
        // 保存到本地缓存
        secureLocalStorage.setItem(STORAGE_KEY_PASSWORD, password);
        isAuthenticated.value = true;
        isAdmin.value = result.data?.isAdmin || false;
        error.value = null;
        return true;
      }
      error.value = result.error || '密码错误';
      return false;
    } catch (e) {
      // 离线模式：回退到本地验证
      const stored = secureLocalStorage.getItem(STORAGE_KEY_PASSWORD);
      if (stored && password === stored) {
        isAuthenticated.value = true;
        error.value = null;
        return true;
      }
      error.value = '密码错误或网络连接失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 登出（清除本地认证状态）
   */
  function logout() {
    isAuthenticated.value = false;
    error.value = null;
  }

  /**
   * 更改密码
   */
  async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    if (newPassword.length < 4) {
      error.value = '新密码长度至少4位';
      return false;
    }

    isLoading.value = true;
    try {
      const result = await AuthApiService.changePassword(oldPassword, newPassword);
      if (result.success) {
        secureLocalStorage.setItem(STORAGE_KEY_PASSWORD, newPassword);
        error.value = null;
        return true;
      }
      error.value = result.error || '更改密码失败';
      return false;
    } catch (e) {
      error.value = '更改密码失败';
      return false;
    } finally {
      isLoading.value = false;
    }
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

    // Actions
    fetchStatus,
    setPassword,
    verifyPassword,
    logout,
    changePassword,
    clearError,
  };
});

// 安全存储工具
function secureLocalStorageGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function secureLocalStorageSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// 重新定义安全的 localStorage（解决循环依赖问题）
const secureLocalStorage = {
  getItem: secureLocalStorageGetItem,
  setItem: secureLocalStorageSetItem,
};

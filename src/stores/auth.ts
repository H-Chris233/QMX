import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { ApiService } from '../api/ApiService';
import { storeActionWrapper, StoreActionPresets } from '../utils/storeErrorHandling';
import type { LoginCredentials, User, LoginResponse } from '../types/api';

/**
 * 用户认证状态管理
 * 负责用户登录、权限验证、会话管理等功能
 */
export const useAuthStore = defineStore('auth', () => {
  // State - 使用shallowRef优化性能
  const user = shallowRef<User | null>(null);
  const token = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const isLoading = ref<boolean>(false);
  const loginAttempts = ref<number>(0);
  const lastLoginAttempt = ref<Date | null>(null);

  // Local storage keys
  const STORAGE_KEYS = {
    TOKEN: 'qmx_auth_token',
    REFRESH_TOKEN: 'qmx_refresh_token',
    USER: 'qmx_user_data',
    REMEMBER_ME: 'qmx_remember_me'
  };

  // Getters
  const isAuthenticated = computed(() => {
    return !!token.value && !!user.value;
  });

  const hasRole = computed(() => {
    return (role: string) => {
      return user.value?.role === role || user.value?.permissions.includes(role);
    };
  });

  const hasPermission = computed(() => {
    return (permission: string): boolean => {
      return user.value?.permissions.includes(permission) || false;
    };
  });

  const isAdmin = computed(() => {
    return hasRole.value('admin') || hasRole.value('superadmin');
  });

  const canManageStudents = computed(() => {
    return hasPermission.value('students:manage') || isAdmin.value;
  });

  const canManageTransactions = computed(() => {
    return hasPermission.value('transactions:manage') || isAdmin.value;
  });

  const canViewReports = computed(() => {
    return hasPermission.value('reports:view') || isAdmin.value;
  });

  const isLoginBlocked = computed(() => {
    // 防止暴力破解：5次失败后锁定30分钟
    if (loginAttempts.value >= 5 && lastLoginAttempt.value) {
      const timeDiff = Date.now() - lastLoginAttempt.value.getTime();
      return timeDiff < 30 * 60 * 1000; // 30分钟
    }
    return false;
  });

  const remainingBlockTime = computed(() => {
    if (isLoginBlocked.value && lastLoginAttempt.value) {
      const timeDiff = Date.now() - lastLoginAttempt.value.getTime();
      const remaining = 30 * 60 * 1000 - timeDiff;
      return Math.max(0, Math.ceil(remaining / 1000)); // 返回秒数
    }
    return 0;
  });

  // Actions

  /**
   * 初始化认证状态
   */
  function initAuth() {
    try {
      const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const savedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (savedToken && savedUser) {
        token.value = savedToken;
        refreshToken.value = savedRefreshToken;
        user.value = JSON.parse(savedUser);

        // 验证token有效性（这里可以添加token过期检查）
        return true;
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      clearAuth();
    }
    return false;
  }

  /**
   * 用户登录 - 使用API服务
   */
  async function login(credentials: LoginCredentials) {
    if (isLoginBlocked.value) {
      throw new Error(`登录尝试过于频繁，请等待${remainingBlockTime.value}秒后重试`);
    }

    isLoading.value = true;

    try {
      const response = await storeActionWrapper(
        () => ApiService.login(credentials),
        {
          ...StoreActionPresets.create('用户登录'),
          context: { username: credentials.username },
          retryable: false
        }
      );

      // 保存认证信息
      token.value = response.token;
      refreshToken.value = response.refreshToken;
      user.value = response.user;

      // 保存到本地存储
      if (credentials.rememberMe) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      } else {
        sessionStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
        sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      }

      // 重置登录尝试计数
      loginAttempts.value = 0;
      lastLoginAttempt.value = null;

      return response.user;

    } catch (error) {
      // 增加失败计数
      loginAttempts.value++;
      lastLoginAttempt.value = new Date();
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 用户登出 - 使用API服务
   */
  async function logout() {
    try {
      await storeActionWrapper(
        () => ApiService.logout(),
        {
          operationName: '用户登出',
          retryable: false,
          throwOnError: false // 登出失败不影响本地清理
        }
      );
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      clearAuth();
    }
  }

  /**
   * 刷新Token - 使用API服务
   */
  async function refreshAuthToken() {
    if (!refreshToken.value) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await storeActionWrapper(
        () => ApiService.refreshToken(refreshToken.value!),
        {
          ...StoreActionPresets.fetch('刷新Token'),
          context: { token: '***' },
          retryable: true
        }
      );

      token.value = response.token;
      refreshToken.value = response.refreshToken;

      // 更新本地存储
      updateStorageTokens(response.token, response.refreshToken);

      return response.token;
    } catch (error) {
      // 刷新失败，清除认证状态
      clearAuth();
      throw error;
    }
  }

  /**
   * 更新用户信息 - 同步到服务器和本地
   */
  async function updateUser(userData: Partial<User>) {
    if (!user.value) return;

    return storeActionWrapper(async () => {
      const updatedUser = await ApiService.updateUser(userData);

      // 更新本地状态
      user.value = updatedUser;
      updateStorageUser(updatedUser);

      return updatedUser;
    }, {
      ...StoreActionPresets.update('用户信息'),
      context: { userData }
    });
  }

  /**
   * 检查权限
   */
  function checkPermission(permission: string): boolean {
    return hasPermission.value(permission);
  }

  /**
   * 检查角色
   */
  function checkRole(role: string): boolean {
    const checker = hasRole.value;
    return checker(role) ?? false;
  }

  /**
   * 清除认证状态
   */
  function clearAuth() {
    user.value = null;
    token.value = null;
    refreshToken.value = null;
    loginAttempts.value = 0;
    lastLoginAttempt.value = null;

    // 清除本地存储
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);

    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  }

  /**
   * 更新本地存储中的token
   */
  function updateStorageTokens(token: string, refreshToken: string) {
    const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } else {
      sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
      sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  /**
   * 更新本地存储中的用户信息
   */
  function updateStorageUser(userData: User) {
    const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    } else {
      sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    }
  }

  /**
   * 获取Authorization Header
   */
  function getAuthHeader() {
    return token.value ? `Bearer ${token.value}` : null;
  }

  return {
    // State
    user,
    token,
    refreshToken,
    isLoading,
    loginAttempts,
    lastLoginAttempt,

    // Getters
    isAuthenticated,
    hasRole,
    hasPermission,
    isAdmin,
    canManageStudents,
    canManageTransactions,
    canViewReports,
    isLoginBlocked,
    remainingBlockTime,

    // Actions
    initAuth,
    login,
    logout,
    refreshAuthToken,
    updateUser,
    checkPermission,
    checkRole,
    clearAuth,
    getAuthHeader
  };
});
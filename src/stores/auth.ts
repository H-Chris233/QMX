import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { ApiService } from '../api/ApiService';
import { storeActionWrapper, StoreActionPresets } from '../utils/storeErrorHandling';
import { secureLocalStorage, secureSessionStorage } from '../utils/secureStorage';
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

  // Getters - 临时禁用认证检查，开发阶段直接返回true
  const isAuthenticated = computed(() => {
    // 临时禁用：开发阶段直接返回true，避免后端认证API未实现的问题
    if (import.meta.env.DEV) {
      return true;
    }
    return !!token.value && !!user.value;
  });

  const hasRole = computed(() => {
    return (role: string) => {
      // 开发阶段默认返回true，避免权限检查问题
      if (import.meta.env.DEV) {
        return true;
      }
      return user.value?.role === role || user.value?.permissions.includes(role);
    };
  });

  const hasPermission = computed(() => {
    return (permission: string): boolean => {
      // 开发阶段默认返回true，避免权限检查问题
      if (import.meta.env.DEV) {
        return true;
      }
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
   * 初始化认证状态 - 使用安全存储
   */
  function initAuth() {
    try {
      const rememberMe = secureLocalStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
      const storage = rememberMe ? secureLocalStorage : secureSessionStorage;

      const savedToken = storage.getItem(STORAGE_KEYS.TOKEN);
      const savedUser = storage.getItem(STORAGE_KEYS.USER);
      const savedRefreshToken = storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

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

      // 使用安全存储保存到本地
      if (credentials.rememberMe) {
        secureLocalStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        secureLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
        secureLocalStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
        secureLocalStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      } else {
        secureSessionStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
        secureSessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
        secureSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
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
   * 清除认证状态 - 使用安全存储清除
   */
  function clearAuth() {
    user.value = null;
    token.value = null;
    refreshToken.value = null;
    loginAttempts.value = 0;
    lastLoginAttempt.value = null;

    // 清除所有安全存储
    secureLocalStorage.removeItem(STORAGE_KEYS.TOKEN);
    secureLocalStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    secureLocalStorage.removeItem(STORAGE_KEYS.USER);
    secureLocalStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);

    secureSessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    secureSessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    secureSessionStorage.removeItem(STORAGE_KEYS.USER);
  }

  /**
   * 更新安全存储中的token
   */
  function updateStorageTokens(token: string, refreshToken: string) {
    const rememberMe = secureLocalStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';

    if (rememberMe) {
      secureLocalStorage.setItem(STORAGE_KEYS.TOKEN, token);
      secureLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } else {
      secureSessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
      secureSessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  /**
   * 更新安全存储中的用户信息
   */
  function updateStorageUser(userData: User) {
    const rememberMe = secureLocalStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';

    if (rememberMe) {
      secureLocalStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    } else {
      secureSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
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
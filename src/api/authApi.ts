/**
 * 认证API服务
 * 处理用户登录、注册、token管理等认证相关操作
 */
import { baseClient, apiCall } from './baseClient';
import { apiCache } from './cacheManager';
import type {
  LoginCredentials,
  User,
  LoginResponse,
  RefreshTokenResponse,
  RegisterData,
  ChangePasswordData,
  ResetPasswordRequestData,
  ResetPasswordConfirmData,
  UserSession,
  Permission,
  Role,
  TwoFactorSetupResponse,
  TwoFactorConfirmResponse
} from '../types/api';

/**
 * 认证API服务类
 */
export class AuthApiService {
  /**
   * 用户登录
   */
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiCall(
      baseClient.post('/auth/login', credentials),
      '/auth/login',
      { username: credentials.username },
      false // 不缓存登录请求
    );
  }

  /**
   * 用户登出
   */
  static async logout(): Promise<void> {
    return apiCall(
      baseClient.post('/auth/logout'),
      '/auth/logout',
      {},
      false
    );
  }

  /**
   * 刷新访问令牌
   */
  static async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return apiCall(
      baseClient.post('/auth/refresh', { refreshToken }),
      '/auth/refresh',
      { refreshToken },
      false // 不缓存token刷新请求
    );
  }

  /**
   * 注册新用户
   */
  static async register(userData: RegisterData): Promise<User> {
    return apiCall(
      baseClient.post('/auth/register', userData),
      '/auth/register',
      { username: userData.username },
      false
    );
  }

  /**
   * 获取当前用户信息
   */
  static async getCurrentUser(): Promise<User> {
    return apiCall(
      baseClient.get('/auth/me'),
      '/auth/me',
      {},
      false
    );
  }

  /**
   * 更新用户信息
   */
  static async updateUser(userData: Partial<User>): Promise<User> {
    return apiCall(
      baseClient.put('/auth/me', userData),
      '/auth/me',
      userData,
      false
    );
  }

  /**
   * 修改密码
   */
  static async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    return apiCall(
      baseClient.put('/auth/password', data),
      '/auth/password',
      {},
      false
    );
  }

  /**
   * 重置密码请求
   */
  static async requestPasswordReset(email: string): Promise<void> {
    return apiCall(
      baseClient.post('/auth/password/reset-request', { email }),
      '/auth/password/reset-request',
      { email },
      false
    );
  }

  /**
   * 重置密码确认
   */
  static async confirmPasswordReset(data: {
    token: string;
    newPassword: string;
  }): Promise<void> {
    return apiCall(
      baseClient.post('/auth/password/reset-confirm', data),
      '/auth/password/reset-confirm',
      { token: data.token },
      false
    );
  }

  /**
   * 验证邮箱
   */
  static async verifyEmail(token: string): Promise<void> {
    return apiCall(
      baseClient.post('/auth/verify-email', { token }),
      '/auth/verify-email',
      { token },
      false
    );
  }

  /**
   * 检查用户名是否可用
   */
  static async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    return apiCall(
      baseClient.get(`/auth/check-username/${encodeURIComponent(username)}`),
      '/auth/check-username',
      { username },
      false
    );
  }

  /**
   * 检查邮箱是否可用
   */
  static async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    return apiCall(
      baseClient.get(`/auth/check-email/${encodeURIComponent(email)}`),
      '/auth/check-email',
      { email },
      false
    );
  }

  /**
   * 启用双因素认证
   */
  static async enableTwoFactor(): Promise<{ secret: string; qrCode: string }> {
    return apiCall(
      baseClient.post('/auth/2fa/enable'),
      '/auth/2fa/enable',
      {},
      false
    );
  }

  /**
   * 确认双因素认证
   */
  static async confirmTwoFactor(token: string): Promise<{ backupCodes: string[] }> {
    return apiCall(
      baseClient.post('/auth/2fa/confirm', { token }),
      '/auth/2fa/confirm',
      { token },
      false
    );
  }

  /**
   * 禁用双因素认证
   */
  static async disableTwoFactor(password: string): Promise<void> {
    return apiCall(
      baseClient.post('/auth/2fa/disable', { password }),
      '/auth/2fa/disable',
      {},
      false
    );
  }

  /**
   * 验证双因素认证码
   */
  static async verifyTwoFactor(token: string): Promise<void> {
    return apiCall(
      baseClient.post('/auth/2fa/verify', { token }),
      '/auth/2fa/verify',
      { token },
      false
    );
  }

  /**
   * 获取用户会话列表
   */
  static async getSessions(): Promise<Array<{
    id: string;
    device: string;
    ip: string;
    location: string;
    lastActivity: string;
    current: boolean;
  }>> {
    return apiCall(
      baseClient.get('/auth/sessions'),
      '/auth/sessions',
      {},
      true // 缓存会话列表
    );
  }

  /**
   * 撤销特定会话
   */
  static async revokeSession(sessionId: string): Promise<void> {
    return apiCall(
      baseClient.delete(`/auth/sessions/${sessionId}`),
      `/auth/sessions/${sessionId}`,
      { sessionId },
      false
    );
  }

  /**
   * 撤销所有其他会话
   */
  static async revokeAllOtherSessions(): Promise<void> {
    return apiCall(
      baseClient.delete('/auth/sessions/others'),
      '/auth/sessions/others',
      {},
      false
    );
  }

  /**
   * 获取权限列表
   */
  static async getPermissions(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
  }>> {
    return apiCall(
      baseClient.get('/auth/permissions'),
      '/auth/permissions',
      {},
      true // 缓存权限列表
    );
  }

  /**
   * 获取角色列表
   */
  static async getRoles(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    permissions: string[];
  }>> {
    return apiCall(
      baseClient.get('/auth/roles'),
      '/auth/roles',
      {},
      true // 缓存角色列表
    );
  }

  /**
   * 清除认证相关的缓存
   */
  static clearAuthCache(): void {
    apiCache.deleteByPrefix('/auth');
  }

  /**
   * 清除用户信息缓存（用于更新用户信息后）
   */
  static clearUserCache(): void {
    apiCache.delete('/auth/me');
    apiCache.delete('/auth/sessions');
  }
}
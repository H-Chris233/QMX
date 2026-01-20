/**
 * 简单密码认证 API 服务
 */
import { baseClient, ApiError } from './baseClient';

export interface AuthStatus {
  hasPassword: boolean;
  isFirstVisit: boolean;
  adminConfigured: boolean;
}

export interface AuthResponse {
  success: boolean;
  data?: { isAdmin: boolean };
  error?: string;
}

const normalizeAuthError = (error: unknown): AuthResponse | null => {
  if (error instanceof ApiError) {
    const details = error.details as { error?: string; message?: string } | undefined;
    const message = details?.error || details?.message || error.message || '认证失败';
    return { success: false, error: message };
  }

  return null;
};

/**
 * 认证 API 服务类
 */
export class AuthApiService {
  /**
   * 获取密码状态
   */
  static async getStatus(): Promise<AuthStatus> {
    const response = await baseClient.get<{ success: boolean; data: AuthStatus }>('/auth/status');
    return response.data.data;
  }

  /**
   * 设置站点密码（第一次访问时）
   */
  static async setupPassword(password: string): Promise<AuthResponse> {
    try {
      const response = await baseClient.post<AuthResponse>('/auth/setup', { password });
      return response.data;
    } catch (error) {
      const normalized = normalizeAuthError(error);
      if (normalized) return normalized;
      throw error;
    }
  }

  /**
   * 验证密码
   */
  static async verifyPassword(password: string): Promise<AuthResponse> {
    try {
      const response = await baseClient.post<AuthResponse>('/auth/verify', { password });
      return response.data;
    } catch (error) {
      const normalized = normalizeAuthError(error);
      if (normalized) return normalized;
      throw error;
    }
  }

  /**
   * 更改密码
   */
  static async changePassword(oldPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const response = await baseClient.post<AuthResponse>('/auth/change', {
        oldPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      const normalized = normalizeAuthError(error);
      if (normalized) return normalized;
      throw error;
    }
  }
}

/**
 * 适配器 API 服务
 * 提供对不同数据库适配器的访问
 */
import { baseClient, apiCall } from './baseClient';
import type { Student, Transaction, FinancialStats } from '../types/api';

/**
 * 健康状态类型
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  database: string;
  connected: boolean;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * 适配器信息类型
 */
export interface AdapterInfo {
  adapter_version: string;
  supported_databases: string[];
  features: Record<string, string>;
  endpoints: Record<string, any>;
}

/**
 * 适配器 API 服务类
 */
export class AdapterApiService {
  /**
   * 获取学员列表（通过适配器）
   */
  static async getStudents(params?: Record<string, any>): Promise<Student[]> {
    return apiCall<Student[]>(
      baseClient.get('/adapter/students', { params })
    );
  }

  /**
   * 添加学员（通过适配器）
   */
  static async addStudent(student: Partial<Student>): Promise<Student> {
    return apiCall<Student>(
      baseClient.post('/adapter/students', student)
    );
  }

  /**
   * 获取交易列表（通过适配器）
   */
  static async getTransactions(params?: Record<string, any>): Promise<Transaction[]> {
    return apiCall<Transaction[]>(
      baseClient.get('/adapter/transactions', { params })
    );
  }

  /**
   * 获取财务统计（通过适配器）
   */
  static async getFinancialStats(params?: {
    period?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<FinancialStats> {
    return apiCall<FinancialStats>(
      baseClient.get('/adapter/financial-stats', { params })
    );
  }

  /**
   * 获取数据库健康状态
   */
  static async getHealthStatus(): Promise<HealthStatus> {
    return apiCall<HealthStatus>(
      baseClient.get('/adapter/health')
    );
  }

  /**
   * 获取适配器信息
   */
  static async getAdapterInfo(): Promise<AdapterInfo> {
    return apiCall<AdapterInfo>(
      baseClient.get('/adapter/info')
    );
  }
}

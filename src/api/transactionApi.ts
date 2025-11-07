/**
 * 交易管理 API 服务
 */
import { baseClient, apiCall } from './baseClient';
import type {
  Transaction,
  TransactionCreateData,
  TransactionUpdateData,
  CashSearchOptions,
  PaginatedResponse,
} from '../types/api';

/**
 * 查询参数序列化助手
 */
function serializeParams(params: Record<string, any>): Record<string, string> {
  const serialized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      serialized[key] = String(value);
    }
  }
  
  return serialized;
}

/**
 * 交易列表响应类型
 */
export interface TransactionListResponse {
  items: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * 交易 API 服务类
 */
export class TransactionApiService {
  /**
   * 获取所有交易（支持分页和搜索）
   */
  static async getAllTransactions(params?: CashSearchOptions): Promise<TransactionListResponse> {
    const queryParams = params ? serializeParams(params) : {};
    
    const response = await baseClient.get<PaginatedResponse<Transaction>>('/transactions', {
      params: queryParams,
    });

    // 解包分页数据
    return {
      items: response.data.data || [],
      pagination: response.data.pagination,
    };
  }

  /**
   * 搜索交易（返回数组）
   */
  static async searchTransactions(params: CashSearchOptions): Promise<Transaction[]> {
    const response = await this.getAllTransactions(params);
    return response.items;
  }

  /**
   * 根据 ID 获取交易信息
   */
  static async getTransactionById(uid: number): Promise<Transaction> {
    return apiCall<Transaction>(
      baseClient.get(`/transactions/${uid}`)
    );
  }

  /**
   * 更新交易信息
   */
  static async updateTransaction(uid: number, data: TransactionUpdateData): Promise<Transaction> {
    return apiCall<Transaction>(
      baseClient.put(`/transactions/${uid}`, data)
    );
  }

  /**
   * 新增普通交易（现金交易）
   */
  static async addCashTransaction(data: TransactionCreateData): Promise<Transaction> {
    const payload = {
      student_id: data.student_id,
      amount: data.amount,
      note: data.note || null,
    };

    return apiCall<Transaction>(
      baseClient.post('/transactions', payload)
    );
  }

  /**
   * 新增分期交易
   */
  static async addInstallmentTransaction(data: {
    student_id?: number | null;
    amount: number;
    note?: string | null;
    total_installments: number;
    frequency: string;
    custom_days?: number | null;
    start_date?: string;
  }): Promise<Transaction> {
    return apiCall<Transaction>(
      baseClient.post('/transactions/installment', data)
    );
  }

  /**
   * 删除交易
   */
  static async deleteTransaction(uid: number): Promise<void> {
    await apiCall<void>(
      baseClient.delete(`/transactions/${uid}`)
    );
  }

  /**
   * 搜索现金交易（兼容旧接口名称）
   */
  static async searchCash(params: CashSearchOptions): Promise<Transaction[]> {
    return this.searchTransactions(params);
  }

  /**
   * 删除现金交易（兼容旧接口名称）
   */
  static async deleteCashTransaction(uid: number): Promise<void> {
    return this.deleteTransaction(uid);
  }
}

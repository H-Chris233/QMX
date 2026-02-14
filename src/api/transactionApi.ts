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
import { toPaymentFrequency, toFrontendInstallmentStatus } from './paramMappers';

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

type RawSearchParams = CashSearchOptions & {
  studentId?: string | number | null;
  startDate?: string;
  endDate?: string;
  transactionType?: string;
};

function buildCashSearchParams(params?: RawSearchParams): Record<string, any> {
  if (!params) return {};

  const result: Record<string, any> = {
    page: params.page,
    limit: params.limit,
    min_amount: params.min_amount,
    max_amount: params.max_amount,
    is_income: params.is_income,
    sort_by: params.sort_by,
    sort_order: params.sort_order,
  };

  const studentId = params.student_id ?? params.studentId;
  if (studentId !== undefined && studentId !== null && String(studentId) !== '') {
    result.student_id = Number(studentId);
  }

  const dateFrom = params.date_from ?? params.startDate;
  if (dateFrom) result.date_from = dateFrom;
  const dateTo = params.date_to ?? params.endDate;
  if (dateTo) result.date_to = dateTo;

  if (params.has_installment !== undefined) {
    result.has_installment = params.has_installment;
  } else if (params.transactionType) {
    if (params.transactionType === 'installment') result.has_installment = true;
    if (params.transactionType === 'normal') result.has_installment = false;
  }

  return result;
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
  private static normalizeTransaction(transaction: Transaction): Transaction {
    const installment = transaction.installment;
    if (!installment || !installment.status) {
      return transaction;
    }

    return {
      ...transaction,
      installment: {
        ...installment,
        status: toFrontendInstallmentStatus(String(installment.status)) || installment.status,
      },
    };
  }
  /**
   * 获取所有交易（支持分页和搜索）
   */
  static async getAllTransactions(params?: CashSearchOptions): Promise<TransactionListResponse> {
    const queryParams = serializeParams(buildCashSearchParams(params as RawSearchParams));
    
    const response = await baseClient.get<PaginatedResponse<Transaction>>('/transactions', {
      params: queryParams,
    });

    const normalizedItems = (response.data.data || []).map((transaction) =>
      TransactionApiService.normalizeTransaction(transaction)
    );

    // 解包分页数据
    return {
      items: normalizedItems,
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
    const transaction = await apiCall<Transaction>(
      baseClient.get(`/transactions/${uid}`)
    );
    return TransactionApiService.normalizeTransaction(transaction);
  }

  /**
   * 更新交易信息
   */
  static async updateTransaction(uid: number, data: TransactionUpdateData): Promise<Transaction> {
    const transaction = await apiCall<Transaction>(
      baseClient.put(`/transactions/${uid}`, data)
    );
    return TransactionApiService.normalizeTransaction(transaction);
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

    const transaction = await apiCall<Transaction>(
      baseClient.post('/transactions', payload)
    );
    return TransactionApiService.normalizeTransaction(transaction);
  }

  /**
   * 新增分期交易
   */
  static async addInstallmentTransaction(data: {
    student_id?: number | null;
    total_amount: number;
    note?: string | null;
    total_installments: number;
    frequency: string;
    custom_days?: number | null;
    start_date: string;
    due_date: string;
  }): Promise<Transaction> {
    const payload = {
      ...data,
      frequency: toPaymentFrequency(data.frequency) || data.frequency,
    };

    const transaction = await apiCall<Transaction>(
      baseClient.post('/transactions/installment', payload)
    );
    return TransactionApiService.normalizeTransaction(transaction);
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

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Transaction,
  TransactionCreateData,
  TransactionUpdateData,
  TransactionSearchParams,
  CashSearchOptions,
  TransactionListResponse
} from '../types/api';
import { ApiService } from '../api/ApiService';
import { PaymentFrequency, InstallmentStatus } from '../types/api';

/**
 * 交易数据状态管理
 * 负责交易记录、财务数据的CRUD操作和缓存
 */
export const useTransactionStore = defineStore('transaction', () => {
  // State
  const transactions = ref<Transaction[]>([]);
  const currentTransaction = ref<Transaction | null>(null);
  const searchParams = ref<TransactionSearchParams>({
    page: 1,
    limit: 50,
    studentId: '',
    transactionType: '',
    startDate: undefined,
    endDate: undefined
  });

  const filterState = ref({
    transaction_type: '',
    student_name: '',
    installments_only: false,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined
  });

  const pagination = ref({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
    hasNextPage: false,
    hasPrevPage: false
  });

  const lastFetched = ref<Date | null>(null);
  const cacheExpiry = ref<number>(2 * 60 * 1000); // 2分钟缓存，交易数据变化频繁

  const selectedPeriod = ref<string>('ThisMonth');
  const showAddTransaction = ref<boolean>(false);
  const showUpdateStatus = ref<boolean>(false);
  const selectedStatus = ref<InstallmentStatus>(InstallmentStatus.PENDING);

  // Getters
  const transactionsById = computed(() => {
    const map = new Map<number, Transaction>();
    transactions.value.forEach(transaction => {
      map.set(transaction.uid, transaction);
    });
    return map;
  });

  const incomeTransactions = computed(() => {
    return transactions.value.filter(t => t.amount > 0);
  });

  const expenseTransactions = computed(() => {
    return transactions.value.filter(t => t.amount < 0);
  });

  const transactionsByStudent = computed(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.value.forEach(transaction => {
      const studentId = transaction.student_id || 'no_student';
      if (!groups[studentId]) {
        groups[studentId] = [];
      }
      groups[studentId].push(transaction);
    });
    return groups;
  });

  const transactionsByType = computed(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.value.forEach(transaction => {
      const type = transaction.is_installment ? 'installment' : 'normal';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(transaction);
    });
    return groups;
  });

  const installmentTransactions = computed(() => {
    return transactions.value.filter(t => t.is_installment);
  });

  const totalIncome = computed(() => {
    return incomeTransactions.value.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  });

  const totalExpense = computed(() => {
    return expenseTransactions.value.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  });

  const netProfit = computed(() => {
    return totalIncome.value - totalExpense.value;
  });

  const pendingInstallments = computed(() => {
    return transactions.value.filter(t =>
      t.is_installment && t.installment?.status === InstallmentStatus.PENDING
    ).length;
  });

  const currentSearchParams = computed(() => searchParams.value);

  const isCacheExpired = computed(() => {
    if (!lastFetched.value) return true;
    return Date.now() - lastFetched.value.getTime() > cacheExpiry.value;
  });

  // Actions

  /**
   * 获取交易列表
   */
  async function fetchTransactions(params?: Partial<TransactionSearchParams>, forceRefresh = false) {
    if (!forceRefresh && !isCacheExpired.value && !params) {
      return transactions.value;
    }

    try {
      const mergedParams = { ...searchParams.value, ...params };
      const response = await ApiService.getAllTransactions(mergedParams as CashSearchOptions);

      // TransactionListResponse直接包含transactions数组
      transactions.value = Array.isArray(response) ? response : (response as any).transactions || [];
      // 转换分页格式
      if (response.pagination) {
        pagination.value = {
          currentPage: response.pagination.page,
          totalPages: response.pagination.total_pages,
          totalItems: response.pagination.total,
          itemsPerPage: response.pagination.limit,
          hasNextPage: response.pagination.page < response.pagination.total_pages,
          hasPrevPage: response.pagination.page > 1
        };
      }
      searchParams.value = mergedParams;
      lastFetched.value = new Date();

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取单个交易详情
   */
  async function fetchTransactionById(id: number, forceRefresh = false) {
    // 检查缓存
    if (!forceRefresh) {
      const cached = transactionsById.value.get(id);
      if (cached && !isCacheExpired.value) {
        currentTransaction.value = cached;
        return cached;
      }
    }

    try {
      // 这里需要在ApiService中添加getTransactionById方法
      // const transaction = await ApiService.getTransactionById(id);

      // 临时实现：从现有数据中查找
      const transaction = transactionsById.value.get(id);
      if (!transaction) {
        throw new Error('交易记录不存在');
      }

      currentTransaction.value = transaction;
      return transaction;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 创建交易
   */
  async function createTransaction(data: TransactionCreateData) {
    try {
      const newTransaction = await ApiService.addCashTransaction(data);

      // 更新本地状态
      transactions.value.unshift(newTransaction);
      currentTransaction.value = newTransaction;

      return newTransaction;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新交易
   */
  async function updateTransaction(id: number, data: TransactionUpdateData) {
    try {
      // updateTransaction方法不存在，暂时注释
      // const updatedTransaction = await ApiService.updateTransaction(id, data);
      console.warn('updateTransaction API method not implemented yet');
      const updatedTransaction = transactions.value.find((t: Transaction) => t.uid === id)!;

      // 更新本地状态
      const index = transactions.value.findIndex((t: Transaction) => t.uid === id);
      if (index !== -1) {
        transactions.value[index] = updatedTransaction;
      }

      if (currentTransaction.value?.uid === id) {
        currentTransaction.value = updatedTransaction;
      }

      return updatedTransaction;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 删除交易
   */
  async function deleteTransaction(id: number) {
    try {
      await ApiService.deleteCashTransaction(id);

      // 更新本地状态
      transactions.value = transactions.value.filter(t => t.uid !== id);
      if (currentTransaction.value?.uid === id) {
        currentTransaction.value = null;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 搜索交易
   */
  async function searchTransactions(params: Partial<TransactionSearchParams>) {
    return fetchTransactions(params, true);
  }

  /**
   * 按学生ID获取交易
   */
  async function fetchTransactionsByStudent(studentId: string) {
    return fetchTransactions({ studentId });
  }

  /**
   * 设置当前交易
   */
  function setCurrentTransaction(transaction: Transaction | null) {
    currentTransaction.value = transaction;
  }

  /**
   * 更新搜索参数
   */
  function updateSearchParams(params: Partial<TransactionSearchParams>) {
    searchParams.value = { ...searchParams.value, ...params };
  }

  /**
   * 更新过滤状态
   */
  function updateFilterState(filters: Partial<typeof filterState.value>) {
    filterState.value = { ...filterState.value, ...filters };
  }

  /**
   * 重置搜索参数
   */
  function resetSearchParams() {
    searchParams.value = {
      page: 1,
      limit: 50,
      studentId: '',
      transactionType: '',
      startDate: undefined,
      endDate: undefined
    };
    filterState.value = {
      transaction_type: '',
      student_name: '',
      installments_only: false,
      start_date: undefined,
      end_date: undefined
    };
  }

  /**
   * 设置选中时间周期
   */
  function setSelectedPeriod(period: string) {
    selectedPeriod.value = period;

    // 根据周期更新搜索参数
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth() + 1, 0); // 月底

    switch (period) {
      case 'ThisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'LastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'ThisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'ThisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    updateSearchParams({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  }

  /**
   * 显示/隐藏添加交易表单
   */
  function toggleAddTransaction(show?: boolean) {
    showAddTransaction.value = show ?? !showAddTransaction.value;
    if (showAddTransaction.value) {
      currentTransaction.value = null;
    }
  }

  /**
   * 显示/隐藏状态更新表单
   */
  function toggleUpdateStatus(show?: boolean, transaction?: Transaction, status?: InstallmentStatus) {
    showUpdateStatus.value = show ?? !showUpdateStatus.value;
    if (transaction && status) {
      currentTransaction.value = transaction;
      selectedStatus.value = status;
    }
  }

  /**
   * 清空交易数据
   */
  function clearTransactions() {
    transactions.value = [];
    currentTransaction.value = null;
    lastFetched.value = null;
  }

  /**
   * 刷新数据
   */
  async function refresh() {
    const params = { ...searchParams.value };
    clearTransactions();
    return fetchTransactions(params, true);
  }

  return {
    // State
    transactions,
    currentTransaction,
    searchParams,
    filterState,
    pagination,
    lastFetched,
    selectedPeriod,
    showAddTransaction,
    showUpdateStatus,
    selectedStatus,

    // Getters
    transactionsById,
    incomeTransactions,
    expenseTransactions,
    transactionsByStudent,
    transactionsByType,
    installmentTransactions,
    totalIncome,
    totalExpense,
    netProfit,
    pendingInstallments,
    currentSearchParams,
    isCacheExpired,

    // Actions
    fetchTransactions,
    fetchTransactionById,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    searchTransactions,
    fetchTransactionsByStudent,
    setCurrentTransaction,
    updateSearchParams,
    updateFilterState,
    resetSearchParams,
    setSelectedPeriod,
    toggleAddTransaction,
    toggleUpdateStatus,
    clearTransactions,
    refresh
  };
});
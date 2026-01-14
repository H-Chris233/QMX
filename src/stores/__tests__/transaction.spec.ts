/**
 * Transaction Store 单元测试
 *
 * 测试覆盖：
 * 1. 状态初始化
 * 2. 交易列表获取
 * 3. 交易CRUD操作
 * 4. 搜索和过滤
 * 5. 分页计算
 * 6. Getters计算属性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTransactionStore } from '../transaction';
import { ApiService } from '../../api/ApiService';
import type { Transaction } from '../../types/api';
import { InstallmentStatus } from '../../types/api';

// Mock ApiService
vi.mock('../../api/ApiService', () => ({
  ApiService: {
    getAllTransactions: vi.fn(),
    getTransactionById: vi.fn(),
    addCashTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    deleteCashTransaction: vi.fn()
  }
}));

describe('useTransactionStore', () => {
  let pinia: ReturnType<typeof createPinia>;
  let store: ReturnType<typeof useTransactionStore>;

  const createTestPinia = () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    return pinia;
  };

  // 测试数据工厂函数
  const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
    uid: 1,
    student_id: 1,
    amount: 10000,
    note: '测试交易',
    transaction_type: 'INCOME',
    is_installment: false,
    installment: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides
  });

  beforeEach(() => {
    pinia = createTestPinia();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. 状态初始化', () => {
    it('应该正确初始化交易列表', () => {
      store = useTransactionStore();
      expect(store.transactions).toEqual([]);
      expect(store.currentTransaction).toBeNull();
    });

    it('应该正确初始化搜索参数', () => {
      store = useTransactionStore();
      expect(store.searchParams.page).toBe(1);
      expect(store.searchParams.limit).toBe(50);
    });

    it('应该正确初始化分页状态', () => {
      store = useTransactionStore();
      expect(store.pagination.currentPage).toBe(1);
      expect(store.pagination.totalItems).toBe(0);
    });
  });

  describe('2. Getters计算属性', () => {
    beforeEach(() => {
      store = useTransactionStore();
    });

    it('transactionsById 应该正确创建映射', () => {
      store.transactions = [
        createMockTransaction({ uid: 1 }),
        createMockTransaction({ uid: 2 })
      ];

      const map = store.transactionsById;
      expect(map.size).toBe(2);
      expect(map.get(1)?.uid).toBe(1);
      expect(map.get(2)?.uid).toBe(2);
    });

    it('incomeTransactions 应该只返回收入交易', () => {
      store.transactions = [
        createMockTransaction({ uid: 1, amount: 10000 }),
        createMockTransaction({ uid: 2, amount: -5000 }),
        createMockTransaction({ uid: 3, amount: 20000 })
      ];

      expect(store.incomeTransactions).toHaveLength(2);
      expect(store.incomeTransactions[0].amount).toBe(10000);
      expect(store.incomeTransactions[1].amount).toBe(20000);
    });

    it('expenseTransactions 应该只返回支出交易', () => {
      store.transactions = [
        createMockTransaction({ uid: 1, amount: 10000 }),
        createMockTransaction({ uid: 2, amount: -5000 }),
        createMockTransaction({ uid: 3, amount: -3000 })
      ];

      expect(store.expenseTransactions).toHaveLength(2);
      expect(store.expenseTransactions[0].amount).toBe(-5000);
      expect(store.expenseTransactions[1].amount).toBe(-3000);
    });

    it('transactionsByStudent 应该按学生分组', () => {
      store.transactions = [
        createMockTransaction({ uid: 1, student_id: 1 }),
        createMockTransaction({ uid: 2, student_id: 1 }),
        createMockTransaction({ uid: 3, student_id: 2 })
      ];

      const groups = store.transactionsByStudent;
      expect(groups['1']).toHaveLength(2);
      expect(groups['2']).toHaveLength(1);
    });

    it('transactionsByType 应该按类型分组', () => {
      store.transactions = [
        createMockTransaction({ uid: 1, is_installment: false }),
        createMockTransaction({ uid: 2, is_installment: true }),
        createMockTransaction({ uid: 3, is_installment: true })
      ];

      const groups = store.transactionsByType;
      expect(groups['normal']).toHaveLength(1);
      expect(groups['installment']).toHaveLength(2);
    });

    it('installmentTransactions 应该只返回分期交易', () => {
      store.transactions = [
        createMockTransaction({ uid: 1, is_installment: false }),
        createMockTransaction({ uid: 2, is_installment: true }),
        createMockTransaction({ uid: 3, is_installment: false })
      ];

      expect(store.installmentTransactions).toHaveLength(1);
    });

    it('totalIncome 应该正确计算总收入', () => {
      store.transactions = [
        createMockTransaction({ amount: 10000 }),
        createMockTransaction({ amount: -5000 }),
        createMockTransaction({ amount: 20000 })
      ];

      expect(store.totalIncome).toBe(30000);
    });

    it('totalExpense 应该正确计算总支出', () => {
      store.transactions = [
        createMockTransaction({ amount: 10000 }),
        createMockTransaction({ amount: -5000 }),
        createMockTransaction({ amount: -3000 })
      ];

      expect(store.totalExpense).toBe(8000);
    });

    it('netProfit 应该正确计算净利润', () => {
      store.transactions = [
        createMockTransaction({ uid: 1, amount: 10000 }),
        createMockTransaction({ uid: 2, amount: -3000 })
      ];

      expect(store.netProfit).toBe(7000);
    });

    it('pendingInstallments 应该正确计算待处理分期数', () => {
      store.transactions = [
        createMockTransaction({ uid: 1, is_installment: true, installment: { status: InstallmentStatus.PAID } }),
        createMockTransaction({ uid: 2, is_installment: true, installment: { status: InstallmentStatus.PENDING } }),
        createMockTransaction({ uid: 3, is_installment: true, installment: { status: InstallmentStatus.PENDING } })
      ];

      expect(store.pendingInstallments).toBe(2);
    });
  });

  describe('3. fetchTransactions - 获取交易列表', () => {
    beforeEach(() => {
      store = useTransactionStore();
    });

    it('应该正确获取交易列表', async () => {
      const mockTransactions = [
        createMockTransaction({ uid: 1 }),
        createMockTransaction({ uid: 2 })
      ];
      (ApiService.getAllTransactions as vi.Mock).mockResolvedValue({
        items: mockTransactions,
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          total_pages: 1
        }
      });

      const result = await store.fetchTransactions();

      expect(store.transactions).toHaveLength(2);
      expect(ApiService.getAllTransactions).toHaveBeenCalled();
    });

    it('应该正确处理分页数据', async () => {
      (ApiService.getAllTransactions as vi.Mock).mockResolvedValue({
        items: [createMockTransaction({ uid: 1 })],
        pagination: {
          page: 2,
          limit: 20,
          total: 50,
          total_pages: 3
        }
      });

      await store.fetchTransactions({ page: 2, limit: 20 });

      expect(store.pagination.currentPage).toBe(2);
      expect(store.pagination.totalItems).toBe(50);
      expect(store.pagination.totalPages).toBe(3);
    });

    it('应该在获取失败时抛出错误', async () => {
      (ApiService.getAllTransactions as vi.Mock).mockRejectedValue(new Error('Network error'));

      await expect(store.fetchTransactions()).rejects.toThrow('Network error');
    });

    it('应该正确处理数组格式的响应', async () => {
      const mockTransactions = [createMockTransaction({ uid: 1 })];
      (ApiService.getAllTransactions as vi.Mock).mockResolvedValue(mockTransactions);

      await store.fetchTransactions();

      expect(store.transactions).toHaveLength(1);
    });
  });

  describe('4. createTransaction - 创建交易', () => {
    beforeEach(() => {
      store = useTransactionStore();
    });

    it('应该成功创建交易并添加到列表', async () => {
      const newTransaction = createMockTransaction({ uid: 100, amount: 5000 });
      (ApiService.addCashTransaction as vi.Mock).mockResolvedValue(newTransaction);

      const result = await store.createTransaction({
        student_id: 1,
        amount: 5000,
        note: '新交易'
      });

      expect(store.transactions).toHaveLength(1);
      expect(store.transactions[0].uid).toBe(100);
      expect(store.currentTransaction).toEqual(newTransaction);
    });
  });

  describe('5. updateTransaction - 更新交易', () => {
    beforeEach(() => {
      store = useTransactionStore();
      store.transactions = [createMockTransaction({ uid: 1 })];
    });

    it('应该成功更新交易', async () => {
      const updatedTransaction = { ...createMockTransaction({ uid: 1 }), note: '已更新' };
      (ApiService.updateTransaction as vi.Mock).mockResolvedValue(updatedTransaction);

      await store.updateTransaction(1, { note: '已更新' });

      expect(store.transactions[0].note).toBe('已更新');
    });

    it('应该在更新当前交易时同步更新', async () => {
      const updatedTransaction = { ...createMockTransaction({ uid: 1 }), note: '已更新' };
      store.currentTransaction = createMockTransaction({ uid: 1 });
      (ApiService.updateTransaction as vi.Mock).mockResolvedValue(updatedTransaction);

      await store.updateTransaction(1, { note: '已更新' });

      expect(store.currentTransaction?.note).toBe('已更新');
    });
  });

  describe('6. deleteTransaction - 删除交易', () => {
    beforeEach(() => {
      store = useTransactionStore();
      store.transactions = [
        createMockTransaction({ uid: 1 }),
        createMockTransaction({ uid: 2 })
      ];
    });

    it('应该成功删除交易', async () => {
      (ApiService.deleteCashTransaction as vi.Mock).mockResolvedValue({});

      await store.deleteTransaction(1);

      expect(store.transactions).toHaveLength(1);
      expect(store.transactions[0].uid).toBe(2);
    });

    it('应该删除当前交易时清空当前交易状态', async () => {
      store.currentTransaction = createMockTransaction({ uid: 1 });
      (ApiService.deleteCashTransaction as vi.Mock).mockResolvedValue({});

      await store.deleteTransaction(1);

      expect(store.currentTransaction).toBeNull();
    });
  });

  describe('7. 搜索和过滤', () => {
    beforeEach(() => {
      store = useTransactionStore();
    });

    it('updateSearchParams 应该正确更新搜索参数', () => {
      store.updateSearchParams({ page: 2, limit: 10 });

      expect(store.searchParams.page).toBe(2);
      expect(store.searchParams.limit).toBe(10);
    });

    it('updateFilterState 应该正确更新过滤状态', () => {
      store.updateFilterState({ transaction_type: 'INCOME' });

      expect(store.filterState.transaction_type).toBe('INCOME');
    });

    it('resetSearchParams 应该重置所有搜索参数', () => {
      store.searchParams = { page: 5, limit: 100, studentId: '123' } as any;
      store.filterState = { transaction_type: 'EXPENSE' } as any;

      store.resetSearchParams();

      expect(store.searchParams.page).toBe(1);
      expect(store.searchParams.limit).toBe(50);
      expect(store.filterState.transaction_type).toBe('');
    });
  });

  describe('8. 时间周期选择', () => {
    beforeEach(() => {
      store = useTransactionStore();
    });

    it('setSelectedPeriod 应该正确设置本月', () => {
      store.setSelectedPeriod('ThisMonth');

      expect(store.selectedPeriod).toBe('ThisMonth');
      expect(store.searchParams.startDate).toBeDefined();
      expect(store.searchParams.endDate).toBeDefined();
    });

    it('setSelectedPeriod 应该正确设置上月', () => {
      store.setSelectedPeriod('LastMonth');

      expect(store.selectedPeriod).toBe('LastMonth');
    });

    it('setSelectedPeriod 应该正确设置本季度', () => {
      store.setSelectedPeriod('ThisQuarter');

      expect(store.selectedPeriod).toBe('ThisQuarter');
    });

    it('setSelectedPeriod 应该正确设置本年', () => {
      store.setSelectedPeriod('ThisYear');

      expect(store.selectedPeriod).toBe('ThisYear');
    });

    it('setSelectedPeriod 应该忽略无效周期', () => {
      const originalParams = { ...store.searchParams };
      store.setSelectedPeriod('InvalidPeriod');

      expect(store.selectedPeriod).toBe('InvalidPeriod');
      expect(store.searchParams.startDate).toBe(originalParams.startDate);
    });
  });

  describe('9. UI状态控制', () => {
    beforeEach(() => {
      store = useTransactionStore();
    });

    it('toggleAddTransaction 应该切换添加表单显示状态', () => {
      expect(store.showAddTransaction).toBe(false);

      store.toggleAddTransaction();
      expect(store.showAddTransaction).toBe(true);

      store.toggleAddTransaction();
      expect(store.showAddTransaction).toBe(false);
    });

    it('toggleAddTransaction 应该接受显式参数', () => {
      store.toggleAddTransaction(true);
      expect(store.showAddTransaction).toBe(true);

      store.toggleAddTransaction(false);
      expect(store.showAddTransaction).toBe(false);
    });

    it('toggleAddTransaction 应该清空当前交易', () => {
      store.currentTransaction = createMockTransaction({ uid: 1 });
      store.showAddTransaction = false;

      store.toggleAddTransaction(true);

      expect(store.currentTransaction).toBeNull();
    });

    it('toggleUpdateStatus 应该正确设置状态更新表单', () => {
      const transaction = createMockTransaction({ uid: 1 });

      store.toggleUpdateStatus(true, transaction, InstallmentStatus.PENDING);

      expect(store.showUpdateStatus).toBe(true);
      expect(store.currentTransaction).toEqual(transaction);
      expect(store.selectedStatus).toBe(InstallmentStatus.PENDING);
    });
  });

  describe('10. 辅助功能', () => {
    beforeEach(() => {
      store = useTransactionStore();
    });

    it('setCurrentTransaction 应该正确设置当前交易', () => {
      const transaction = createMockTransaction({ uid: 1 });

      store.setCurrentTransaction(transaction);

      expect(store.currentTransaction).toEqual(transaction);
    });

    it('clearTransactions 应该清空所有交易数据', () => {
      store.transactions = [createMockTransaction({ uid: 1 })];
      store.currentTransaction = createMockTransaction({ uid: 1 });

      store.clearTransactions();

      expect(store.transactions).toEqual([]);
      expect(store.currentTransaction).toBeNull();
    });

    it('refresh 应该强制刷新数据', async () => {
      store.searchParams = { page: 1 } as any;
      store.transactions = [createMockTransaction({ uid: 1 })];
      (ApiService.getAllTransactions as vi.Mock).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 50, total: 0, total_pages: 0 }
      });

      await store.refresh();

      expect(store.transactions).toEqual([]);
      expect(ApiService.getAllTransactions).toHaveBeenCalled();
    });
  });
});

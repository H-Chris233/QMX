/**
 * Installment Store 单元测试
 *
 * 测试覆盖：
 * 1. 状态初始化
 * 2. 分期列表获取
 * 3. 分期CRUD操作
 * 4. 缓存机制
 * 5. Getters计算属性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInstallmentStore } from '../installment';
import { ApiService } from '../../api/ApiService';
import type { Installment } from '../../types/api';
import { InstallmentStatus } from '../../types/api';

// Mock ApiService
vi.mock('../../api/ApiService', () => ({
  ApiService: {
    getInstallmentPlan: vi.fn(),
    getAllInstallmentPlans: vi.fn(),
    addInstallmentTransaction: vi.fn(),
    payNextInstallment: vi.fn(),
    cancelInstallmentPlan: vi.fn()
  }
}));

describe('useInstallmentStore', () => {
  let pinia: ReturnType<typeof createPinia>;
  let store: ReturnType<typeof useInstallmentStore>;

  const createTestPinia = () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    return pinia;
  };

  // 测试数据工厂函数
  const createMockInstallment = (overrides: Partial<Installment> = {}): Installment => ({
    uid: 1,
    student_id: 1,
    installment_amount: 1000,
    installment_number: 1,
    total_installments: 12,
    due_date: '2024-02-01T00:00:00.000Z',
    status: InstallmentStatus.PENDING,
    paid_at: null,
    installment: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides
  });

  beforeEach(() => {
    pinia = createTestPinia();
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('1. 状态初始化', () => {
    it('应该正确初始化分期列表', () => {
      store = useInstallmentStore();
      expect(store.installments).toEqual([]);
      expect(store.currentInstallment).toBeNull();
    });

    it('应该正确初始化搜索参数', () => {
      store = useInstallmentStore();
      expect(store.searchParams.page).toBe(1);
      expect(store.searchParams.limit).toBe(50);
    });

    it('应该正确初始化分页状态', () => {
      store = useInstallmentStore();
      expect(store.pagination.currentPage).toBe(1);
      expect(store.pagination.totalItems).toBe(0);
    });

    it('应该正确初始化缓存设置', () => {
      store = useInstallmentStore();
      expect(store.cacheExpiry).toBe(3 * 60 * 1000);
      expect(store.lastFetched).toBeNull();
    });
  });

  describe('2. Getters计算属性', () => {
    beforeEach(() => {
      store = useInstallmentStore();
    });

    it('installmentsById 应该正确创建映射', () => {
      store.installments = [
        createMockInstallment({ uid: 1 }),
        createMockInstallment({ uid: 2 })
      ];

      const map = store.installmentsById;
      expect(map.size).toBe(2);
      expect(map.get(1)?.uid).toBe(1);
      expect(map.get(2)?.uid).toBe(2);
    });

    it('pendingInstallments 应该只返回待处理分期', () => {
      store.installments = [
        createMockInstallment({ uid: 1, status: InstallmentStatus.PENDING }),
        createMockInstallment({ uid: 2, status: InstallmentStatus.PAID }),
        createMockInstallment({ uid: 3, status: InstallmentStatus.PENDING })
      ];

      expect(store.pendingInstallments).toHaveLength(2);
    });

    it('overdueInstallments 应该返回逾期的待处理分期', () => {
      store.installments = [
        createMockInstallment({ uid: 1, status: InstallmentStatus.PENDING, due_date: '2024-01-10T00:00:00.000Z' }), // 已逾期
        createMockInstallment({ uid: 2, status: InstallmentStatus.PENDING, due_date: '2024-02-01T00:00:00.000Z' }), // 未逾期
        createMockInstallment({ uid: 3, status: InstallmentStatus.PAID, due_date: '2024-01-10T00:00:00.000Z' }) // 已支付
      ];

      expect(store.overdueInstallments).toHaveLength(1);
      expect(store.overdueInstallments[0].uid).toBe(1);
    });

    it('completedInstallments 应该只返回已完成的分期', () => {
      store.installments = [
        createMockInstallment({ uid: 1, status: InstallmentStatus.PAID }),
        createMockInstallment({ uid: 2, status: InstallmentStatus.PENDING }),
        createMockInstallment({ uid: 3, status: InstallmentStatus.PAID })
      ];

      expect(store.completedInstallments).toHaveLength(2);
    });

    it('installmentsByStudent 应该按学生分组', () => {
      store.installments = [
        createMockInstallment({ uid: 1, student_id: 1 }),
        createMockInstallment({ uid: 2, student_id: 1 }),
        createMockInstallment({ uid: 3, student_id: 2 })
      ];

      const groups = store.installmentsByStudent;
      expect(groups['1']).toHaveLength(2);
      expect(groups['2']).toHaveLength(1);
    });

    it('totalPendingAmount 应该正确计算待处理金额', () => {
      store.installments = [
        createMockInstallment({ uid: 1, installment_amount: 1000, status: InstallmentStatus.PENDING }),
        createMockInstallment({ uid: 2, installment_amount: 2000, status: InstallmentStatus.PENDING }),
        createMockInstallment({ uid: 3, installment_amount: 3000, status: InstallmentStatus.PAID })
      ];

      expect(store.totalPendingAmount).toBe(3000);
    });

    it('totalOverdueAmount 应该正确计算逾期金额', () => {
      store.installments = [
        createMockInstallment({ uid: 1, installment_amount: 1000, status: InstallmentStatus.PENDING, due_date: '2024-01-10T00:00:00.000Z' }),
        createMockInstallment({ uid: 2, installment_amount: 2000, status: InstallmentStatus.PENDING, due_date: '2024-02-01T00:00:00.000Z' })
      ];

      expect(store.totalOverdueAmount).toBe(1000);
    });

    it('isCacheExpired 应该在未获取过时返回true', () => {
      store = useInstallmentStore();
      expect(store.isCacheExpired).toBe(true);
    });

    it('isCacheExpired 应该在缓存有效时返回false', () => {
      store = useInstallmentStore();
      store.lastFetched = new Date();
      expect(store.isCacheExpired).toBe(false);
    });
  });

  describe('3. fetchInstallments - 获取分期列表', () => {
    beforeEach(() => {
      store = useInstallmentStore();
    });

    it('应该在缓存过期时获取数据', async () => {
      store.lastFetched = null;
      (ApiService.getAllInstallmentPlans as vi.Mock).mockResolvedValue({
        data: [{ uid: 101 }],
        pagination: { page: 1, limit: 50, total: 1, total_pages: 1 }
      });
      (ApiService.getInstallmentPlan as vi.Mock).mockResolvedValue({
        installments: [createMockInstallment({ uid: 1 })]
      });

      await store.fetchInstallments({ studentId: '1' });

      expect(store.installments).toHaveLength(1);
      expect(ApiService.getAllInstallmentPlans).toHaveBeenCalled();
      expect(ApiService.getInstallmentPlan).toHaveBeenCalled();
    });

    it('应该在缓存有效时返回缓存数据', async () => {
      store.lastFetched = new Date();
      store.installments = [createMockInstallment({ uid: 1 })];

      const result = await store.fetchInstallments();

      expect(result).toEqual([createMockInstallment({ uid: 1 })]);
      expect(ApiService.getInstallmentPlan).not.toHaveBeenCalled();
    });

    it('应该在强制刷新时获取新数据', async () => {
      store.lastFetched = new Date();
      (ApiService.getAllInstallmentPlans as vi.Mock).mockResolvedValue({
        data: [{ uid: 202 }],
        pagination: { page: 1, limit: 50, total: 1, total_pages: 1 }
      });
      (ApiService.getInstallmentPlan as vi.Mock).mockResolvedValue({
        installments: [createMockInstallment({ uid: 2 })]
      });

      await store.fetchInstallments({ studentId: '1' }, true);

      expect(store.installments[0].uid).toBe(2);
      expect(ApiService.getAllInstallmentPlans).toHaveBeenCalled();
      expect(ApiService.getInstallmentPlan).toHaveBeenCalled();
    });

    it('应该在学生ID无效时抛出错误', async () => {
      await expect(store.fetchInstallments({ studentId: '' })).rejects.toThrow('学生ID无效');
    });
  });

  describe('4. createInstallmentPlan - 创建分期计划', () => {
    beforeEach(() => {
      store = useInstallmentStore();
    });

    it('应该成功创建分期计划', async () => {
      (ApiService.addInstallmentTransaction as vi.Mock).mockResolvedValue(createMockInstallment({ uid: 100 }));
      (ApiService.getAllInstallmentPlans as vi.Mock).mockResolvedValue({
        data: [{ uid: 100 }],
        pagination: { page: 1, limit: 50, total: 1, total_pages: 1 }
      });
      (ApiService.getInstallmentPlan as vi.Mock).mockResolvedValue({
        installments: [createMockInstallment({ uid: 100 })]
      });

      const result = await store.createInstallmentPlan({
        student_id: 1,
        total_amount: 12000,
        total_installments: 12,
        frequency: 'monthly',
        start_date: '2024-01-01'
      });

      expect(result).toBeDefined();
      expect(ApiService.addInstallmentTransaction).toHaveBeenCalled();
    });

    it('应该在创建后刷新分期列表', async () => {
      (ApiService.addInstallmentTransaction as vi.Mock).mockResolvedValue(createMockInstallment({ uid: 100 }));
      (ApiService.getAllInstallmentPlans as vi.Mock).mockResolvedValue({
        data: [{ uid: 100 }],
        pagination: { page: 1, limit: 50, total: 1, total_pages: 1 }
      });
      (ApiService.getInstallmentPlan as vi.Mock).mockResolvedValue({
        installments: [createMockInstallment({ uid: 100 })]
      });

      await store.createInstallmentPlan({
        student_id: 1,
        total_amount: 12000,
        total_installments: 12,
        frequency: 'monthly',
        start_date: '2024-01-01'
      });

      expect(store.installments).toHaveLength(1);
    });
  });

  describe('5. payInstallment - 支付分期', () => {
    beforeEach(() => {
      store = useInstallmentStore();
      store.installments = [createMockInstallment({ uid: 1 })];
    });

    it('应该成功支付分期并更新本地状态', async () => {
      const paidInstallment = { ...createMockInstallment({ uid: 1 }), status: InstallmentStatus.PAID };
      (ApiService.payNextInstallment as vi.Mock).mockResolvedValue({ installment: paidInstallment });

      await store.payInstallment(1, { amount: 1000 });

      expect(store.installments[0].status).toBe(InstallmentStatus.PAID);
    });

    it('应该更新当前分期', async () => {
      store.currentInstallment = createMockInstallment({ uid: 1 });
      const paidInstallment = { ...createMockInstallment({ uid: 1 }), status: InstallmentStatus.PAID };
      (ApiService.payNextInstallment as vi.Mock).mockResolvedValue({ installment: paidInstallment });

      await store.payInstallment(1, { amount: 1000 });

      expect(store.currentInstallment?.status).toBe(InstallmentStatus.PAID);
    });
  });

  describe('6. cancelInstallment - 取消分期', () => {
    beforeEach(() => {
      store = useInstallmentStore();
    });

    it('应该成功取消分期', async () => {
      (ApiService.cancelInstallmentPlan as vi.Mock).mockResolvedValue({ success: true });

      const result = await store.cancelInstallment(1, '用户取消');

      expect(result).toEqual({ success: true });
    });
  });

  describe('7. 搜索和过滤', () => {
    beforeEach(() => {
      store = useInstallmentStore();
    });

    it('updateSearchParams 应该正确更新搜索参数', () => {
      store.updateSearchParams({ page: 2, limit: 10 });

      expect(store.searchParams.page).toBe(2);
      expect(store.searchParams.limit).toBe(10);
    });

    it('resetSearchParams 应该重置所有搜索参数', () => {
      store.searchParams = { page: 5, limit: 100, studentId: '123' } as any;

      store.resetSearchParams();

      expect(store.searchParams.page).toBe(1);
      expect(store.searchParams.limit).toBe(50);
      expect(store.searchParams.studentId).toBe('');
    });
  });

  describe('8. 辅助功能', () => {
    beforeEach(() => {
      store = useInstallmentStore();
    });

    it('setCurrentInstallment 应该正确设置当前分期', () => {
      const installment = createMockInstallment({ uid: 1 });

      store.setCurrentInstallment(installment);

      expect(store.currentInstallment).toEqual(installment);
    });

    it('clearInstallments 应该清空所有分期数据', () => {
      store.installments = [createMockInstallment({ uid: 1 })];
      store.currentInstallment = createMockInstallment({ uid: 1 });
      store.lastFetched = new Date();

      store.clearInstallments();

      expect(store.installments).toEqual([]);
      expect(store.currentInstallment).toBeNull();
      expect(store.lastFetched).toBeNull();
    });

    it('refresh 应该强制刷新数据', async () => {
      store.searchParams = { studentId: '1' } as any;
      store.installments = [createMockInstallment({ uid: 1 })];
      (ApiService.getInstallmentPlan as vi.Mock).mockResolvedValue({
        installments: [],
        pagination: { page: 1, limit: 50, total: 0, total_pages: 0 }
      });

      await store.refresh();

      expect(store.installments).toEqual([]);
      expect(ApiService.getInstallmentPlan).toHaveBeenCalled();
    });

    it('getUpcomingInstallments 应该返回7天内到期的分期', () => {
      store.installments = [
        createMockInstallment({ uid: 1, status: InstallmentStatus.PENDING, due_date: '2024-01-20T00:00:00.000Z' }), // 5天后 - 即将到期
        createMockInstallment({ uid: 2, status: InstallmentStatus.PENDING, due_date: '2024-01-25T00:00:00.000Z' }), // 10天后 - 不在范围内
        createMockInstallment({ uid: 3, status: InstallmentStatus.PENDING, due_date: '2024-01-18T00:00:00.000Z' })  // 3天后 - 即将到期
      ];

      const upcoming = store.getUpcomingInstallments(7);

      expect(upcoming).toHaveLength(2);
      expect(upcoming.map(i => i.uid)).toEqual([1, 3]);
    });

    it('getUpcomingInstallments 应该支持自定义天数', () => {
      store.installments = [
        createMockInstallment({ uid: 1, status: InstallmentStatus.PENDING, due_date: '2024-01-20T00:00:00.000Z' })
      ];

      const upcoming = store.getUpcomingInstallments(3);

      expect(upcoming).toHaveLength(0);
    });
  });

  describe('9. 边界条件测试', () => {
    beforeEach(() => {
      store = useInstallmentStore();
    });

    it('应该处理空列表', () => {
      expect(store.pendingInstallments).toEqual([]);
      expect(store.overdueInstallments).toEqual([]);
      expect(store.completedInstallments).toEqual([]);
    });

    it('应该处理分期金额为null的情况', () => {
      store.installments = [
        createMockInstallment({ uid: 1, installment_amount: null as any, status: InstallmentStatus.PENDING })
      ];

      expect(store.totalPendingAmount).toBe(0);
    });
  });
});

/**
 * Stats Store 单元测试
 *
 * 测试覆盖：
 * 1. 状态初始化
 * 2. 统计数据获取
 * 3. 缓存机制
 * 4. Getters计算属性
 * 5. 缓存管理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStatsStore } from '../stats';
import { ApiService } from '../../api/ApiService';
import type { DashboardStats, StudentStats, FinancialStats } from '../../types/api';

// Mock ApiService
vi.mock('../../api/ApiService', () => ({
  ApiService: {
    getDashboardStats: vi.fn(),
    getStudentStats: vi.fn(),
    getGlobalFinancialStats: vi.fn(),
    getMembershipStats: vi.fn()
  }
}));

describe('useStatsStore', () => {
  let pinia: ReturnType<typeof createPinia>;
  let store: ReturnType<typeof useStatsStore>;

  const createTestPinia = () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    return pinia;
  };

  // 测试数据工厂函数
  const createMockDashboardStats = (overrides: Partial<DashboardStats> = {}): DashboardStats => ({
    totalStudents: 100,
    activeStudents: 80,
    totalRevenue: 50000,
    averageGrade: 8.5,
    ...overrides
  });

  const createMockStudentStats = (overrides: Partial<StudentStats> = {}): StudentStats => ({
    studentUid: 1,
    payments: { totalAmount: 10000, count: 5 },
    scores: { average: 9.0, max: 10, min: 7, count: 10 },
    membership: { status: 'ACTIVE', label: '会员有效', daysRemaining: 30, daysUntilStart: 0, isActive: true },
    installments: { totalAmount: 0, paidAmount: 0, remainingAmount: 0, pendingAmount: 0, pendingCount: 0 },
    ...overrides
  });

  const createMockFinancialStats = (overrides: Partial<FinancialStats> = {}): FinancialStats => ({
    period: 'ThisMonth',
    dateRange: { start: '2024-01-01', end: '2024-01-31' },
    totals: { income: 10000, expense: 2000, netIncome: 8000, isProfitable: true },
    installments: { total: 0, paid: 0, pending: 0, remaining: 0 },
    transactionCount: 10,
    studentIncome: [],
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
    it('应该正确初始化统计数据', () => {
      store = useStatsStore();
      expect(store.dashboardStats).toBeNull();
      expect(store.studentStats).toBeNull();
      expect(store.financialStats).toBeNull();
      expect(store.membershipStats).toBeNull();
    });

    it('应该正确初始化缓存时间戳', () => {
      store = useStatsStore();
      expect(store.lastFetched.dashboard).toBeNull();
      expect(store.lastFetched.student).toBeNull();
      expect(store.lastFetched.financial).toBeNull();
      expect(store.lastFetched.membership).toBeNull();
    });

    it('应该正确初始化缓存过期时间', () => {
      store = useStatsStore();
      expect(store.cacheExpiry.dashboard).toBe(5 * 60 * 1000);
      expect(store.cacheExpiry.student).toBe(10 * 60 * 1000);
      expect(store.cacheExpiry.financial).toBe(3 * 60 * 1000);
      expect(store.cacheExpiry.membership).toBe(15 * 60 * 1000);
    });

    it('应该正确初始化加载状态', () => {
      store = useStatsStore();
      expect(store.loading.dashboard).toBe(false);
      expect(store.loading.student).toBe(false);
      expect(store.loading.financial).toBe(false);
      expect(store.loading.membership).toBe(false);
    });
  });

  describe('2. Getters计算属性', () => {
    beforeEach(() => {
      store = useStatsStore();
    });

    it('dashboardLoading 应该返回正确的加载状态', () => {
      expect(store.dashboardLoading).toBe(false);
      store.loading.dashboard = true;
      expect(store.dashboardLoading).toBe(true);
    });

    it('studentLoading 应该返回正确的加载状态', () => {
      expect(store.studentLoading).toBe(false);
      store.loading.student = true;
      expect(store.studentLoading).toBe(true);
    });

    it('financialLoading 应该返回正确的加载状态', () => {
      expect(store.financialLoading).toBe(false);
      store.loading.financial = true;
      expect(store.financialLoading).toBe(true);
    });

    it('membershipLoading 应该返回正确的加载状态', () => {
      expect(store.membershipLoading).toBe(false);
      store.loading.membership = true;
      expect(store.membershipLoading).toBe(true);
    });

    it('anyLoading 应该在任一加载状态为true时返回true', () => {
      expect(store.anyLoading).toBe(false);

      store.loading.dashboard = true;
      expect(store.anyLoading).toBe(true);

      store.loading.dashboard = false;
      store.loading.financial = true;
      expect(store.anyLoading).toBe(true);
    });

    it('isCacheExpired 应该在未获取过时返回true', () => {
      expect(store.isCacheExpired('dashboard')).toBe(true);
      expect(store.isCacheExpired('student')).toBe(true);
      expect(store.isCacheExpired('financial')).toBe(true);
      expect(store.isCacheExpired('membership')).toBe(true);
    });

    it('isCacheExpired 应该在缓存有效时返回false', () => {
      store.lastFetched.dashboard = new Date();
      store.lastFetched.student = new Date();
      store.lastFetched.financial = new Date();
      store.lastFetched.membership = new Date();

      expect(store.isCacheExpired('dashboard')).toBe(false);
      expect(store.isCacheExpired('student')).toBe(false);
      expect(store.isCacheExpired('financial')).toBe(false);
      expect(store.isCacheExpired('membership')).toBe(false);
    });
  });

  describe('3. fetchDashboardStats - 获取仪表盘统计', () => {
    beforeEach(() => {
      store = useStatsStore();
    });

    it('应该正确获取仪表盘统计数据', async () => {
      const mockStats = createMockDashboardStats();
      (ApiService.getDashboardStats as vi.Mock).mockResolvedValue(mockStats);

      const result = await store.fetchDashboardStats();

      expect(result).toEqual(mockStats);
      expect(store.dashboardStats).toEqual(mockStats);
      expect(store.lastFetched.dashboard).toBeInstanceOf(Date);
    });

    it('应该在缓存有效时返回缓存数据', async () => {
      const cachedStats = createMockDashboardStats();
      store.dashboardStats = cachedStats;
      store.lastFetched.dashboard = new Date();

      const result = await store.fetchDashboardStats();

      expect(result).toEqual(cachedStats);
      expect(ApiService.getDashboardStats).not.toHaveBeenCalled();
    });

    it('应该在强制刷新时获取新数据', async () => {
      store.lastFetched.dashboard = new Date();
      store.dashboardStats = createMockDashboardStats();
      const newStats = { ...createMockDashboardStats(), totalStudents: 200 };
      (ApiService.getDashboardStats as vi.Mock).mockResolvedValue(newStats);

      await store.fetchDashboardStats(true);

      expect(store.dashboardStats?.totalStudents).toBe(200);
      expect(ApiService.getDashboardStats).toHaveBeenCalled();
    });

    it('应该在获取时设置加载状态', async () => {
      (ApiService.getDashboardStats as vi.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(createMockDashboardStats()), 100))
      );

      const promise = store.fetchDashboardStats();
      expect(store.loading.dashboard).toBe(true);

      await vi.runAllTimersAsync();
      await promise;
      expect(store.loading.dashboard).toBe(false);
    });

    it('应该在获取失败时抛出错误', async () => {
      (ApiService.getDashboardStats as vi.Mock).mockRejectedValue(new Error('Network error'));

      await expect(store.fetchDashboardStats()).rejects.toThrow('Network error');
      expect(store.loading.dashboard).toBe(false);
    });
  });

  describe('4. fetchStudentStats - 获取学员统计', () => {
    beforeEach(() => {
      store = useStatsStore();
    });

    it('应该正确获取学员统计数据', async () => {
      const mockStats = createMockStudentStats();
      (ApiService.getStudentStats as vi.Mock).mockResolvedValue(mockStats);

      const result = await store.fetchStudentStats();

      expect(result).toEqual(mockStats);
      expect(store.studentStats).toEqual(mockStats);
    });

    it('应该在缓存有效时返回缓存数据', async () => {
      const cachedStats = createMockStudentStats();
      store.studentStats = cachedStats;
      store.lastFetched.student = new Date();

      const result = await store.fetchStudentStats();

      expect(result).toEqual(cachedStats);
      expect(ApiService.getStudentStats).not.toHaveBeenCalled();
    });
  });

  describe('5. fetchFinancialStats - 获取财务统计', () => {
    beforeEach(() => {
      store = useStatsStore();
    });

    it('应该正确获取财务统计数据', async () => {
      const mockStats = createMockFinancialStats();
      (ApiService.getGlobalFinancialStats as vi.Mock).mockResolvedValue(mockStats);

      const result = await store.fetchFinancialStats();

      expect(result).toEqual(mockStats);
      expect(store.financialStats).toEqual(mockStats);
    });

    it('应该在缓存有效时返回缓存数据', async () => {
      const cachedStats = createMockFinancialStats();
      store.financialStats = cachedStats;
      store.lastFetched.financial = new Date();

      const result = await store.fetchFinancialStats();

      expect(result).toEqual(cachedStats);
      expect(ApiService.getGlobalFinancialStats).not.toHaveBeenCalled();
    });
  });

  describe('6. fetchMembershipStats - 获取会员统计', () => {
    beforeEach(() => {
      store = useStatsStore();
    });

    it('应该正确获取会员统计数据', async () => {
      const mockStats = { totalMembers: 50, activeMembers: 40, expiringMembers: 5 };
      (ApiService.getMembershipStats as vi.Mock).mockResolvedValue(mockStats);

      const result = await store.fetchMembershipStats();

      expect(result).toEqual(mockStats);
      expect(store.membershipStats).toEqual(mockStats);
    });
  });

  describe('7. fetchAllStats - 获取所有统计', () => {
    beforeEach(() => {
      store = useStatsStore();
    });

    it('应该并行获取所有统计数据', async () => {
      (ApiService.getDashboardStats as vi.Mock).mockResolvedValue(createMockDashboardStats());
      (ApiService.getStudentStats as vi.Mock).mockResolvedValue(createMockStudentStats());
      (ApiService.getGlobalFinancialStats as vi.Mock).mockResolvedValue(createMockFinancialStats());
      (ApiService.getMembershipStats as vi.Mock).mockResolvedValue({ total: 50 });

      const result = await store.fetchAllStats();

      expect(result.dashboard).toBeDefined();
      expect(result.student).toBeDefined();
      expect(result.financial).toBeDefined();
      expect(result.membership).toBeDefined();
      expect(ApiService.getDashboardStats).toHaveBeenCalled();
      expect(ApiService.getStudentStats).toHaveBeenCalled();
      expect(ApiService.getGlobalFinancialStats).toHaveBeenCalled();
      expect(ApiService.getMembershipStats).toHaveBeenCalled();
    });
  });

  describe('8. 缓存管理', () => {
    beforeEach(() => {
      store = useStatsStore();
    });

    it('updateCacheExpiry 应该正确更新缓存过期时间', () => {
      store.updateCacheExpiry('dashboard', 600000);

      expect(store.cacheExpiry.dashboard).toBe(600000);
    });

    it('clearStatsCache 应该清除特定类型缓存', () => {
      store.dashboardStats = createMockDashboardStats();
      store.studentStats = createMockStudentStats();
      store.lastFetched.dashboard = new Date();
      store.lastFetched.student = new Date();

      store.clearStatsCache('dashboard');

      expect(store.dashboardStats).toBeNull();
      expect(store.lastFetched.dashboard).toBeNull();
      expect(store.studentStats).not.toBeNull();
    });

    it('clearStatsCache 应该清除所有缓存（未指定类型时）', () => {
      store.dashboardStats = createMockDashboardStats();
      store.studentStats = createMockStudentStats();
      store.financialStats = createMockFinancialStats();
      store.membershipStats = { total: 50 } as any;

      store.clearStatsCache();

      expect(store.dashboardStats).toBeNull();
      expect(store.studentStats).toBeNull();
      expect(store.financialStats).toBeNull();
      expect(store.membershipStats).toBeNull();
    });

    it('refreshStats 应该刷新特定类型统计', async () => {
      const newStats = { ...createMockDashboardStats(), totalStudents: 300 };
      (ApiService.getDashboardStats as vi.Mock).mockResolvedValue(newStats);

      const result = await store.refreshStats('dashboard');

      expect(result?.totalStudents).toBe(300);
    });

    it('refreshStats 应该刷新所有统计（未指定类型时）', async () => {
      (ApiService.getDashboardStats as vi.Mock).mockResolvedValue(createMockDashboardStats());
      (ApiService.getStudentStats as vi.Mock).mockResolvedValue(createMockStudentStats());
      (ApiService.getGlobalFinancialStats as vi.Mock).mockResolvedValue(createMockFinancialStats());
      (ApiService.getMembershipStats as vi.Mock).mockResolvedValue({ total: 50 });

      const result = await store.refreshStats();

      expect(result?.dashboard).toBeDefined();
      expect(result?.student).toBeDefined();
    });

    it('resetStats 应该重置所有统计数据和状态', () => {
      store.dashboardStats = createMockDashboardStats();
      store.studentStats = createMockStudentStats();
      store.loading.dashboard = true;

      store.resetStats();

      expect(store.dashboardStats).toBeNull();
      expect(store.studentStats).toBeNull();
      expect(store.loading.dashboard).toBe(false);
    });
  });

  describe('9. 边界条件测试', () => {
    beforeEach(() => {
      store = useStatsStore();
    });

    it('应该处理空统计结果', async () => {
      (ApiService.getDashboardStats as vi.Mock).mockResolvedValue(null);

      await store.fetchDashboardStats();

      expect(store.dashboardStats).toBeNull();
    });

    it('应该处理并发请求', async () => {
      (ApiService.getDashboardStats as vi.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(createMockDashboardStats()), 200))
      );

      const promise1 = store.fetchDashboardStats();
      const promise2 = store.fetchDashboardStats();

      expect(store.loading.dashboard).toBe(true);

      await vi.runAllTimersAsync();
      await promise1;
      await promise2;

      expect(store.loading.dashboard).toBe(false);
    });
  });
});

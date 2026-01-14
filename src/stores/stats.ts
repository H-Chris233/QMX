import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  DashboardStats,
  StudentStats,
  FinancialStats
} from '../types/api';
import { ApiService } from '../api/ApiService';

/**
 * 统计数据状态管理
 * 负责仪表盘统计、学生统计、财务统计等数据的缓存和更新
 */
export const useStatsStore = defineStore('stats', () => {
  // State
  const dashboardStats = ref<DashboardStats | null>(null);
  const studentStats = ref<StudentStats | null>(null);
  const financialStats = ref<FinancialStats | null>(null);
  const membershipStats = ref<any | null>(null);

  const lastFetched = ref<Record<string, Date | null>>({
    dashboard: null,
    student: null,
    financial: null,
    membership: null
  });

  const cacheExpiry = ref<Record<string, number>>({
    dashboard: 5 * 60 * 1000,        // 5分钟
    student: 10 * 60 * 1000,         // 10分钟
    financial: 3 * 60 * 1000,        // 3分钟
    membership: 15 * 60 * 1000       // 15分钟
  });

  const loading = ref<Record<string, boolean>>({
    dashboard: false,
    student: false,
    financial: false,
    membership: false
  });

  // Getters
  const isCacheExpired = computed(() => {
    return (key: keyof typeof lastFetched.value) => {
      const fetched = lastFetched.value[key];
      if (!fetched) return true;
      const expiry = cacheExpiry.value[key];
      return Date.now() - fetched.getTime() > expiry;
    };
  });

  const dashboardLoading = computed(() => loading.value.dashboard);
  const studentLoading = computed(() => loading.value.student);
  const financialLoading = computed(() => loading.value.financial);
  const membershipLoading = computed(() => loading.value.membership);

  const anyLoading = computed(() => {
    return Object.values(loading.value).some(Boolean);
  });

  // Actions

  /**
   * 获取仪表盘统计数据
   */
  async function fetchDashboardStats(forceRefresh = false) {
    if (!forceRefresh && !isCacheExpired.value('dashboard') && dashboardStats.value) {
      return dashboardStats.value;
    }

    try {
      loading.value.dashboard = true;

      const stats = await ApiService.getDashboardStats();
      dashboardStats.value = stats;
      lastFetched.value.dashboard = new Date();

      return stats;
    } catch (error) {
      throw error;
    } finally {
      loading.value.dashboard = false;
    }
  }

  /**
   * 获取学生统计数据
   */
  async function fetchStudentStats(forceRefresh = false) {
    if (!forceRefresh && !isCacheExpired.value('student') && studentStats.value) {
      return studentStats.value;
    }

    try {
      loading.value.student = true;

      const stats = await ApiService.getStudentStats(0);
      studentStats.value = stats;
      lastFetched.value.student = new Date();

      return stats;
    } catch (error) {
      throw error;
    } finally {
      loading.value.student = false;
    }
  }

  /**
   * 获取财务统计数据
   */
  async function fetchFinancialStats(forceRefresh = false) {
    if (!forceRefresh && !isCacheExpired.value('financial') && financialStats.value) {
      return financialStats.value;
    }

    try {
      loading.value.financial = true;

      const stats = await ApiService.getFinancialStats();
      financialStats.value = stats;
      lastFetched.value.financial = new Date();

      return stats;
    } catch (error) {
      throw error;
    } finally {
      loading.value.financial = false;
    }
  }

  /**
   * 获取会员统计数据
   */
  async function fetchMembershipStats(forceRefresh = false) {
    if (!forceRefresh && !isCacheExpired.value('membership') && membershipStats.value) {
      return membershipStats.value;
    }

    try {
      loading.value.membership = true;

      const stats = await ApiService.getMembershipStats();
      membershipStats.value = stats;
      lastFetched.value.membership = new Date();

      return stats;
    } catch (error) {
      throw error;
    } finally {
      loading.value.membership = false;
    }
  }

  /**
   * 获取所有统计数据
   */
  async function fetchAllStats(forceRefresh = false) {
    try {
      const [dashboard, student, financial, membership] = await Promise.all([
        fetchDashboardStats(forceRefresh),
        fetchStudentStats(forceRefresh),
        fetchFinancialStats(forceRefresh),
        fetchMembershipStats(forceRefresh)
      ]);

      return {
        dashboard,
        student,
        financial,
        membership
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 更新缓存过期时间
   */
  function updateCacheExpiry(type: keyof typeof cacheExpiry.value, duration: number) {
    cacheExpiry.value[type] = duration;
  }

  /**
   * 清除特定统计数据缓存
   */
  function clearStatsCache(type?: keyof typeof dashboardStats.value) {
    if (type) {
      switch (type) {
        case 'dashboard':
          dashboardStats.value = null;
          lastFetched.value.dashboard = null;
          break;
        case 'student':
          studentStats.value = null;
          lastFetched.value.student = null;
          break;
        case 'financial':
          financialStats.value = null;
          lastFetched.value.financial = null;
          break;
        case 'membership':
          membershipStats.value = null;
          lastFetched.value.membership = null;
          break;
      }
    } else {
      // 清除所有缓存
      dashboardStats.value = null;
      studentStats.value = null;
      financialStats.value = null;
      membershipStats.value = null;
      Object.keys(lastFetched.value).forEach(key => {
        (lastFetched.value as any)[key] = null;
      });
    }
  }

  /**
   * 刷新统计数据
   */
  async function refreshStats(type?: keyof typeof dashboardStats.value) {
    if (type) {
      switch (type) {
        case 'dashboard':
          return fetchDashboardStats(true);
        case 'student':
          return fetchStudentStats(true);
        case 'financial':
          return fetchFinancialStats(true);
        case 'membership':
          return fetchMembershipStats(true);
      }
    } else {
      return fetchAllStats(true);
    }
  }

  /**
   * 重置统计数据
   */
  function resetStats() {
    dashboardStats.value = null;
    studentStats.value = null;
    financialStats.value = null;
    membershipStats.value = null;
    Object.keys(lastFetched.value).forEach(key => {
      (lastFetched.value as any)[key] = null;
    });
    loading.value = {
      dashboard: false,
      student: false,
      financial: false,
      membership: false
    };
  }

  return {
    // State
    dashboardStats,
    studentStats,
    financialStats,
    membershipStats,
    lastFetched,
    cacheExpiry,
    loading,

    // Getters
    isCacheExpired,
    dashboardLoading,
    studentLoading,
    financialLoading,
    membershipLoading,
    anyLoading,

    // Actions
    fetchDashboardStats,
    fetchStudentStats,
    fetchFinancialStats,
    fetchMembershipStats,
    fetchAllStats,
    updateCacheExpiry,
    clearStatsCache,
    refreshStats,
    resetStats
  };
});

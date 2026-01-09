import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Installment,
  InstallmentPlanCreateData,
  InstallmentSearchParams
} from '../types/api';
import { ApiService } from '../api/ApiService';
import { InstallmentStatus } from '../types/api';

/**
 * 分期付款状态管理
 * 负责分期付款计划的管理和状态跟踪
 */
export const useInstallmentStore = defineStore('installment', () => {
  // State
  const installments = ref<Installment[]>([]);
  const currentInstallment = ref<Installment | null>(null);
  const searchParams = ref<InstallmentSearchParams>({
    page: 1,
    limit: 50,
    studentId: '',
    status: undefined
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
  const cacheExpiry = ref<number>(3 * 60 * 1000); // 3分钟缓存

  // Getters
  const installmentsById = computed(() => {
    const map = new Map<number, Installment>();
    installments.value.forEach(installment => {
      map.set(installment.uid, installment);
    });
    return map;
  });

  const pendingInstallments = computed(() => {
    return installments.value.filter(i => i.status === InstallmentStatus.PENDING);
  });

  const overdueInstallments = computed(() => {
    const now = new Date();
    return installments.value.filter(i =>
      i.status === InstallmentStatus.PENDING &&
      i.due_date &&
      new Date(i.due_date) < now
    );
  });

  const completedInstallments = computed(() => {
    return installments.value.filter(i => i.status === InstallmentStatus.PAID);
  });

  const installmentsByStudent = computed(() => {
    const groups: Record<string, Installment[]> = {};
    installments.value.forEach(installment => {
      const studentId = installment.student_id || 'no_student';
      if (!groups[studentId]) {
        groups[studentId] = [];
      }
      groups[studentId].push(installment);
    });
    return groups;
  });

  const totalPendingAmount = computed(() => {
    return pendingInstallments.value.reduce((sum, i) => sum + (i.installment_amount || 0), 0);
  });

  const totalOverdueAmount = computed(() => {
    return overdueInstallments.value.reduce((sum, i) => sum + (i.installment_amount || 0), 0);
  });

  const isCacheExpired = computed(() => {
    if (!lastFetched.value) return true;
    return Date.now() - lastFetched.value.getTime() > cacheExpiry.value;
  });

  // Actions

  /**
   * 获取分期付款列表
   */
  async function fetchInstallments(params?: Partial<InstallmentSearchParams>, forceRefresh = false) {
    if (!forceRefresh && !isCacheExpired.value && !params) {
      return installments.value;
    }

    try {
      const mergedParams = { ...searchParams.value, ...params };
      const studentId = mergedParams.studentId;
      if (!studentId || typeof studentId !== 'number') {
        throw new Error('学生ID无效');
      }

      const response = await ApiService.getInstallmentPlan(studentId);

      installments.value = response.installments || [];
      searchParams.value = mergedParams;
      lastFetched.value = new Date();

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 根据学生ID获取分期付款
   */
  async function fetchInstallmentsByStudent(studentId: string, forceRefresh = false) {
    return fetchInstallments({ studentId }, forceRefresh);
  }

  /**
   * 创建分期付款计划
   */
  async function createInstallmentPlan(data: InstallmentPlanCreateData) {
    try {
      // addInstallmentTransaction返回单个Transaction对象
      const transaction = await ApiService.addInstallmentTransaction({
        student_id: data.student_id,
        amount: data.total_amount,
        note: data.note,
        total_installments: data.total_installments,
        frequency: String(data.frequency),
        custom_days: data.custom_days,
        start_date: data.start_date,
        due_date: data.start_date
      });

      // 刷新分期列表以获取最新数据
      await fetchInstallments({}, true);

      return transaction;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 支付分期
   */
  async function payInstallment(installmentId: number, paymentData: any) {
    try {
      const response = await ApiService.payNextInstallment(installmentId);

      // 更新本地状态 - response是{installment, transaction}
      if (response.installment) {
        const index = installments.value.findIndex(i => i.uid === installmentId);
        if (index !== -1) {
          installments.value[index] = response.installment;
        }

        if (currentInstallment.value?.uid === installmentId) {
          currentInstallment.value = response.installment;
        }
      }

      return response.installment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 取消分期
   */
  async function cancelInstallment(installmentId: number, reason?: string) {
    try {
      const response = await ApiService.cancelInstallmentPlan(installmentId);

      // 更新本地状态 - response是InstallmentPlan
      // 暂时不更新本地状态，因为类型不匹配
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 设置当前分期
   */
  function setCurrentInstallment(installment: Installment | null) {
    currentInstallment.value = installment;
  }

  /**
   * 更新搜索参数
   */
  function updateSearchParams(params: Partial<InstallmentSearchParams>) {
    searchParams.value = { ...searchParams.value, ...params };
  }

  /**
   * 重置搜索参数
   */
  function resetSearchParams() {
    searchParams.value = {
      page: 1,
      limit: 50,
      studentId: '',
      status: undefined
    };
  }

  /**
   * 清空分期数据
   */
  function clearInstallments() {
    installments.value = [];
    currentInstallment.value = null;
    lastFetched.value = null;
  }

  /**
   * 刷新数据
   */
  async function refresh() {
    const params = { ...searchParams.value };
    clearInstallments();
    return fetchInstallments(params, true);
  }

  /**
   * 获取即将到期的分期（7天内）
   */
  function getUpcomingInstallments(days = 7) {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    return installments.value.filter(i =>
      i.status === InstallmentStatus.PENDING &&
      i.due_date &&
      new Date(i.due_date) >= now &&
      new Date(i.due_date) <= future
    );
  }

  return {
    // State
    installments,
    currentInstallment,
    searchParams,
    pagination,
    lastFetched,

    // Getters
    installmentsById,
    pendingInstallments,
    overdueInstallments,
    completedInstallments,
    installmentsByStudent,
    totalPendingAmount,
    totalOverdueAmount,
    isCacheExpired,

    // Actions
    fetchInstallments,
    fetchInstallmentsByStudent,
    createInstallmentPlan,
    payInstallment,
    cancelInstallment,
    setCurrentInstallment,
    updateSearchParams,
    resetSearchParams,
    clearInstallments,
    refresh,
    getUpcomingInstallments
  };
});
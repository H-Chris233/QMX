<template>
  <div class="financial-statistics">
    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-progress"></div>

    <div class="section-header">
      <h2>收支统计</h2>
      <div class="header-actions">
        <button
          class="refresh-btn"
          @click="forceRefresh"
          :disabled="loading"
          title="刷新数据"
        >
          🔄 刷新
        </button>
        <button
          class="add-btn"
          @click="openAddTransactionModal"
          :disabled="loading"
          aria-label="添加新交易"
        >
          {{ loading ? '加载中...' : '➕ 添加交易' }}
        </button>
      </div>
    </div>

    <!-- 时间周期选择器 -->
    <div class="time-period-selector">
      <h3>统计周期</h3>
      <div class="period-buttons">
        <button
          v-for="period in timePeriods"
          :key="period.value"
          :class="['period-btn', { active: selectedPeriod === period.value }]"
          @click="selectTimePeriod(period.value)"
          :disabled="loading"
        >
          {{ period.label }}
        </button>
      </div>
    </div>

    <!-- 总览卡片 -->
    <div class="overview-cards">
      <div class="overview-card income">
        <div class="card-icon">💰</div>
        <div class="card-content">
          <h3>总收入</h3>
          <div class="card-value">{{ formatCurrency(totalIncome) }}</div>
        </div>
      </div>

      <div class="overview-card expense">
        <div class="card-icon">💸</div>
        <div class="card-content">
          <h3>总支出</h3>
          <div class="card-value">{{ formatCurrency(totalExpense) }}</div>
        </div>
      </div>

      <div class="overview-card balance">
        <div class="card-icon">💎</div>
        <div class="card-content">
          <h3>净收益</h3>
          <div class="card-value">{{ formatCurrency(netProfit) }}</div>
        </div>
      </div>

      <div class="overview-card installment">
        <div class="card-icon">📅</div>
        <div class="card-content">
          <h3>分期付款</h3>
          <div class="card-value">{{ installmentCount }}</div>
          <div class="card-subtext">待处理: {{ pendingInstallments }}</div>
        </div>
      </div>
    </div>

    <!-- 交易记录 -->
    <div class="transactions-section">
      <div class="transactions-header">
        <h3>交易记录</h3>
        <div class="filter-controls">
          <select
            :value="filterState.type"
            @change="onTransactionTypeChange"
            aria-label="交易类型筛选"
          >
            <option value="all">全部交易</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
            <option value="installment">分期付款</option>
          </select>
          
          <input
            :value="filterState.search"
            type="text"
            placeholder="搜索交易..."
            @input="onSearchInput"
            aria-label="交易搜索"
            class="search-input"
          />
        </div>
        
        <!-- 日期范围搜索 -->
        <div class="date-filter">
          <input
            :value="filterState.dateFrom ?? ''"
            type="date"
            placeholder="开始日期"
            @change="onDateFromChange"
            class="date-input"
          />
          <span class="date-separator">-</span>
          <input
            :value="filterState.dateTo ?? ''"
            type="date"
            placeholder="结束日期"
            @change="onDateToChange"
            class="date-input"
          />
          <button 
            class="clear-btn" 
            @click="clearFilters"
            title="清除筛选"
          >
            ✖️ 清除
          </button>
        </div>
      </div>

      <!-- 分页信息 -->
      <div class="pagination-info">
        <span>共 {{ pagination.totalItems }} 条记录</span>
        <span>第 {{ pagination.currentPage }} / {{ pagination.totalPages }} 页</span>
      </div>

      <div class="transactions-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>学员</th>
              <th>金额</th>
              <th>类型</th>
              <th>状态</th>
              <th>备注</th>
              <th>日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="transactions.length === 0">
              <td colspan="8" class="empty-state">
                {{ loading ? '加载中...' : '暂无交易记录' }}
              </td>
            </tr>
            <tr
              v-for="transaction in transactions"
              :key="transaction.uid"
            >
              <td>{{ transaction.uid }}</td>
              <td>
                <span v-if="transaction.student_id">
                  学员 #{{ transaction.student_id }}
                </span>
                <span v-else class="no-student">无关联</span>
              </td>
              <td :class="['amount', getAmountClass(transaction)]">
                {{ formatTransactionAmount(transaction) }}
              </td>
              <td>
                <span :class="['transaction-type', getAmountClass(transaction)]">
                  {{ getTransactionTypeText(transaction) }}
                </span>
              </td>
              <td>
                <span
                  v-if="transaction.is_installment && transaction.installment"
                  :class="['status-badge', getStatusClass(transaction.installment.status)]"
                >
                  {{ getStatusText(transaction.installment.status) }}
                  <br>
                  <small>
                    {{ transaction.installment.installment_number || 1 }}/{{ transaction.installment.total_installments || 1 }}
                  </small>
                </span>
                <span v-else>-</span>
              </td>
              <td class="note-cell">
                {{ transaction.note || '-' }}
              </td>
              <td class="date-cell">
                {{ formatDate(transaction.created_at) }}
              </td>
              <td class="actions">
                <button
                  v-if="transaction.is_installment && transaction.installment"
                  class="action-btn status-btn"
                  @click="showUpdateStatusModal(transaction)"
                  title="更新状态"
                >
                  🔄
                </button>
                <button
                  class="action-btn delete-btn"
                  @click="deleteTransaction(transaction.uid)"
                  aria-label="删除交易"
                  title="删除交易"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页控件 -->
      <div class="pagination-controls">
        <button
          @click="goToPage(pagination.currentPage - 1)"
          :disabled="pagination.currentPage <= 1 || loading"
          class="page-btn"
        >
          ← 上一页
        </button>
        <span class="page-info">
          第 {{ pagination.currentPage }} 页，共 {{ pagination.totalPages }} 页
        </span>
        <button
          @click="goToPage(pagination.currentPage + 1)"
          :disabled="pagination.currentPage >= pagination.totalPages || loading"
          class="page-btn"
        >
          下一页 →
        </button>
      </div>
    </div>

    <!-- 添加交易模态框 -->
    <div v-if="showAddTransaction" class="modal-overlay" @click="closeModals">
      <div
        class="modal"
        @click.stop
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div class="modal-header">
          <h3 id="modal-title">添加交易</h3>
          <button
            class="close-btn"
            @click="closeModals"
            aria-label="关闭模态框"
          >
            ✖️
          </button>
        </div>
        <div class="modal-body">
          <TransactionForm
            :model-value="currentTransaction"
            :students="students"
            @update:modelValue="handleTransactionUpdate"
          />
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModals">取消</button>
          <button
            class="save-btn"
            @click="saveTransaction"
            :disabled="loading"
            :title="loading ? '请稍候...' : '保存交易'"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <!-- 更新分期状态模态框 -->
    <div
      v-if="showUpdateStatus"
      class="modal-overlay"
      @click="closeModals"
    >
      <div
        class="modal"
        @click.stop
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
      >
        <div class="modal-header">
          <h3 id="status-modal-title">更新分期状态</h3>
          <button
            class="close-btn"
            @click="closeModals"
            aria-label="关闭模态框"
          >
            ✖️
          </button>
        </div>
        <div class="modal-body">
          <div v-if="selectedTransaction" class="status-info">
            <p><strong>交易ID:</strong> {{ selectedTransaction.uid }}</p>
            <p v-if="selectedTransaction.installment">
              <strong>分期:</strong> 
              {{ selectedTransaction.installment.installment_number || 1 }} / 
              {{ selectedTransaction.installment.total_installments || 1 }}
            </p>
            <p><strong>金额:</strong> {{ formatCurrency(selectedTransaction.amount) }}</p>
          </div>
          <div class="form-group">
            <label for="status-select">选择状态</label>
            <select
              id="status-select"
              :value="selectedStatus"
              @change="onStatusChange"
            >
              <option
                v-for="status in INSTALLMENT_STATUS_VALUES"
                :key="status"
                :value="status"
              >
                {{ getStatusText(status) }}
              </option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModals">取消</button>
          <button
            class="save-btn"
            @click="updateInstallmentStatus"
            :disabled="loading"
          >
            更新
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { useTransactionStore } from '../stores/transaction';
import { ApiService } from '../api/ApiService';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/dataTransformers';
import TransactionForm from './TransactionForm.vue';
import { InstallmentStatus, PaymentFrequency } from '../types/api';
import type { Transaction, Student } from '../types/api';
import type { TransactionFormModel, TransactionFilterState, TransactionTypeFilter } from '../types/forms';


interface PaginationState {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// 使用新的Pinia stores
const appStore = useAppStore();
const transactionStore = useTransactionStore();

// 使用store状态，减少本地状态
const showUpdateStatus = ref<boolean>(false);
const selectedStatus = ref<InstallmentStatus>(InstallmentStatus.PENDING);
const selectedTransaction = ref<Transaction | null>(null);

// 筛选状态
const filterState = ref<TransactionFilterState>({
  type: 'all',
  search: '',
  dateFrom: null,
  dateTo: null,
});

// 学生列表
const students = ref<Student[]>([]);

// 获取store中的状态
const loading = computed(() => appStore.isLoading);
const transactions = computed(() => transactionStore.transactions);
const showAddTransaction = computed(() => transactionStore.showAddTransaction);

// 分页状态 - 使用store中的分页
const pagination = computed(() => transactionStore.pagination);

// 时间周期 - 使用store中的状态
const selectedPeriod = computed(() => transactionStore.selectedPeriod);
const timePeriods = [
  { value: 'Today', label: '今日' },
  { value: 'ThisWeek', label: '本周' },
  { value: 'ThisMonth', label: '本月' },
  { value: 'LastMonth', label: '上月' },
  { value: 'ThisQuarter', label: '本季' },
  { value: 'ThisYear', label: '本年' },
];

const INSTALLMENT_STATUS_VALUES = Object.values(InstallmentStatus) as InstallmentStatus[];

const getTodayString = (): string => new Date().toISOString().split('T')[0];

const createDefaultTransactionFormModel = (): TransactionFormModel => ({
  student_id: null,
  amount: 0,
  note: '',
  is_installment: false,
  is_expense: false,
  total_amount: 0,
  total_installments: 2,
  frequency: PaymentFrequency.MONTHLY,
  custom_days: null,
  due_date: getTodayString(),
});

const normalizeTransactionFormModel = (value: TransactionFormModel): TransactionFormModel => {
  const defaults = createDefaultTransactionFormModel();

  const normalized: TransactionFormModel = {
    ...defaults,
    ...value,
  };

  normalized.student_id = value.student_id ?? defaults.student_id;
  normalized.amount = Number.isFinite(value.amount) ? value.amount : defaults.amount;
  normalized.note = value.note ?? defaults.note;
  normalized.is_installment = Boolean(value.is_installment);
  normalized.is_expense = Boolean(value.is_expense);

  normalized.total_amount =
    typeof value.total_amount === 'number' && Number.isFinite(value.total_amount)
      ? value.total_amount
      : defaults.total_amount;

  normalized.total_installments =
    typeof value.total_installments === 'number' &&
    Number.isFinite(value.total_installments) &&
    value.total_installments > 0
      ? Math.floor(value.total_installments)
      : defaults.total_installments;

  normalized.frequency = value.frequency ?? defaults.frequency;
  normalized.due_date = value.due_date ?? defaults.due_date;

  if (normalized.is_installment && normalized.frequency === PaymentFrequency.CUSTOM) {
    normalized.custom_days =
      typeof value.custom_days === 'number' &&
      Number.isFinite(value.custom_days) &&
      value.custom_days > 0
        ? Math.floor(value.custom_days)
        : 30;
  } else {
    normalized.custom_days = null;
  }

  return normalized;
};

const normalizeInstallmentStatus = (
  status: string | InstallmentStatus | null | undefined,
): InstallmentStatus => {
  if (status && INSTALLMENT_STATUS_VALUES.includes(status as InstallmentStatus)) {
    return status as InstallmentStatus;
  }
  return InstallmentStatus.PENDING;
};

const STATUS_CLASS_MAP: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PAID]: 'status-paid',
  [InstallmentStatus.PENDING]: 'status-pending',
  [InstallmentStatus.OVERDUE]: 'status-overdue',
  [InstallmentStatus.CANCELLED]: 'status-cancelled',
};

const STATUS_TEXT_MAP: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PAID]: '已支付',
  [InstallmentStatus.PENDING]: '待处理',
  [InstallmentStatus.OVERDUE]: '逾期',
  [InstallmentStatus.CANCELLED]: '已取消',
};

// 当前交易表单数据
const currentTransaction = ref<TransactionFormModel>(createDefaultTransactionFormModel());

// 计算属性 - 直接使用store中的computed
const totalIncome = computed(() => transactionStore.totalIncome);
const totalExpense = computed(() => transactionStore.totalExpense);
const netProfit = computed(() => transactionStore.netProfit);
const installmentCount = computed(() => transactionStore.installmentTransactions.length);

const pendingInstallments = computed(() => transactionStore.pendingInstallments);

// 方法
const formatCurrency = (value: number): string => {
  return formatCurrencyUtil(value);
};

const formatDate = (date: string | undefined): string => {
  return formatDateUtil(date, 'date');
};

const formatTransactionAmount = (transaction: Transaction): string => {
  return formatCurrency(transaction.amount);
};

const getAmountClass = (transaction: Transaction): string => {
  return transaction.amount >= 0 ? 'income' : 'expense';
};

const getTransactionTypeText = (transaction: Transaction): string => {
  if (transaction.is_installment) {
    return '分期付款';
  }
  return transaction.amount >= 0 ? '收入' : '支出';
};

const getStatusClass = (status: string | null | undefined): string => {
  return STATUS_CLASS_MAP[normalizeInstallmentStatus(status)] ?? '';
};

const getStatusText = (status: string | null | undefined): string => {
  return STATUS_TEXT_MAP[normalizeInstallmentStatus(status)] ?? '未知';
};

const handleTransactionUpdate = (value: TransactionFormModel) => {
  currentTransaction.value = normalizeTransactionFormModel(value);
};

// 直接使用appStore的方法
const { showError, showSuccess } = appStore.errorHandler;
const showConfirm = appStore.showConfirm;

const onTransactionTypeChange = (event: Event) => {
  const target = event.currentTarget as HTMLSelectElement | null;
  if (!target) return;
  filterState.value = {
    ...filterState.value,
    type: target.value as TransactionTypeFilter,
  };
  applyFilters();
};

const onSearchInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  filterState.value = {
    ...filterState.value,
    search: target.value,
  };
  applyFilters();
};

const onDateFromChange = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  filterState.value = {
    ...filterState.value,
    dateFrom: target.value ? target.value : null,
  };
  applyFilters();
};

const onDateToChange = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  filterState.value = {
    ...filterState.value,
    dateTo: target.value ? target.value : null,
  };
  applyFilters();
};

const onStatusChange = (event: Event) => {
  const target = event.currentTarget as HTMLSelectElement | null;
  if (!target) return;
  selectedStatus.value = normalizeInstallmentStatus(target.value);
};

// 加载学员列表
const loadStudents = async () => {
  try {
    const response = await ApiService.getAllStudents();
    students.value = response.students || [];
  } catch (error) {
    console.error('加载学员数据失败:', error);
    showError('加载学员数据时发生错误');
  }
};

// 加载交易列表 - 使用store的方法
const loadTransactions = async () => {
  try {
    await transactionStore.fetchTransactions();
    console.log(`✅ 成功加载 ${transactionStore.transactions.length} 条交易记录`);
  } catch (error) {
    console.error('加载交易数据失败:', error);
    appStore.errorHandler.showError('加载失败', '加载交易数据时发生错误');
  }
};

// 应用筛选
const applyFilters = () => {
  loadTransactions();
};

// 清除筛选
const clearFilters = () => {
  filterState.value = {
    type: 'all',
    search: '',
    dateFrom: null,
    dateTo: null,
  };
  applyFilters();
};

// 分页
const goToPage = (page: number) => {
  if (page < 1 || page > pagination.value.totalPages) return;
  loadTransactions();
};

// 时间周期选择
// 时间周期选择 - 使用store的方法
const selectTimePeriod = async (period: string) => {
  try {
    await transactionStore.setSelectedPeriod(period);
    await loadTransactions();
  } catch (error) {
    appStore.errorHandler.showError('切换时间周期失败', '无法切换到选定的时间周期');
  }
};

// 打开添加交易模态框 - 使用store的方法
const openAddTransactionModal = () => {
  currentTransaction.value = createDefaultTransactionFormModel();
  transactionStore.toggleAddTransaction(true);
};

// 保存交易
const saveTransaction = async () => {
  if (loading.value) return;

  const normalizedForm = normalizeTransactionFormModel(currentTransaction.value);
  currentTransaction.value = normalizedForm;
  const formData = normalizedForm;

  // 验证
  if (!formData.is_installment && formData.amount <= 0) {
    showError('请输入有效的金额');
    return;
  }

  if (formData.is_installment) {
    if (!formData.total_amount || formData.total_amount <= 0) {
      showError('请输入有效的总金额');
      return;
    }
    if (!formData.total_installments || formData.total_installments < 2) {
      showError('分期数必须至少为2');
      return;
    }
    if (!formData.due_date) {
      showError('请选择首次到期日');
      return;
    }
  }

  try {
    if (formData.is_installment) {
      // 保存分期交易
      const data = {
        student_id: formData.student_id,
        amount: formData.total_amount!,
        total_installments: formData.total_installments!,
        frequency: String(formData.frequency!),
        custom_days:
          formData.frequency === PaymentFrequency.CUSTOM ? formData.custom_days : null,
        start_date: formData.due_date || undefined,
        note: formData.note ? formData.note : null,
      };

      await ApiService.addInstallmentTransaction(data);
      showSuccess('分期付款已创建');
    } else {
      // 保存普通交易
      const amount = formData.is_expense ? -Math.abs(formData.amount) : Math.abs(formData.amount);

      const data = {
        student_id: formData.student_id,
        amount,
        note: formData.note ? formData.note : null,
      };

      await ApiService.addCashTransaction(data);
      showSuccess('交易已保存');
    }

    closeModals();
    await loadTransactions();
  } catch (error) {
    console.error('保存交易失败:', error);
    showError('保存交易时发生错误');
  }
};

// 删除交易
const deleteTransaction = async (uid: number) => {
  const transaction = transactions.value.find((t) => t.uid === uid);
  const message = transaction
    ? `确定要删除这条交易记录吗？\n金额: ${formatCurrency(transaction.amount)}`
    : '确定要删除这条交易记录吗？';

  showConfirm({
    title: '删除交易记录',
    message: message,
    confirmText: '删除',
    cancelText: '取消',
    confirmType: 'danger',
    onConfirm: async () => {
      try {
        await ApiService.deleteCashTransaction(uid);
        showSuccess('交易记录已删除');
        await loadTransactions();
      } catch (error: any) {
        console.error('删除交易失败:', error);
        showError('删除交易记录时发生错误');
      }
    },
  });
};

// 显示更新状态模态框
const showUpdateStatusModal = (transaction: Transaction) => {
  selectedTransaction.value = transaction;
  selectedStatus.value = normalizeInstallmentStatus(transaction.installment?.status);
  showUpdateStatus.value = true;
};

// 更新分期状态
const updateInstallmentStatus = async () => {
  if (!selectedTransaction.value || !selectedTransaction.value.installment) return;

  try {
    // 使用 installment_uid 或交易 uid
    const installmentId = selectedTransaction.value.installment.installment_uid || selectedTransaction.value.uid;

    await ApiService.updateInstallmentStatus(installmentId, selectedStatus.value);
    showSuccess('分期状态已更新');
    closeModals();
    await loadTransactions();
  } catch (error) {
    console.error('更新分期状态失败:', error);
    showError('更新分期状态时发生错误');
  }
};

// 关闭模态框
const closeModals = () => {
  transactionStore.toggleAddTransaction(false);
  showUpdateStatus.value = false;
  selectedTransaction.value = null;
  currentTransaction.value = createDefaultTransactionFormModel();
  selectedStatus.value = InstallmentStatus.PENDING;
};

// 强制刷新
const forceRefresh = () => {
  loadTransactions();
};

// 生命周期
onMounted(async () => {
  await loadStudents();
  await loadTransactions();
});
</script>

<style scoped>
.financial-statistics {
  padding: 1rem;
}

.loading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3498db 0%, #2ecc71 100%);
  animation: progress 1.5s ease-in-out infinite;
  z-index: 9999;
}

@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h2 {
  font-size: 1.8rem;
  font-weight: 600;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.refresh-btn,
.add-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn {
  background: #ecf0f1;
  color: #34495e;
}

.refresh-btn:hover:not(:disabled) {
  background: #bdc3c7;
}

.add-btn {
  background: #3498db;
  color: white;
}

.add-btn:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.refresh-btn:disabled,
.add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 时间周期选择器 */
.time-period-selector {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.time-period-selector h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.period-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.period-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #ecf0f1;
  background: white;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #34495e;
  cursor: pointer;
  transition: all 0.2s ease;
}

.period-btn:hover:not(:disabled) {
  border-color: #3498db;
  color: #3498db;
  transform: translateY(-1px);
}

.period-btn.active {
  background: #3498db;
  border-color: #3498db;
  color: white;
}

.period-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 总览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-icon {
  font-size: 2.5rem;
}

.card-content {
  flex: 1;
}

.card-content h3 {
  font-size: 0.9rem;
  font-weight: 500;
  color: #7f8c8d;
  margin-bottom: 0.5rem;
}

.card-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
}

.card-subtext {
  font-size: 0.85rem;
  color: #95a5a6;
  margin-top: 0.5rem;
}

.overview-card.income .card-value {
  color: #27ae60;
}

.overview-card.expense .card-value {
  color: #e74c3c;
}

.overview-card.balance .card-value {
  color: #3498db;
}

/* 交易记录部分 */
.transactions-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.transactions-header {
  margin-bottom: 1.5rem;
}

.transactions-header h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-controls select,
.search-input {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.filter-controls select {
  min-width: 150px;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.filter-controls select:focus,
.search-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.date-filter {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.date-input {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.date-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.date-separator {
  color: #95a5a6;
  font-weight: 500;
}

.clear-btn {
  padding: 0.75rem 1rem;
  border: 1px solid #e74c3c;
  background: white;
  color: #e74c3c;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: #e74c3c;
  color: white;
}

/* 分页信息 */
.pagination-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #7f8c8d;
}

/* 表格样式 */
.transactions-table {
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8f9fa;
}

th,
td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #ecf0f1;
}

th {
  font-weight: 600;
  color: #34495e;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

td {
  color: #2c3e50;
}

tbody tr {
  transition: background-color 0.2s ease;
}

tbody tr:hover {
  background: #f8f9fa;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #95a5a6;
  font-style: italic;
}

.amount {
  font-weight: 600;
  font-size: 1.05rem;
}

.amount.income {
  color: #27ae60;
}

.amount.expense {
  color: #e74c3c;
}

.transaction-type {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
}

.transaction-type.income {
  background: #d5f4e6;
  color: #27ae60;
}

.transaction-type.expense {
  background: #fadbd8;
  color: #e74c3c;
}

.status-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.4;
}

.status-paid {
  background: #d5f4e6;
  color: #27ae60;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-overdue {
  background: #fadbd8;
  color: #e74c3c;
}

.status-cancelled {
  background: #e2e3e5;
  color: #6c757d;
}

.no-student {
  color: #95a5a6;
  font-style: italic;
}

.note-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-cell {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  transition: transform 0.2s ease;
  border-radius: 4px;
}

.action-btn:hover {
  transform: scale(1.1);
  background: #f8f9fa;
}

.delete-btn:hover {
  background: #fadbd8;
}

/* 分页控件 */
.pagination-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
}

.page-btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.95rem;
  color: #7f8c8d;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #ecf0f1;
}

.modal-header h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2c3e50;
}

.close-btn {
  padding: 0.5rem;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #e74c3c;
}

.modal-body {
  padding: 1.5rem;
}

.status-info {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.status-info p {
  margin: 0.5rem 0;
  color: #2c3e50;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #2c3e50;
}

.form-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.form-group select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #ecf0f1;
}

.cancel-btn,
.save-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: #ecf0f1;
  color: #34495e;
}

.cancel-btn:hover {
  background: #bdc3c7;
}

.save-btn {
  background: #3498db;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<template>
  <div class="finance-page" data-testid="financial-statistics">
    
    <!-- 顶部控制栏 -->
    <header class="finance-header">
      <!-- 左侧：标题 + 时间周期 -->
      <div class="header-left">
        <!-- 移动端隐藏标题，节省空间 -->
        <h2 class="page-title mobile-hidden">收支管理</h2>
        
        <!-- 时间周期胶囊 (支持横向滚动) -->
        <div class="period-scroll-container">
          <div class="period-capsule">
            <button
              v-for="period in timePeriods"
              :key="period.value"
              :class="['capsule-item', { active: selectedPeriod === period.value }]"
              @click="selectTimePeriod(period.value)"
              :disabled="loading"
            >
              {{ period.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧：操作按钮 (固定宽度，不被压缩) -->
      <div class="header-right">
        <button
          class="btn btn-icon-only"
          @click="forceRefresh"
          :disabled="loading"
          title="刷新数据"
        >
          <RefreshCw :size="20" :class="{ 'spinning': loading }" />
        </button>
        <button
          class="btn btn-primary compact-btn"
          @click="openAddTransactionModal"
          :disabled="loading"
        >
          <Plus :size="20" />
          <span class="btn-text">记一笔</span>
        </button>
      </div>
    </header>

    <!-- 核心指标卡片 -->
    <div class="stats-overview" data-testid="overview-cards">
      <!-- 收入 -->
      <div class="stat-card income-theme" data-testid="income-card">
        <div class="card-icon-bg">
          <TrendingUp :size="24" />
        </div>
        <div class="card-content">
          <span class="card-label">总收入</span>
          <div class="card-value" data-testid="total-income">
            {{ formatCurrency(totalIncome) }}
          </div>
        </div>
      </div>

      <!-- 支出 -->
      <div class="stat-card expense-theme" data-testid="expense-card">
        <div class="card-icon-bg">
          <TrendingDown :size="24" />
        </div>
        <div class="card-content">
          <span class="card-label">总支出</span>
          <div class="card-value" data-testid="total-expense">
            {{ formatCurrency(totalExpense) }}
          </div>
        </div>
      </div>

      <!-- 净收益 -->
      <div class="stat-card balance-theme" data-testid="balance-card">
        <div class="card-icon-bg">
          <Wallet :size="24" />
        </div>
        <div class="card-content">
          <span class="card-label">净收益</span>
          <div class="card-value" data-testid="net-profit">
            {{ formatCurrency(netProfit) }}
          </div>
        </div>
      </div>

      <!-- 分期概览 -->
      <div class="stat-card installment-theme" data-testid="installment-card">
        <div class="card-icon-bg">
          <CalendarClock :size="24" />
        </div>
        <div class="card-content">
          <span class="card-label">分期付款</span>
          <div class="installment-metrics">
            <span class="metric-val" data-testid="installment-count">{{ installmentCount }} 笔</span>
            <span class="metric-sep">/</span>
            <span class="metric-sub" data-testid="pending-installments">
              {{ pendingInstallments }} 待处理
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 交易明细面板 -->
    <div class="transactions-panel">
      <!-- 筛选工具栏 -->
      <div class="panel-toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <Search :size="16" class="search-icon" />
            <input
              :value="filterState.search"
              type="text"
              placeholder="搜索备注..."
              @input="onSearchInput"
              class="search-input"
            />
          </div>

          <div class="filter-actions">
            <!-- 移动端将筛选折叠为图标，这里简化展示 -->
            <select :value="filterState.type" @change="onTransactionTypeChange" class="filter-select">
              <option value="all">类型: 全部</option>
              <option value="income">收入</option>
              <option value="expense">支出</option>
              <option value="installment">分期</option>
            </select>
          </div>
        </div>
        
        <div class="toolbar-right mobile-hidden">
          <span class="pagination-summary">
            {{ pagination.totalItems }} 条记录
          </span>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-date">日期</th>
              <th class="col-info">交易信息</th>
              <th class="col-amount text-right">金额</th>
              <th class="col-actions text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="transactions.length === 0">
              <td colspan="4">
                <div class="empty-state">
                  <Inbox :size="48" class="empty-icon" />
                  <p>{{ loading ? '数据加载中...' : '暂无交易记录' }}</p>
                </div>
              </td>
            </tr>
            <tr
              v-for="transaction in transactions"
              :key="transaction.uid"
              class="table-row"
            >
              <td class="col-date">
                <div class="date-wrapper">
                  <span class="date-day">{{ formatDate(transaction.created_at).split('-')[2] }}</span>
                  <span class="date-month">{{ formatDate(transaction.created_at).substring(5, 7) }}月</span>
                </div>
              </td>
              <td class="col-info">
                <div class="info-wrapper">
                  <div class="info-top">
                    <span v-if="transaction.student_id" class="student-badge">
                      <User :size="10" /> {{ transaction.student_id }}
                    </span>
                    <span :class="['type-badge', getTransactionTypeClass(transaction)]">
                      {{ getTransactionTypeText(transaction) }}
                    </span>
                    <!-- 分期状态 -->
                     <span v-if="transaction.is_installment && transaction.installment" 
                           :class="['status-text', getStatusClass(transaction.installment.status)]">
                      {{ getStatusText(transaction.installment.status) }}
                    </span>
                  </div>
                  <div class="info-note" v-if="transaction.note">
                    {{ transaction.note }}
                  </div>
                </div>
              </td>
              <td class="col-amount text-right">
                 <span :class="getAmountClass(transaction)" class="amount-text">
                  {{ formatTransactionAmount(transaction) }}
                </span>
                <div v-if="transaction.is_installment && transaction.installment" class="installment-progress">
                   {{ transaction.installment.installment_number }}/{{ transaction.installment.total_installments }}
                </div>
              </td>
              <td class="col-actions text-right">
                <div class="action-group">
                  <button
                    v-if="transaction.is_installment"
                    class="icon-btn"
                    @click="showUpdateStatusModal(transaction)"
                  >
                    <RefreshCw :size="16" />
                  </button>
                  <button
                    class="icon-btn delete"
                    @click="deleteTransaction(transaction.uid)"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页页脚 -->
      <div class="panel-footer">
        <button
          @click="goToPage(pagination.currentPage - 1)"
          :disabled="pagination.currentPage <= 1 || loading"
          class="pagination-btn"
        >
          <ChevronLeft :size="18" />
        </button>
        <span class="pagination-text">
          {{ pagination.currentPage }} / {{ pagination.totalPages }}
        </span>
        <button
          @click="goToPage(pagination.currentPage + 1)"
          :disabled="pagination.currentPage >= pagination.totalPages || loading"
          class="pagination-btn"
        >
          <ChevronRight :size="18" />
        </button>
      </div>
    </div>

    <!-- 🌟 关键修复：使用 Teleport 将模态框挂载到 body -->
    <Teleport to="body">
      <!-- 添加交易模态框 -->
      <div v-if="showAddTransaction" class="modal-overlay" @click="closeModals">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>添加新交易</h3>
            <button class="modal-close-btn" @click="closeModals"><X :size="24"/></button>
          </div>
          <div class="modal-body">
            <TransactionForm
              :model-value="currentTransaction"
              :students="students"
              @update:modelValue="handleTransactionUpdate"
            />
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModals">取消</button>
            <button class="btn btn-primary" @click="saveTransaction" :disabled="loading">
              保存
            </button>
          </div>
        </div>
      </div>

      <!-- 状态更新模态框 -->
      <div v-if="showUpdateStatus" class="modal-overlay" @click="closeModals">
        <div class="modal-content sm" @click.stop>
          <div class="modal-header">
            <h3>更新分期状态</h3>
            <button class="modal-close-btn" @click="closeModals"><X :size="24"/></button>
          </div>
          <div class="modal-body">
            <div class="status-summary" v-if="selectedTransaction">
               <div class="summary-item">
                 <span class="label">分期进度</span>
                 <span class="value">
                   {{ selectedTransaction.installment?.installment_number }} / 
                   {{ selectedTransaction.installment?.total_installments }}
                 </span>
               </div>
               <div class="summary-item">
                 <span class="label">本期金额</span>
                 <span class="value font-mono">{{ formatCurrency(selectedTransaction.amount) }}</span>
               </div>
            </div>
            
            <div class="form-group mt-4">
              <label>新状态</label>
              <div class="select-wrapper">
                <select :value="selectedStatus" @change="onStatusChange" class="form-select">
                  <option v-for="status in INSTALLMENT_STATUS_VALUES" :key="status" :value="status">
                    {{ getStatusText(status) }}
                  </option>
                </select>
                <ChevronDown :size="16" class="select-arrow" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModals">取消</button>
            <button class="btn btn-primary" @click="updateInstallmentStatus" :disabled="loading">
              更新状态
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// ... 这里保持之前的 Script 逻辑完全不变，无需修改 ...
// 务必保留上一版的所有 import 和 script setup 代码
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { useTransactionStore } from '../stores/transaction';
import { ApiService } from '../api/ApiService';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/dataTransformers';
import TransactionForm from './TransactionForm.vue';
import { InstallmentStatus, PaymentFrequency } from '../types/api';
import type { Transaction, Student } from '../types/api';
import type { TransactionFormModel, TransactionFilterState, TransactionTypeFilter } from '../types/forms';

// 引入图标
import { 
  RefreshCw, Plus, Search, 
  TrendingUp, TrendingDown, Wallet, CalendarClock,
  User, Trash2, ChevronLeft, ChevronRight, X, ChevronDown, Inbox
} from 'lucide-vue-next';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

const appStore = useAppStore();
const transactionStore = useTransactionStore();

const showUpdateStatus = ref<boolean>(false);
const selectedStatus = ref<InstallmentStatus>(InstallmentStatus.PENDING);
const selectedTransaction = ref<Transaction | null>(null);

const filterState = ref<TransactionFilterState>({
  type: 'all',
  search: '',
  dateFrom: null,
  dateTo: null,
});

const students = ref<Student[]>([]);
const loading = computed(() => appStore.isLoading);
const transactions = computed(() => transactionStore.transactions);
const showAddTransaction = computed(() => transactionStore.showAddTransaction);
const pagination = computed(() => transactionStore.pagination);
const selectedPeriod = computed(() => transactionStore.selectedPeriod);

const hasActiveFilters = computed(() => {
  return filterState.value.type !== 'all' || 
         filterState.value.search !== '' || 
         filterState.value.dateFrom !== null || 
         filterState.value.dateTo !== null;
});

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
  const normalized: TransactionFormModel = { ...defaults, ...value };
  normalized.student_id = value.student_id ?? defaults.student_id;
  normalized.amount = Number.isFinite(value.amount) ? value.amount : defaults.amount;
  normalized.note = value.note ?? defaults.note;
  normalized.is_installment = Boolean(value.is_installment);
  normalized.is_expense = Boolean(value.is_expense);
  normalized.total_amount = typeof value.total_amount === 'number' && Number.isFinite(value.total_amount) ? value.total_amount : defaults.total_amount;
  normalized.total_installments = typeof value.total_installments === 'number' && Number.isFinite(value.total_installments) && value.total_installments > 0 ? Math.floor(value.total_installments) : defaults.total_installments;
  normalized.frequency = value.frequency ?? defaults.frequency;
  normalized.due_date = value.due_date ?? defaults.due_date;

  if (normalized.is_installment && normalized.frequency === PaymentFrequency.CUSTOM) {
    normalized.custom_days = typeof value.custom_days === 'number' && Number.isFinite(value.custom_days) && value.custom_days > 0 ? Math.floor(value.custom_days) : 30;
  } else {
    normalized.custom_days = null;
  }
  return normalized;
};

const normalizeInstallmentStatus = (status: string | InstallmentStatus | null | undefined): InstallmentStatus => {
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

const currentTransaction = ref<TransactionFormModel>(createDefaultTransactionFormModel());
const totalIncome = computed(() => transactionStore.totalIncome);
const totalExpense = computed(() => transactionStore.totalExpense);
const netProfit = computed(() => transactionStore.netProfit);
const installmentCount = computed(() => transactionStore.installmentTransactions.length);
const pendingInstallments = computed(() => transactionStore.pendingInstallments);

// Formatters
const formatCurrency = (value: number) => formatCurrencyUtil(value);
const formatDate = (date: string | undefined) => formatDateUtil(date, 'date');
const formatTransactionAmount = (transaction: Transaction) => formatCurrency(transaction.amount);

const getAmountClass = (transaction: Transaction) => transaction.amount >= 0 ? 'text-income' : 'text-expense';

const getTransactionTypeText = (transaction: Transaction) => {
  if (transaction.is_installment) return '分期';
  return transaction.amount >= 0 ? '收入' : '支出';
};

const getTransactionTypeClass = (transaction: Transaction) => {
  if (transaction.is_installment) return 'badge-installment';
  return transaction.amount >= 0 ? 'badge-income' : 'badge-expense';
};

const getStatusClass = (status: string | null | undefined) => STATUS_CLASS_MAP[normalizeInstallmentStatus(status)] ?? '';
const getStatusText = (status: string | null | undefined) => STATUS_TEXT_MAP[normalizeInstallmentStatus(status)] ?? '未知';

const handleTransactionUpdate = (value: TransactionFormModel) => {
  currentTransaction.value = normalizeTransactionFormModel(value);
};

const { showError, showSuccess } = appStore.errorHandler;
const showConfirm = appStore.showConfirm;

// Event Handlers
const onTransactionTypeChange = (event: Event) => {
  const target = event.currentTarget as HTMLSelectElement | null;
  if (!target) return;
  filterState.value = { ...filterState.value, type: target.value as TransactionTypeFilter };
  applyFilters();
};

const onSearchInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  filterState.value = { ...filterState.value, search: target.value };
  applyFilters();
};

const onDateFromChange = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  filterState.value = { ...filterState.value, dateFrom: target.value ? target.value : null };
  applyFilters();
};

const onDateToChange = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  filterState.value = { ...filterState.value, dateTo: target.value ? target.value : null };
  applyFilters();
};

const onStatusChange = (event: Event) => {
  const target = event.currentTarget as HTMLSelectElement | null;
  if (!target) return;
  selectedStatus.value = normalizeInstallmentStatus(target.value);
};

const loadStudents = async () => {
  try {
    const response = await ApiService.getAllStudents();
    students.value = response.students || [];
  } catch (error) {
    showError('加载学员数据时发生错误');
  }
};

const loadTransactions = async () => {
  try {
    await transactionStore.fetchTransactions();
  } catch (error) {
    appStore.errorHandler.showError('加载失败', '加载交易数据时发生错误');
  }
};

const applyFilters = () => loadTransactions();

const clearFilters = () => {
  filterState.value = { type: 'all', search: '', dateFrom: null, dateTo: null };
  applyFilters();
};

const goToPage = (page: number) => {
  if (page < 1 || page > pagination.value.totalPages) return;
  loadTransactions();
};

const selectTimePeriod = async (period: string) => {
  try {
    await transactionStore.setSelectedPeriod(period);
    await loadTransactions();
  } catch (error) {
    appStore.errorHandler.showError('切换失败');
  }
};

const openAddTransactionModal = () => {
  currentTransaction.value = createDefaultTransactionFormModel();
  transactionStore.toggleAddTransaction(true);
};

const saveTransaction = async () => {
  if (loading.value) return;
  const formData = normalizeTransactionFormModel(currentTransaction.value);
  currentTransaction.value = formData;

  if (!formData.is_installment && formData.amount <= 0) {
    showError('请输入有效的金额');
    return;
  }
  if (formData.is_installment) {
    if (!formData.total_amount || formData.total_amount <= 0) { showError('请输入有效的总金额'); return; }
    if (!formData.total_installments || formData.total_installments < 2) { showError('分期数必须至少为2'); return; }
    if (!formData.due_date) { showError('请选择首次到期日'); return; }
  }

  try {
    if (formData.is_installment) {
      await ApiService.addInstallmentTransaction({
        student_id: formData.student_id,
        amount: formData.total_amount!,
        total_installments: formData.total_installments!,
        frequency: String(formData.frequency!),
        custom_days: formData.frequency === PaymentFrequency.CUSTOM ? formData.custom_days : null,
        start_date: formData.due_date || undefined,
        note: formData.note ? formData.note : null,
      });
      showSuccess('分期付款已创建');
    } else {
      const amount = formData.is_expense ? -Math.abs(formData.amount) : Math.abs(formData.amount);
      await ApiService.addCashTransaction({
        student_id: formData.student_id,
        amount,
        note: formData.note ? formData.note : null,
      });
      showSuccess('交易已保存');
    }
    closeModals();
    await loadTransactions();
  } catch (error) {
    showError('保存交易时发生错误');
  }
};

const deleteTransaction = async (uid: number) => {
  const transaction = transactions.value.find((t) => t.uid === uid);
  const message = transaction ? `确定要删除此条记录？\n金额: ${formatCurrency(transaction.amount)}` : '确定删除？';
  
  showConfirm({
    title: '删除记录',
    message: message,
    confirmText: '删除',
    cancelText: '取消',
    confirmType: 'danger',
    onConfirm: async () => {
      try {
        await ApiService.deleteCashTransaction(uid);
        showSuccess('已删除');
        await loadTransactions();
      } catch (error) {
        showError('删除失败');
      }
    },
  });
};

const showUpdateStatusModal = (transaction: Transaction) => {
  selectedTransaction.value = transaction;
  selectedStatus.value = normalizeInstallmentStatus(transaction.installment?.status);
  showUpdateStatus.value = true;
};

const updateInstallmentStatus = async () => {
  if (!selectedTransaction.value || !selectedTransaction.value.installment) return;
  try {
    const installmentId = selectedTransaction.value.installment.installment_uid || selectedTransaction.value.uid;
    await ApiService.updateInstallmentStatus(installmentId, selectedStatus.value);
    showSuccess('状态已更新');
    closeModals();
    await loadTransactions();
  } catch (error) {
    showError('更新失败');
  }
};

const closeModals = () => {
  transactionStore.toggleAddTransaction(false);
  showUpdateStatus.value = false;
  selectedTransaction.value = null;
  currentTransaction.value = createDefaultTransactionFormModel();
  selectedStatus.value = InstallmentStatus.PENDING;
};

const forceRefresh = () => loadTransactions();

onMounted(async () => {
  await loadStudents();
  await loadTransactions();
});
</script>

<style scoped>
.finance-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
  padding-bottom: 2rem;
}

/* === Header (Mobile Optimized) === */
.finance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background-color: var(--bg-surface);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  flex-wrap: nowrap; /* 关键：禁止换行 */
}

.header-left {
  flex: 1;
  min-width: 0; /* 关键：允许Flex子项收缩 */
  overflow: hidden;
}

.period-scroll-container {
  width: 100%;
  overflow-x: auto;
  /* 隐藏滚动条 */
  scrollbar-width: none; 
  -ms-overflow-style: none;
}
.period-scroll-container::-webkit-scrollbar {
  display: none;
}

.period-capsule {
  display: inline-flex;
  gap: 0.25rem;
  white-space: nowrap; /* 防止内部按钮换行 */
  padding-right: 1rem; /* 为滚动留出一点空间 */
}

.capsule-item {
  background: transparent;
  border: 1px solid transparent;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0; /* 防止按钮被压缩 */
}

.capsule-item.active {
  background-color: rgba(99, 102, 241, 0.1);
  color: var(--primary-color);
  border-color: rgba(99, 102, 241, 0.2);
  font-weight: 600;
}

.header-right {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0; /* 防止右侧按钮被压缩 */
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  height: 40px; /* 固定高度 */
}

.btn-icon-only {
  width: 40px;
  padding: 0;
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  font-weight: 500;
  white-space: nowrap;
}

/* === Stats Cards === */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 移动端一行两个 */
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-icon-bg {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
}

.card-content {
  display: flex;
  flex-direction: column;
}

.card-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.2rem;
}

.card-value {
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
}

/* Theme Colors */
.income-theme .card-icon-bg { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.income-theme .card-value { color: #10b981; }
.expense-theme .card-icon-bg { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.expense-theme .card-value { color: #ef4444; }
.balance-theme .card-icon-bg { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.balance-theme .card-value { color: #3b82f6; }
.installment-theme .card-icon-bg { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

.installment-metrics {
  font-size: 0.8rem;
  color: var(--text-primary);
}
.metric-sep { margin: 0 0.2rem; color: var(--border-subtle); }
.metric-sub { color: #f59e0b; }

/* === Transactions Panel === */
.transactions-panel {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  overflow: hidden;
}

.panel-toolbar {
  padding: 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.toolbar-left {
  display: flex;
  gap: 0.75rem;
}

.search-box {
  position: relative;
  flex: 1;
}
.search-icon {
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}
.search-input {
  width: 100%;
  padding: 0.5rem 0.5rem 0.5rem 2.2rem;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-app);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.filter-select {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-app);
  color: var(--text-primary);
  font-size: 0.85rem;
  max-width: 100px;
}

/* === Data Table (Mobile Optimized) === */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 500px; /* 保证表格不被过度压缩 */
}

.data-table th {
  text-align: left;
  padding: 0.8rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
  border-bottom: 1px solid var(--border-subtle);
}
.text-right { text-align: right !important; }

.data-table td {
  padding: 0.8rem;
  border-bottom: 1px solid var(--border-subtle);
  vertical-align: top;
}

/* Date Column */
.date-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--bg-app);
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  min-width: 40px;
}
.date-day { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); line-height: 1; }
.date-month { font-size: 0.7rem; color: var(--text-secondary); }

/* Info Column */
.info-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
  flex-wrap: wrap;
}
.info-note {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.student-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.7rem;
  background-color: var(--bg-hover);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  color: var(--text-secondary);
}

.type-badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}
.badge-income { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.badge-expense { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.badge-installment { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

.status-text { font-size: 0.7rem; font-weight: 500; }
.status-pending { color: #f59e0b; }
.status-paid { color: #10b981; }

.amount-text {
  font-weight: 600;
  font-size: 0.95rem;
  font-family: monospace;
}
.text-income { color: #10b981; }
.text-expense { color: #ef4444; }
.installment-progress { font-size: 0.7rem; color: var(--text-secondary); }

.action-group {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.3rem;
  cursor: pointer;
}
.icon-btn.delete { color: #ef4444; }

/* === Modals (Fixed) === */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.modal-content {
  background-color: var(--bg-surface); /* 确保深色模式下有背景色 */
  width: 100%;
  max-width: 500px;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid var(--border-subtle);
  max-height: 90vh;
  overflow-y: auto;
  animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 { margin: 0; font-size: 1.1rem; color: var(--text-primary); }

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-body { padding: 1.5rem; }
.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
}

@keyframes modal-pop {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* === Mobile Specific Overrides === */
@media (max-width: 768px) {
  .mobile-hidden { display: none; }
  
  .finance-page { padding: 0.75rem; }
  
  .stats-overview { grid-template-columns: 1fr 1fr; }
  
  /* 强制按钮样式 */
  .btn-text { display: block; }
}
</style>
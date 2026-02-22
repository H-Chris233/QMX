<template>
  <div class="finance-page" data-testid="financial-statistics">
    
    <!-- 顶部控制栏 -->
    <header class="finance-header">
      <!-- 左侧：标题 + 时间周期 -->
      <div class="header-left">
        <!-- 移动端隐藏标题，节省空间 -->
        <h2 class="page-title mobile-hidden">收支统计</h2>
        
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
          data-testid="refresh-btn"
        >
          <RefreshCw :size="20" :class="{ 'spinning': loading }" />
        </button>
        <button
          class="btn btn-primary compact-btn"
          @click="openAddTransactionModal"
          :disabled="loading"
          data-testid="add-transaction-btn"
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

    <!-- 分期付款管理卡片 -->
    <div class="installment-panel" data-testid="pending-installments-panel">
      <div class="installment-panel-header">
        <div class="installment-panel-title">
          <div class="panel-icon">
            <CalendarClock :size="20" />
          </div>
          <div class="panel-title-text">
            <span class="main-title">分期付款管理</span>
            <span class="sub-title">{{ filteredInstallmentPlans.length }} 个计划</span>
          </div>
        </div>
        <div class="installment-panel-summary">
          <div class="summary-pill pending">
            <span class="pill-dot"></span>
            <span class="pill-count">{{ pendingInstallmentTermCount }}</span>
            <span class="pill-label">待处理</span>
          </div>
          <div class="summary-pill overdue" v-if="overdueInstallmentTermCount > 0">
            <span class="pill-dot"></span>
            <span class="pill-count">{{ overdueInstallmentTermCount }}</span>
            <span class="pill-label">逾期</span>
          </div>
          <div class="summary-pill total">
            <span class="pill-count">{{ installmentTermCount }}</span>
            <span class="pill-label">总期数</span>
          </div>
        </div>
      </div>

      <div class="installment-filter-row">
        <button
          v-for="status in installmentFilters"
          :key="status.value"
          :class="['installment-filter-btn', { active: installmentFilter === status.value }]"
          @click="installmentFilter = status.value"
          :disabled="loading || installmentLoading"
        >
          {{ status.label }}
        </button>
      </div>

      <div class="installment-list-container">
        <div v-if="installmentLoading" class="installment-loading">
          <div class="loading-spinner"></div>
          <span>分期数据加载中...</span>
        </div>
        <div v-else-if="filteredInstallmentPlans.length === 0" class="installment-empty">
          <CalendarClock :size="32" />
          <span>暂无分期记录</span>
        </div>
        <div v-else class="installment-cards">
          <div
            v-for="(plan, index) in filteredInstallmentPlans"
            :key="plan.uid"
            class="installment-card"
            :style="{ animationDelay: `${index * 60}ms` }"
          >
            <!-- 左侧：学员信息 -->
            <div class="installment-card-left">
              <div class="student-avatar" :class="getPlanStatusColor(plan)">
                {{ plan.studentName.charAt(0).toUpperCase() }}
              </div>
              <div class="student-info">
                <div class="student-name">{{ plan.studentName }}</div>
                <div class="student-meta">
                  <span class="meta-id">UID: {{ plan.studentId ?? '未关联' }}</span>
                </div>
              </div>
            </div>

            <!-- 中间：进度与金额 -->
            <div class="installment-card-middle">
              <div class="progress-section">
                <div class="progress-header">
                  <span class="progress-text">{{ plan.paidCount }} / {{ plan.totalInstallments }} 已支付</span>
                  <span class="progress-percent">{{ Math.round((plan.paidCount / plan.totalInstallments) * 100) }}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${(plan.paidCount / plan.totalInstallments) * 100}%` }"></div>
                </div>
                <div class="progress-meta">
                  <span v-if="plan.pendingCount > 0" class="meta-tag pending">待处理 {{ plan.pendingCount }}</span>
                  <span v-if="plan.overdueCount > 0" class="meta-tag overdue">逾期 {{ plan.overdueCount }}</span>
                  <span v-if="plan.cancelledCount > 0" class="meta-tag cancelled">已取消 {{ plan.cancelledCount }}</span>
                </div>
              </div>
            </div>

            <!-- 右侧：金额、状态、操作 -->
            <div class="installment-card-right">
              <div class="amount-section">
                <div class="amount-value">{{ formatCurrency(plan.totalAmount) }}</div>
                <div class="due-date" v-if="plan.nextDueDate">
                  下次到期: {{ formatDate(plan.nextDueDate) }}
                </div>
                <div class="due-date empty" v-else>暂无待付</div>
              </div>
              <div class="status-badge" :class="getMergedStatusClass(plan.mergedStatus)">
                {{ getMergedStatusText(plan.mergedStatus) }}
              </div>
              <button
                class="manage-btn"
                :disabled="loading || installmentLoading"
                @click="openInstallmentPlanModal(plan)"
              >
                <span>管理</span>
                <ChevronRight :size="14" />
              </button>
            </div>
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

      <!-- 数据卡片列表 -->
      <div class="transaction-list">
        <div v-if="displayedTransactions.length === 0" class="empty-state">
          <Inbox :size="48" class="empty-icon" />
          <p>{{ loading ? '数据加载中...' : '暂无交易记录' }}</p>
        </div>
        
        <div
          v-for="(transaction, index) in displayedTransactions"
          :key="transaction.uid"
          class="transaction-card"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <!-- 左侧日期 -->
          <div class="transaction-date" :class="getDateThemeClass(transaction)">
            <span class="date-num">{{ formatDate(transaction.created_at).split('-')[2] }}</span>
            <span class="date-month">{{ formatDate(transaction.created_at).substring(5, 7) }}月</span>
          </div>
          
          <!-- 中间内容 -->
          <div class="transaction-body">
            <div class="transaction-header">
              <!-- 类型标签 -->
              <span :class="['type-tag', getTransactionTypeClass(transaction)]">
                <component
                  :is="getTransactionIcon(transaction)"
                  :size="12"
                  class="tag-icon"
                />
                {{ getTransactionTypeText(transaction) }}
              </span>
              
              <!-- 学员信息 -->
              <span v-if="transaction.student_id" class="student-chip">
                <User :size="10" />
                学员 {{ transaction.student_id }}
              </span>
              
              <!-- 分期状态 -->
              <span v-if="isInstallmentTransaction(transaction) && transaction.installment"
                    :class="['status-dot', getStatusClass(transaction.installment.status)]">
                {{ getStatusText(transaction.installment.status) }}
              </span>
            </div>
            
            <!-- 备注 -->
            <div class="transaction-note" v-if="transaction.note">
              {{ transaction.note }}
            </div>
            <div class="transaction-note empty" v-else>
              没有填写备注
            </div>
            
            <!-- 分期进度 -->
            <div v-if="isInstallmentTransaction(transaction) && getInstallmentProgressText(transaction)"
                 class="installment-mini">
              <div class="mini-progress">
                <div class="mini-bar" :style="{ width: getInstallmentProgressPercent(transaction) }"></div>
              </div>
              <span class="mini-text">{{ getInstallmentProgressText(transaction) }}</span>
            </div>
          </div>
          
          <!-- 右侧金额与操作 -->
          <div class="transaction-right">
            <span :class="['transaction-amount', getAmountClass(transaction)]">
              {{ formatTransactionAmount(transaction) }}
            </span>
            <div class="transaction-actions">
              <button
                v-if="!isInstallmentTransaction(transaction)"
                class="action-btn edit"
                @click="openEditTransactionModal(transaction)"
                title="编辑"
              >
                <Edit2 :size="14" />
              </button>
              <button
                class="action-btn delete"
                @click="deleteTransaction(transaction)"
                title="删除"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
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

      <!-- 编辑交易模态框 -->
      <div v-if="showEditTransaction" class="modal-overlay" @click="closeModals">
        <div class="modal-content sm" @click.stop>
          <div class="modal-header">
            <h3>编辑收支记录</h3>
            <button class="modal-close-btn" @click="closeModals"><X :size="24"/></button>
          </div>
          <div class="modal-body">
            <div class="status-summary">
              <div class="summary-item">
                <span class="label">记录类型</span>
                <span class="value">
                  {{ editTransactionForm.isInstallment ? '分期交易' : '普通交易' }}
                </span>
              </div>
              <div v-if="editTransactionForm.isInstallment" class="summary-item">
                <span class="label">分期进度</span>
                <span class="value">
                  {{ editTransactionForm.installmentNumber }} / {{ editTransactionForm.totalInstallments }}
                </span>
              </div>
            </div>

            <div v-if="!editTransactionForm.isInstallment" class="form-group mt-4">
              <label>收支类型</label>
              <div class="select-wrapper">
                <select v-model="editTransactionForm.isExpense" class="form-select">
                  <option :value="false">收入</option>
                  <option :value="true">支出</option>
                </select>
                <ChevronDown :size="16" class="select-arrow" />
              </div>
            </div>

            <div v-else class="form-group mt-4">
              <label>分期状态</label>
              <div class="select-wrapper">
                <select
                  v-model="editTransactionForm.installmentStatus"
                  class="form-select"
                  :disabled="!editTransactionForm.installmentUid"
                >
                  <option v-for="status in INSTALLMENT_STATUS_VALUES" :key="status" :value="status">
                    {{ getStatusText(status) }}
                  </option>
                </select>
                <ChevronDown :size="16" class="select-arrow" />
              </div>
              <div v-if="!editTransactionForm.installmentUid" class="field-hint">
                当前记录缺少分期ID，仅可修改备注。
              </div>
            </div>

            <div class="form-group mt-4">
              <label>{{ editTransactionForm.isInstallment ? '本期金额' : '金额' }}</label>
              <div class="input-wrapper">
                <input
                  v-model.number="editTransactionForm.amount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="form-input"
                  :placeholder="editTransactionForm.isInstallment ? '分期金额由计划计算，不可在此修改' : '请输入金额'"
                  :disabled="editTransactionForm.isInstallment"
                />
              </div>
            </div>

            <div class="form-group mt-4">
              <label>备注</label>
              <div class="input-wrapper">
                <textarea
                  v-model="editTransactionForm.note"
                  rows="3"
                  class="form-textarea"
                  placeholder="填写备注（可选）"
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModals">取消</button>
            <button class="btn btn-primary" @click="saveEditedTransaction" :disabled="loading">
              保存修改
            </button>
          </div>
        </div>
      </div>

      <!-- 分期详情管理弹窗 -->
      <div v-if="showInstallmentPlanModal && selectedInstallmentPlan" class="modal-overlay" @click="closeModals">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>分期详情管理</h3>
            <button class="modal-close-btn" @click="closeModals"><X :size="24"/></button>
          </div>
          <div class="modal-body">
            <div class="status-summary">
              <div class="summary-item">
                <span class="label">学员</span>
                <span class="value">
                  {{ selectedInstallmentPlan.studentName }} ({{ selectedInstallmentPlan.studentId ?? '未关联' }})
                </span>
              </div>
              <div class="summary-item">
                <span class="label">计划</span>
                <span class="value">
                  {{ selectedInstallmentPlan.totalInstallments }} 期 · {{ formatCurrency(selectedInstallmentPlan.totalAmount) }}
                </span>
              </div>
              <div class="summary-item">
                <span class="label">计划状态</span>
                <span class="value">{{ getPlanStatusText(selectedInstallmentPlan.planStatus) }}</span>
              </div>
              <div class="summary-item">
                <span class="label">合并状态</span>
                <span :class="['value', getMergedStatusClass(selectedInstallmentPlan.mergedStatus)]">
                  {{ getMergedStatusText(selectedInstallmentPlan.mergedStatus) }}
                </span>
              </div>
            </div>

            <div class="plan-editor">
              <div class="form-group">
                <label>计划总金额（元）</label>
                <div class="input-wrapper">
                  <input
                    v-model.number="planEditForm.totalAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    class="form-input"
                    placeholder="请输入计划总金额"
                    :disabled="loading || installmentLoading || installmentPlanSaving"
                  />
                </div>
              </div>
              <div class="form-group">
                <label>计划总期数</label>
                <div class="input-wrapper">
                  <input
                    v-model.number="planEditForm.totalInstallments"
                    type="number"
                    min="1"
                    step="1"
                    class="form-input"
                    placeholder="请输入计划总期数"
                    :disabled="loading || installmentLoading || installmentPlanSaving"
                  />
                </div>
              </div>
              <div class="form-group">
                <label>编辑计划状态</label>
                <div class="select-wrapper">
                  <select
                    v-model="planEditForm.status"
                    class="form-select"
                    :disabled="loading || installmentLoading || installmentPlanSaving"
                  >
                    <option v-for="item in planStatusOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                  <ChevronDown :size="16" class="select-arrow" />
                </div>
              </div>
              <div class="form-group">
                <label>计划备注</label>
                <div class="input-wrapper">
                  <textarea
                    v-model="planEditForm.note"
                    rows="2"
                    class="form-textarea"
                    placeholder="填写计划备注（可选）"
                    :disabled="loading || installmentLoading || installmentPlanSaving"
                  ></textarea>
                </div>
              </div>
              <div class="plan-editor-actions">
                <button
                  class="btn btn-primary compact-btn"
                  :disabled="loading || installmentLoading || installmentPlanSaving"
                  @click="saveInstallmentPlan"
                >
                  {{ installmentPlanSaving ? '保存中...' : '保存计划' }}
                </button>
              </div>
            </div>

            <div class="term-grid">
              <div
                v-for="term in selectedInstallmentPlan.terms"
                :key="term.uid"
                class="term-card"
              >
                <div class="term-card-head">
                  <span class="term-index">第 {{ term.currentInstallment }}/{{ term.totalInstallments }} 期</span>
                  <span :class="['status-text', getStatusClass(term.status)]">
                    {{ getStatusText(term.status) }}
                  </span>
                </div>
                <div class="term-amount">{{ formatCurrency(term.installmentAmount) }}</div>
                <div class="term-due">到期：{{ formatDate(term.dueDate) }}</div>
                <div class="term-actions">
                  <select
                    :value="term.status"
                    class="inline-status-select"
                    :disabled="loading || installmentLoading || Boolean(termUpdatingMap[term.uid])"
                    @change="onTermStatusChange(term, $event)"
                  >
                    <option v-for="status in INSTALLMENT_STATUS_VALUES" :key="status" :value="status">
                      {{ getStatusText(status) }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModals">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
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
import type { InstallmentPlan, Transaction, Student } from '../types/api';
import type { TransactionFormModel, TransactionFilterState, TransactionTypeFilter } from '../types/forms';

// 引入图标
import { 
  RefreshCw, Plus, Search, 
  TrendingUp, TrendingDown, Wallet, CalendarClock,
  User, Trash2, ChevronLeft, ChevronRight, X, ChevronDown, Inbox, Edit2
} from 'lucide-vue-next';

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface InstallmentTermView {
  uid: number;
  installmentAmount: number;
  currentInstallment: number;
  totalInstallments: number;
  dueDate: string;
  status: InstallmentStatus;
}

type InstallmentMergedStatus = 'ACTIVE' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED';
type InstallmentFilterValue = 'ALL' | InstallmentMergedStatus;

interface InstallmentPlanView {
  uid: number;
  studentId: number | null;
  studentName: string;
  totalAmount: number;
  totalInstallments: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  cancelledCount: number;
  mergedStatus: InstallmentMergedStatus;
  planStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  note: string;
  nextDueDate: string | null;
  terms: InstallmentTermView[];
}

const appStore = useAppStore();
const transactionStore = useTransactionStore();

const showEditTransaction = ref<boolean>(false);
const showInstallmentPlanModal = ref<boolean>(false);
const installmentPlanSaving = ref<boolean>(false);
const editingTransactionId = ref<number | null>(null);
const editingTransactionSource = ref<Transaction | null>(null);
const selectedInstallmentPlan = ref<InstallmentPlanView | null>(null);
const termUpdatingMap = ref<Record<number, boolean>>({});
const planEditForm = ref<{
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  note: string;
  totalAmount: number;
  totalInstallments: number;
}>({
  status: 'ACTIVE',
  note: '',
  totalAmount: 0,
  totalInstallments: 1,
});
const editTransactionForm = ref<{
  amount: number;
  note: string;
  isExpense: boolean;
  isInstallment: boolean;
  installmentUid: number | null;
  installmentNumber: number;
  totalInstallments: number;
  installmentStatus: InstallmentStatus;
  originalInstallmentStatus: InstallmentStatus;
}>({
  amount: 0,
  note: '',
  isExpense: false,
  isInstallment: false,
  installmentUid: null,
  installmentNumber: 1,
  totalInstallments: 1,
  installmentStatus: InstallmentStatus.PENDING,
  originalInstallmentStatus: InstallmentStatus.PENDING,
});

const filterState = ref<TransactionFilterState>({
  type: 'all',
  search: '',
  dateFrom: null,
  dateTo: null,
});

const students = ref<Student[]>([]);
const installmentPlans = ref<InstallmentPlanView[]>([]);
const installmentLoading = ref<boolean>(false);
const installmentFilter = ref<InstallmentFilterValue>('ACTIVE');
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
const INSTALLMENT_STATUS_ALIAS: Record<string, InstallmentStatus> = {
  PENDING: InstallmentStatus.PENDING,
  PAID: InstallmentStatus.PAID,
  OVERDUE: InstallmentStatus.OVERDUE,
  CANCELLED: InstallmentStatus.CANCELLED,
  Pending: InstallmentStatus.PENDING,
  Paid: InstallmentStatus.PAID,
  Overdue: InstallmentStatus.OVERDUE,
  Cancelled: InstallmentStatus.CANCELLED,
};

const installmentFilters: Array<{ label: string; value: InstallmentFilterValue }> = [
  { label: '全部', value: 'ALL' },
  { label: '进行中', value: 'ACTIVE' },
  { label: '含逾期', value: 'OVERDUE' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
];
const planStatusOptions: Array<{ label: string; value: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' }> = [
  { label: '进行中', value: 'ACTIVE' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
];

const getTodayString = (): string => new Date().toISOString().split('T')[0];

const createDefaultTransactionFormModel = (): TransactionFormModel => ({
  student_id: null,
  amount: null,
  note: '',
  is_installment: false,
  is_expense: false,
  total_amount: null,
  total_installments: null,
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
  if (typeof status === 'string' && INSTALLMENT_STATUS_ALIAS[status]) {
    return INSTALLMENT_STATUS_ALIAS[status];
  }
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
const effectiveMoneyTransactions = computed(() =>
  transactions.value.filter((transaction) => {
    if (!isInstallmentTransaction(transaction)) return true;
    return normalizeInstallmentStatus(transaction.installment?.status) !== InstallmentStatus.CANCELLED;
  }),
);
const totalIncome = computed(() =>
  effectiveMoneyTransactions.value
    .filter((transaction) => isIncomeTransaction(transaction))
    .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount || 0)), 0),
);
const totalExpense = computed(() =>
  effectiveMoneyTransactions.value
    .filter((transaction) => isExpenseTransaction(transaction))
    .reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount || 0)), 0),
);
const netProfit = computed(() => totalIncome.value - totalExpense.value);
const installmentCount = computed(() => transactionStore.installmentTransactions.length);
const pendingInstallments = computed(() => transactionStore.pendingInstallments);
const installmentTermCount = computed(() =>
  installmentPlans.value.reduce((sum, plan) => sum + plan.terms.length, 0),
);
const pendingInstallmentTermCount = computed(() =>
  installmentPlans.value.reduce((sum, plan) => sum + plan.pendingCount, 0),
);
const overdueInstallmentTermCount = computed(() =>
  installmentPlans.value.reduce((sum, plan) => sum + plan.overdueCount, 0),
);

const resolvePlanMergedStatus = (
  planStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  counts: {
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    cancelledCount: number;
    totalInstallments: number;
  },
): InstallmentMergedStatus => {
  if (planStatus === 'CANCELLED') return 'CANCELLED';
  if (counts.overdueCount > 0) return 'OVERDUE';
  if (counts.pendingCount > 0) return 'ACTIVE';

  const allTermsCancelled =
    counts.totalInstallments > 0 &&
    counts.cancelledCount === counts.totalInstallments &&
    counts.paidCount === 0;
  if (allTermsCancelled) return 'CANCELLED';

  if (planStatus === 'COMPLETED' || counts.paidCount > 0) return 'COMPLETED';
  return 'ACTIVE';
};

const matchesInstallmentFilter = (
  plan: InstallmentPlanView,
  filter: InstallmentFilterValue,
): boolean => {
  if (filter === 'ALL') return true;
  if (filter === 'OVERDUE') return plan.overdueCount > 0;
  if (filter === 'ACTIVE') {
    return plan.mergedStatus === 'ACTIVE' || plan.mergedStatus === 'OVERDUE';
  }
  if (filter === 'COMPLETED') {
    return (
      plan.planStatus === 'COMPLETED' ||
      (plan.pendingCount === 0 &&
        plan.overdueCount === 0 &&
        plan.paidCount > 0 &&
        plan.planStatus !== 'CANCELLED')
    );
  }
  return (
    plan.planStatus === 'CANCELLED' ||
    (plan.totalInstallments > 0 &&
      plan.cancelledCount === plan.totalInstallments &&
      plan.paidCount === 0)
  );
};

const filteredInstallmentPlans = computed(() => {
  const list = [...installmentPlans.value];
  const filtered = list.filter((item) => matchesInstallmentFilter(item, installmentFilter.value));
  return filtered.sort((a, b) => {
    const ad = a.nextDueDate ? new Date(a.nextDueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bd = b.nextDueDate ? new Date(b.nextDueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return ad - bd;
  });
});

// Formatters
const formatCurrency = (value: number) => formatCurrencyUtil(value);
const formatDate = (date: string | undefined) => formatDateUtil(date, 'date');
const parseInstallmentProgressFromNote = (
  note: string | null | undefined,
): { installmentNumber: number; totalInstallments: number } | null => {
  if (!note) return null;
  const matched = note.match(/第\s*(\d+)\s*\/\s*(\d+)\s*期/);
  if (!matched) return null;
  const installmentNumber = Number(matched[1]);
  const totalInstallments = Number(matched[2]);
  if (
    !Number.isInteger(installmentNumber) ||
    !Number.isInteger(totalInstallments) ||
    installmentNumber <= 0 ||
    totalInstallments <= 0
  ) {
    return null;
  }
  return { installmentNumber, totalInstallments };
};

const isInstallmentTransaction = (transaction: Transaction): boolean => {
  if (transaction.is_installment === true) return true;
  if (transaction.installment) return true;
  return parseInstallmentProgressFromNote(transaction.note) !== null;
};

const getInstallmentProgress = (
  transaction: Transaction,
): { installmentNumber: number; totalInstallments: number } | null => {
  const installmentNumber = transaction.installment?.installment_number;
  const totalInstallments = transaction.installment?.total_installments;
  if (
    typeof installmentNumber === 'number' &&
    Number.isFinite(installmentNumber) &&
    installmentNumber > 0 &&
    typeof totalInstallments === 'number' &&
    Number.isFinite(totalInstallments) &&
    totalInstallments > 0
  ) {
    return { installmentNumber, totalInstallments };
  }
  return parseInstallmentProgressFromNote(transaction.note);
};

const getInstallmentProgressText = (transaction: Transaction): string => {
  const progress = getInstallmentProgress(transaction);
  if (!progress) return '';
  return `${progress.installmentNumber}/${progress.totalInstallments}`;
};

const getTransactionSortDate = (transaction: Transaction): string =>
  transaction.updated_at || transaction.created_at || '';

const getEffectiveSignedAmount = (transaction: Transaction): number => {
  if (
    isInstallmentTransaction(transaction) &&
    normalizeInstallmentStatus(transaction.installment?.status) === InstallmentStatus.CANCELLED
  ) {
    return 0;
  }
  const amount = Math.abs(Number(transaction.amount || 0));
  return isExpenseTransaction(transaction) ? -amount : amount;
};

const getMergedInstallmentStatus = (statuses: InstallmentStatus[]): InstallmentStatus => {
  if (statuses.includes(InstallmentStatus.OVERDUE)) return InstallmentStatus.OVERDUE;
  if (statuses.every((status) => status === InstallmentStatus.CANCELLED)) return InstallmentStatus.CANCELLED;
  if (statuses.includes(InstallmentStatus.PENDING)) return InstallmentStatus.PENDING;
  if (statuses.includes(InstallmentStatus.PAID)) return InstallmentStatus.PAID;
  if (statuses.includes(InstallmentStatus.CANCELLED)) return InstallmentStatus.CANCELLED;
  return InstallmentStatus.PENDING;
};

const displayedTransactions = computed(() => {
  const groups = new Map<number, Transaction[]>();
  const standalone: Transaction[] = [];

  for (const transaction of transactions.value) {
    const planUid = transaction.installment?.plan_uid;
    if (!isInstallmentTransaction(transaction) || typeof planUid !== 'number') {
      standalone.push(transaction);
      continue;
    }
    const bucket = groups.get(planUid) || [];
    bucket.push(transaction);
    groups.set(planUid, bucket);
  }

  const merged: Transaction[] = [...standalone];

  for (const [planUid, items] of groups.entries()) {
    if (items.length === 1) {
      merged.push(items[0]);
      continue;
    }

    const sorted = [...items].sort(
      (a, b) => new Date(getTransactionSortDate(b)).getTime() - new Date(getTransactionSortDate(a)).getTime(),
    );
    const latest = sorted[0];
    const totalSigned = items.reduce((sum, item) => sum + getEffectiveSignedAmount(item), 0);
    const statuses = items.map((item) => normalizeInstallmentStatus(item.installment?.status));
    const totalInstallments = items.reduce((max, item) => {
      const current = Number(item.installment?.total_installments || 0);
      return current > max ? current : max;
    }, 0);
    const latestInstallmentNumber = items.reduce((max, item) => {
      const current = Number(item.installment?.installment_number || 0);
      return current > max ? current : max;
    }, 0);
    const mergedStatus = getMergedInstallmentStatus(statuses);
    const mergedNote = `分期付款: 已记录${items.length}/${totalInstallments || items.length}期`;
    const mergedDate = getTransactionSortDate(latest);

    merged.push({
      ...latest,
      amount: Math.abs(totalSigned),
      is_income: totalSigned >= 0,
      is_expense: totalSigned < 0,
      note: mergedNote,
      installment: {
        ...(latest.installment || { plan_uid: planUid }),
        plan_uid: planUid,
        installment_number: latestInstallmentNumber || undefined,
        total_installments: totalInstallments || undefined,
        status: mergedStatus,
      },
      created_at: mergedDate || latest.created_at,
      updated_at: mergedDate || latest.updated_at,
    });
  }

  return merged.sort(
    (a, b) => new Date(getTransactionSortDate(b)).getTime() - new Date(getTransactionSortDate(a)).getTime(),
  );
});

const isIncomeTransaction = (transaction: Transaction): boolean => {
  if (transaction.is_income === true) return true;
  if (transaction.is_expense === true) return false;
  return transaction.amount > 0;
};

const isExpenseTransaction = (transaction: Transaction): boolean => {
  if (transaction.is_expense === true) return true;
  if (transaction.is_income === true) return false;
  return transaction.amount < 0;
};

const getSignedAmount = (transaction: Transaction): number => {
  return getEffectiveSignedAmount(transaction);
};

const formatTransactionAmount = (transaction: Transaction) => formatCurrency(getSignedAmount(transaction));

const getAmountClass = (transaction: Transaction) => {
  if (
    isInstallmentTransaction(transaction) &&
    normalizeInstallmentStatus(transaction.installment?.status) === InstallmentStatus.CANCELLED
  ) {
    return 'text-muted';
  }
  return isExpenseTransaction(transaction) ? 'text-expense' : 'text-income';
};

const getTransactionTypeText = (transaction: Transaction) => {
  if (isInstallmentTransaction(transaction)) return '分期';
  return isExpenseTransaction(transaction) ? '支出' : '收入';
};

const getTransactionTypeClass = (transaction: Transaction) => {
  if (isInstallmentTransaction(transaction)) return 'badge-installment';
  return isExpenseTransaction(transaction) ? 'badge-expense' : 'badge-income';
};

const getTransactionIcon = (transaction: Transaction) => {
  if (isInstallmentTransaction(transaction)) return CalendarClock;
  return isExpenseTransaction(transaction) ? TrendingDown : TrendingUp;
};

const getDateThemeClass = (transaction: Transaction) => {
  if (isInstallmentTransaction(transaction)) return 'theme-installment';
  return isExpenseTransaction(transaction) ? 'theme-expense' : 'theme-income';
};

const getInstallmentProgressPercent = (transaction: Transaction): string => {
  const progress = getInstallmentProgress(transaction);
  if (!progress) return '0%';
  return `${(progress.installmentNumber / progress.totalInstallments) * 100}%`;
};

const getStatusClass = (status: string | null | undefined) => STATUS_CLASS_MAP[normalizeInstallmentStatus(status)] ?? '';
const getStatusText = (status: string | null | undefined) => STATUS_TEXT_MAP[normalizeInstallmentStatus(status)] ?? '未知';
const getMergedStatusText = (status: InstallmentMergedStatus): string => {
  if (status === 'ACTIVE') return '进行中';
  if (status === 'OVERDUE') return '含逾期';
  if (status === 'COMPLETED') return '已完成';
  return '已取消';
};
const getMergedStatusClass = (status: InstallmentMergedStatus): string => {
  if (status === 'ACTIVE') return 'status-pending';
  if (status === 'OVERDUE') return 'status-overdue';
  if (status === 'COMPLETED') return 'status-paid';
  return 'status-cancelled';
};
const getPlanStatusText = (status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'): string => {
  if (status === 'ACTIVE') return '进行中';
  if (status === 'COMPLETED') return '已完成';
  return '已取消';
};

const getPlanStatusColor = (plan: InstallmentPlanView): string => {
  if (plan.overdueCount > 0) return 'status-overdue';
  if (plan.pendingCount > 0) return 'status-pending';
  if (plan.paidCount > 0) return 'status-paid';
  return 'status-default';
};

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

const normalizePlanStatus = (status: unknown): 'ACTIVE' | 'COMPLETED' | 'CANCELLED' => {
  const raw = String(status || '').toUpperCase();
  if (raw === 'COMPLETED') return 'COMPLETED';
  if (raw === 'CANCELLED') return 'CANCELLED';
  return 'ACTIVE';
};

const loadInstallments = async () => {
  installmentLoading.value = true;
  try {
    const pageSize = 100;
    const plans: InstallmentPlan[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await ApiService.getAllInstallmentPlans({
        page,
        limit: pageSize,
      });
      const currentPagePlans = Array.isArray(response?.data)
        ? (response.data as InstallmentPlan[])
        : [];
      plans.push(...currentPagePlans);
      totalPages = Number(response?.pagination?.total_pages || 1);
      page += 1;
    } while (page <= totalPages);

    const mappedPlans: InstallmentPlanView[] = [];

    for (const rawPlan of plans) {
      const student = rawPlan.student;
      const rawInstallments = Array.isArray(rawPlan.installments) ? rawPlan.installments : [];
      const terms: InstallmentTermView[] = rawInstallments
        .map((rawInstallment) => {
          const dueDate = String(rawInstallment?.due_date || rawInstallment?.dueDate || '');
          if (!dueDate) return null;
          const term: InstallmentTermView = {
            uid: Number(rawInstallment.uid),
            installmentAmount: Number(rawInstallment.installment_amount || 0),
            currentInstallment: Number(
              rawInstallment.current_installment ||
              rawInstallment.currentInstallment ||
              rawInstallment.installment_number ||
              1,
            ),
            totalInstallments: Number(
              rawPlan.total_installments ||
              rawPlan.totalInstallments ||
              rawInstallment.total_installments ||
              1,
            ),
            dueDate,
            status: normalizeInstallmentStatus(rawInstallment.status),
          };
          return term;
        })
        .filter((item): item is InstallmentTermView => Boolean(item))
        .sort((a, b) => a.currentInstallment - b.currentInstallment);

      const paidCount = terms.filter((item) => item.status === InstallmentStatus.PAID).length;
      const pendingCount = terms.filter((item) => item.status === InstallmentStatus.PENDING).length;
      const overdueCount = terms.filter((item) => item.status === InstallmentStatus.OVERDUE).length;
      const cancelledCount = terms.filter((item) => item.status === InstallmentStatus.CANCELLED).length;
      const planStatus = normalizePlanStatus(rawPlan.status);
      const totalInstallments = Number(
        rawPlan.total_installments || rawPlan.totalInstallments || terms.length || 0,
      );
      const mergedStatus = resolvePlanMergedStatus(planStatus, {
        paidCount,
        pendingCount,
        overdueCount,
        cancelledCount,
        totalInstallments,
      });

      const nextDueTerm = terms
        .filter((item) => item.status === InstallmentStatus.PENDING || item.status === InstallmentStatus.OVERDUE)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

      const totalAmount =
        Number(rawPlan.total_amount || 0) ||
        terms.reduce((sum, item) => sum + item.installmentAmount, 0);

      mappedPlans.push({
        uid: Number(rawPlan.uid),
        studentId: typeof rawPlan.student_id === 'number' ? rawPlan.student_id : null,
        studentName: student?.name || `学员${rawPlan.student_id ?? '-'}`,
        totalAmount,
        totalInstallments,
        paidCount,
        pendingCount,
        overdueCount,
        cancelledCount,
        mergedStatus,
        planStatus,
        note: rawPlan.note ? String(rawPlan.note) : '',
        nextDueDate: nextDueTerm?.dueDate || null,
        terms,
      });
    }

    installmentPlans.value = mappedPlans;

    if (selectedInstallmentPlan.value) {
      const refreshed = mappedPlans.find((item) => item.uid === selectedInstallmentPlan.value?.uid) || null;
      selectedInstallmentPlan.value = refreshed;
      if (!refreshed) {
        showInstallmentPlanModal.value = false;
      } else if (!installmentPlanSaving.value) {
        planEditForm.value = {
          status: refreshed.planStatus,
          note: refreshed.note,
          totalAmount: refreshed.totalAmount,
          totalInstallments: refreshed.totalInstallments,
        };
      }
    }
  } catch (error) {
    showError('加载分期付款数据时发生错误');
  } finally {
    installmentLoading.value = false;
  }
};

const openInstallmentPlanModal = (plan: InstallmentPlanView) => {
  selectedInstallmentPlan.value = plan;
  planEditForm.value = {
    status: plan.planStatus,
    note: plan.note,
    totalAmount: plan.totalAmount,
    totalInstallments: plan.totalInstallments,
  };
  showInstallmentPlanModal.value = true;
};

const saveInstallmentPlan = async () => {
  const plan = selectedInstallmentPlan.value;
  if (!plan) return;

  const totalAmount = Number(planEditForm.value.totalAmount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    showError('计划总金额必须大于0');
    return;
  }

  const totalInstallments = Number(planEditForm.value.totalInstallments);
  if (!Number.isInteger(totalInstallments) || totalInstallments <= 0) {
    showError('计划总期数必须为正整数');
    return;
  }

  try {
    installmentPlanSaving.value = true;
    await ApiService.updateInstallmentPlan(plan.uid, {
      status: planEditForm.value.status,
      note: planEditForm.value.note,
      total_amount: totalAmount,
      total_installments: totalInstallments,
    });
    showSuccess('分期计划已更新');
    await Promise.all([loadInstallments(), loadTransactions()]);
  } catch (error) {
    showError('更新分期计划失败', (error as Error)?.message || '请稍后重试');
  } finally {
    installmentPlanSaving.value = false;
  }
};

const onTermStatusChange = async (
  term: InstallmentTermView,
  event: Event,
) => {
  const target = event.currentTarget as HTMLSelectElement | null;
  if (!target) return;
  const nextStatus = normalizeInstallmentStatus(target.value);
  if (nextStatus === term.status) return;

  try {
    termUpdatingMap.value[term.uid] = true;
    await ApiService.updateInstallmentPayment(term.uid, { status: nextStatus });
    showSuccess('分期状态已更新');
    await Promise.all([loadInstallments(), loadTransactions()]);
  } catch (error) {
    showError('分期状态更新失败', (error as Error)?.message || '请稍后重试');
  } finally {
    termUpdatingMap.value[term.uid] = false;
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

  if (!formData.is_installment && (!Number.isFinite(formData.amount) || Number(formData.amount) <= 0)) {
    showError('请输入有效的金额');
    return;
  }
  if (formData.is_installment) {
    if (!Number.isFinite(formData.student_id) || Number(formData.student_id) <= 0) {
      showError('分期付款必须关联学员');
      return;
    }
    if (!formData.total_amount || formData.total_amount <= 0) { showError('请输入有效的总金额'); return; }
    if (!formData.total_installments || formData.total_installments < 2) { showError('分期数必须至少为2'); return; }
    if (!formData.due_date) { showError('请选择首次到期日'); return; }
  }

  try {
    if (formData.is_installment) {
      const installmentStudentId = Number(formData.student_id);
      await ApiService.addInstallmentTransaction({
        student_id: installmentStudentId,
        amount: formData.total_amount!,
        total_installments: formData.total_installments!,
        frequency: String(formData.frequency!),
        custom_days: formData.frequency === PaymentFrequency.CUSTOM ? formData.custom_days : null,
        start_date: formData.due_date || '',
        due_date: formData.due_date || '',
        note: formData.note ? formData.note : '',
      });
      showSuccess('分期付款已创建');
    } else {
      const amountValue = Number(formData.amount);
      const amount = formData.is_expense ? -Math.abs(amountValue) : Math.abs(amountValue);
      await ApiService.addCashTransaction({
        student_id: formData.student_id,
        amount,
        note: formData.note ? formData.note : '',
      });
      showSuccess('交易已保存');
    }
    closeModals();
    await Promise.all([loadTransactions(), loadInstallments()]);
  } catch (error) {
    showError('保存交易时发生错误');
  }
};

const deleteTransaction = async (input: number | Transaction) => {
  const transaction =
    typeof input === 'number'
      ? (displayedTransactions.value.find((t) => t.uid === input) ||
         transactions.value.find((t) => t.uid === input))
      : input;

  const installmentPlanUid =
    transaction && isInstallmentTransaction(transaction)
      ? Number(transaction.installment?.plan_uid || 0)
      : 0;
  const isInstallmentPlanDelete = Number.isInteger(installmentPlanUid) && installmentPlanUid > 0;

  const title = isInstallmentPlanDelete ? '删除分期计划' : '删除记录';
  const message = isInstallmentPlanDelete
    ? `确定要删除整个分期计划？\n计划ID: ${installmentPlanUid}\n此操作会删除该计划下所有期数及相关收支记录。`
    : transaction
      ? `确定要删除此条记录？\n金额: ${formatTransactionAmount(transaction)}`
      : '确定删除？';

  showConfirm({
    title,
    message: message,
    confirmText: '删除',
    cancelText: '取消',
    confirmType: 'danger',
    onConfirm: async () => {
      try {
        if (isInstallmentPlanDelete) {
          await ApiService.deleteInstallmentPlan(installmentPlanUid);
          showSuccess('分期计划已删除');
        } else if (transaction) {
          await ApiService.deleteCashTransaction(transaction.uid);
          showSuccess('已删除');
        }
        await Promise.all([loadTransactions(), loadInstallments()]);
      } catch (error) {
        showError('删除失败', (error as Error)?.message || '请稍后重试');
      }
    },
  });
};

const openEditTransactionModal = (transaction: Transaction) => {
  const normalizedStatus = normalizeInstallmentStatus(transaction.installment?.status);
  const parsedProgress = getInstallmentProgress(transaction);
  editingTransactionId.value = transaction.uid;
  editingTransactionSource.value = transaction;
  editTransactionForm.value = {
    amount: Math.abs(Number(transaction.amount || 0)),
    note: transaction.note || '',
    isExpense: isExpenseTransaction(transaction),
    isInstallment: isInstallmentTransaction(transaction),
    installmentUid:
      typeof transaction.installment?.installment_uid === 'number'
        ? transaction.installment.installment_uid
        : null,
    installmentNumber: parsedProgress?.installmentNumber ?? 1,
    totalInstallments: parsedProgress?.totalInstallments ?? 1,
    installmentStatus: normalizedStatus,
    originalInstallmentStatus: normalizedStatus,
  };
  showEditTransaction.value = true;
};

const saveEditedTransaction = async () => {
  if (editingTransactionId.value === null) return;

  try {
    if (editTransactionForm.value.isInstallment) {
      const sourceAmount = Number(editingTransactionSource.value?.amount ?? 0);
      if (!Number.isFinite(sourceAmount) || sourceAmount === 0) {
        showError('分期记录金额异常，无法更新');
        return;
      }

      await ApiService.updateTransaction(editingTransactionId.value, {
        uid: editingTransactionId.value,
        amount: sourceAmount,
        note: editTransactionForm.value.note || '',
      });

      const hasStatusChanged =
        editTransactionForm.value.installmentStatus !==
        editTransactionForm.value.originalInstallmentStatus;

      if (hasStatusChanged && editTransactionForm.value.installmentUid) {
        await ApiService.updateInstallmentPayment(editTransactionForm.value.installmentUid, {
          status: editTransactionForm.value.installmentStatus,
        });
      }

      showSuccess('分期记录已更新');
    } else {
      const amount = Number(editTransactionForm.value.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        showError('请输入有效金额');
        return;
      }

      const signedAmount = editTransactionForm.value.isExpense ? -Math.abs(amount) : Math.abs(amount);
      await ApiService.updateTransaction(editingTransactionId.value, {
        uid: editingTransactionId.value,
        amount: signedAmount,
        note: editTransactionForm.value.note || '',
      });
      showSuccess('记录已更新');
    }
    closeModals();
    await Promise.all([loadTransactions(), loadInstallments()]);
  } catch (error) {
    showError('更新失败', (error as Error)?.message || '更新交易时发生错误');
  }
};

const closeModals = () => {
  transactionStore.toggleAddTransaction(false);
  showEditTransaction.value = false;
  showInstallmentPlanModal.value = false;
  installmentPlanSaving.value = false;
  editingTransactionId.value = null;
  editingTransactionSource.value = null;
  selectedInstallmentPlan.value = null;
  termUpdatingMap.value = {};
  planEditForm.value = {
    status: 'ACTIVE',
    note: '',
    totalAmount: 0,
    totalInstallments: 1,
  };
  currentTransaction.value = createDefaultTransactionFormModel();
  editTransactionForm.value = {
    amount: 0,
    note: '',
    isExpense: false,
    isInstallment: false,
    installmentUid: null,
    installmentNumber: 1,
    totalInstallments: 1,
    installmentStatus: InstallmentStatus.PENDING,
    originalInstallmentStatus: InstallmentStatus.PENDING,
  };
};

const forceRefresh = () => Promise.all([loadTransactions(), loadInstallments()]);

onMounted(async () => {
  await loadStudents();
  await Promise.all([loadTransactions(), loadInstallments()]);
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

.installment-panel {
  background: linear-gradient(180deg, var(--bg-surface) 0%, rgba(25, 25, 35, 0.6) 100%);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  margin-bottom: 1.5rem;
  overflow: hidden;
  position: relative;
}

.installment-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.2), transparent);
}

.installment-panel-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.installment-panel-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.panel-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05));
  border: 1px solid rgba(245, 158, 11, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fbbf24;
}

.panel-title-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.panel-title-text .main-title {
  color: var(--text-primary);
  font-weight: 700;
  font-size: 1rem;
}

.panel-title-text .sub-title {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.installment-panel-summary {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.summary-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: 20px;
  font-size: 0.78rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
}

.summary-pill .pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.summary-pill.pending .pill-dot {
  background: #fbbf24;
  box-shadow: 0 0 6px #fbbf24;
}

.summary-pill.overdue .pill-dot {
  background: #f87171;
  box-shadow: 0 0 6px #f87171;
}

.summary-pill .pill-count {
  font-weight: 700;
  color: var(--text-primary);
}

.summary-pill .pill-label {
  color: var(--text-secondary);
}

.installment-filter-row {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.installment-filter-btn {
  border: 1px solid var(--border-subtle);
  background: rgba(0,0,0,0.2);
  color: var(--text-secondary);
  border-radius: 8px;
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.installment-filter-btn:hover:not(:disabled) {
  border-color: rgba(99, 102, 241, 0.4);
  color: var(--primary-color);
}

.installment-filter-btn.active {
  border-color: rgba(99, 102, 241, 0.5);
  color: var(--primary-color);
  background: rgba(99, 102, 241, 0.1);
  font-weight: 500;
}

.installment-list-container {
  padding: 0.75rem;
  min-height: 120px;
}

.installment-loading,
.installment-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2.5rem;
  color: var(--text-secondary);
  gap: 0.75rem;
}

.installment-empty svg {
  opacity: 0.3;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.installment-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.installment-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 14px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideIn 0.4s ease backwards;
}

.installment-card:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

/* Left: Student Info */
.installment-card-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 160px;
  flex-shrink: 0;
}

.student-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
}

.student-avatar.status-pending {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.1));
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fbbf24;
}

.student-avatar.status-overdue {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.1));
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.student-avatar.status-paid {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.student-avatar.status-default {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(99, 102, 241, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #818cf8;
}

.student-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.student-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.student-meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.meta-id {
  font-family: 'SF Mono', monospace;
}

/* Middle: Progress */
.installment-card-middle {
  flex: 1;
  min-width: 0;
  padding: 0 0.5rem;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.progress-text {
  color: var(--text-secondary);
}

.progress-percent {
  font-weight: 700;
  color: var(--text-primary);
}

.progress-bar {
  height: 6px;
  background: rgba(255,255,255,0.06);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 0.68rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 500;
}

.meta-tag.pending {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
}

.meta-tag.overdue {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}

.meta-tag.cancelled {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

/* Right: Amount, Status, Action */
.installment-card-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.amount-section {
  text-align: right;
}

.amount-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 1.05rem;
  font-weight: 700;
  color: #34d399;
}

.due-date {
  font-size: 0.72rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}

.due-date.empty {
  opacity: 0.5;
}

.status-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.status-badge.status-pending {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.status-badge.status-paid {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.status-badge.status-overdue {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.status-badge.status-cancelled {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.manage-btn {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: rgba(0,0,0,0.2);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.manage-btn:hover:not(:disabled) {
  border-color: rgba(99, 102, 241, 0.4);
  color: var(--primary-color);
  background: rgba(99, 102, 241, 0.1);
}

.manage-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.compact-btn {
  height: 32px;
  padding: 0.35rem 0.7rem;
  font-size: 0.82rem;
}

.inline-status-select {
  min-width: 104px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-app);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 0.28rem 0.45rem;
}

.term-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.plan-editor {
  margin-top: 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.01);
}

.plan-editor-actions {
  margin-top: 0.45rem;
  display: flex;
  justify-content: flex-end;
}

.term-card {
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.01);
  padding: 0.75rem;
}

.term-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.term-index {
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.term-amount {
  margin-top: 0.4rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.term-due {
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.term-actions {
  margin-top: 0.65rem;
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
  background: linear-gradient(180deg, var(--bg-surface) 0%, rgba(30, 30, 40, 0.5) 100%);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}

.transactions-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
}

.panel-toolbar {
  padding: 1rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
}

.toolbar-left {
  display: flex;
  gap: 0.75rem;
  flex: 1;
}

.toolbar-right {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 280px;
}
.search-icon {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}
.search-input {
  width: 100%;
  padding: 0.6rem 0.8rem 0.6rem 2.4rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background-color: rgba(0,0,0,0.2);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.2s ease;
}
.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  background-color: rgba(0,0,0,0.3);
}

.filter-select {
  padding: 0.6rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background-color: rgba(0,0,0,0.2);
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
}

/* === Transaction Card List === */
.transaction-list {
  padding: 0.75rem;
}

.transaction-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin-bottom: 0.5rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.03);
  border-radius: 14px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideIn 0.4s ease backwards;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.transaction-card:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

/* Date Styling */
.transaction-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 56px;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.transaction-date::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.15;
}

.transaction-date.theme-income {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05));
  border: 1px solid rgba(16, 185, 129, 0.2);
}
.transaction-date.theme-income::before {
  background: linear-gradient(135deg, #10b981, #059669);
}
.transaction-date.theme-expense {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.05));
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.transaction-date.theme-expense::before {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}
.transaction-date.theme-installment {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05));
  border: 1px solid rgba(245, 158, 11, 0.2);
}
.transaction-date.theme-installment::before {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.transaction-date .date-num {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  z-index: 1;
}
.transaction-date .date-month {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.15rem;
  z-index: 1;
}

/* Body Styling */
.transaction-body {
  flex: 1;
  min-width: 0;
}

.transaction-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
}

.type-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.type-tag .tag-icon {
  margin-top: 0.5px;
}
.badge-income {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.badge-expense {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}
.badge-installment {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05));
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.student-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.04);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.status-dot {
  font-size: 0.7rem;
  font-weight: 500;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}
.status-dot.status-pending {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
}
.status-dot.status-paid {
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
}
.status-dot.status-overdue {
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
}
.status-dot.status-cancelled {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.transaction-note {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.transaction-note.empty {
  color: var(--text-secondary);
  font-style: italic;
  opacity: 0.6;
}

/* Mini Installment Progress */
.installment-mini {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.mini-progress {
  width: 60px;
  height: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  overflow: hidden;
}
.mini-bar {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  border-radius: 2px;
  transition: width 0.3s ease;
}
.mini-text {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Right Side Styling */
.transaction-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.transaction-amount {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
}
.text-income { color: #34d399; }
.text-expense { color: #f87171; }
.text-muted { color: var(--text-secondary); }

.transaction-actions {
  display: flex;
  gap: 0.35rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}
.transaction-card:hover .transaction-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.action-btn:hover {
  background: rgba(255,255,255,0.06);
}
.action-btn.edit { color: #60a5fa; }
.action-btn.edit:hover {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.3);
}
.action-btn.delete { color: #f87171; }
.action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  color: var(--text-secondary);
}
.empty-icon {
  opacity: 0.3;
  margin-bottom: 1rem;
}

/* Pagination */
.panel-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.pagination-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: rgba(0,0,0,0.2);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.pagination-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.05);
  border-color: var(--border-subtle);
  color: var(--text-primary);
}
.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 60px;
  text-align: center;
}

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

.mt-4 {
  margin-top: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.input-wrapper,
.select-wrapper {
  position: relative;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.65rem 0.8rem;
  background: var(--bg-app);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-select {
  appearance: none;
  padding-right: 2rem;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.form-input:disabled,
.form-select:disabled,
.form-textarea:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.form-textarea {
  min-height: 92px;
  resize: vertical;
}

.select-arrow {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary);
}

.status-summary {
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.01);
  padding: 0.8rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.summary-item + .summary-item {
  margin-top: 0.5rem;
}

.summary-item .label {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.summary-item .value {
  color: var(--text-primary);
  font-weight: 600;
}

.field-hint {
  margin-top: 0.45rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
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
  .installment-panel-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .transaction-card {
    padding: 0.875rem;
    gap: 0.75rem;
  }
  
  .transaction-date {
    min-width: 48px;
    height: 48px;
    border-radius: 10px;
  }
  .transaction-date .date-num {
    font-size: 1.1rem;
  }
  
  .transaction-right {
    flex-direction: row;
    align-items: center;
    gap: 0.75rem;
  }
  
  .transaction-amount {
    font-size: 1rem;
  }
  
  .transaction-actions {
    opacity: 1;
  }
  
  .panel-toolbar {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .toolbar-left {
    width: 100%;
  }
  
  .search-box {
    max-width: none;
  }
  
  .toolbar-right {
    text-align: center;
  }
  
  /* 强制按钮样式 */
  .btn-text { display: block; }
}

@media (max-width: 480px) {
  .transaction-card {
    position: relative;
    padding-bottom: 2.5rem;
  }
  
  .transaction-actions {
    position: absolute;
    bottom: 0.5rem;
    right: 0.875rem;
  }
  
  .transaction-note {
    max-width: calc(100vw - 180px);
  }
}

/* Installment Card Mobile Responsive */
@media (max-width: 900px) {
  .installment-card {
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .installment-card-left {
    width: 100%;
    min-width: unset;
  }
  
  .installment-card-middle {
    width: 100%;
    padding: 0;
    order: 3;
  }
  
  .installment-card-right {
    width: 100%;
    justify-content: space-between;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255,255,255,0.04);
  }
  
  .amount-section {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .installment-panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .installment-panel-summary {
    width: 100%;
    justify-content: flex-start;
  }
  
  .installment-card {
    padding: 0.875rem;
  }
  
  .student-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
  
  .installment-card-right {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>

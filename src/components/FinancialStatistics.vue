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
            v-model="transactionFilter"
            @change="applyFilters"
            aria-label="交易类型筛选"
          >
            <option value="all">全部交易</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
            <option value="installment">分期付款</option>
          </select>
          
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索交易..."
            @input="applyFilters"
            aria-label="交易搜索"
            class="search-input"
          />
        </div>
        
        <!-- 日期范围搜索 -->
        <div class="date-filter">
          <input
            v-model="dateFrom"
            type="date"
            placeholder="开始日期"
            @change="applyFilters"
            class="date-input"
          />
          <span class="date-separator">-</span>
          <input
            v-model="dateTo"
            type="date"
            placeholder="结束日期"
            @change="applyFilters"
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
        <span>共 {{ pagination.total }} 条记录</span>
        <span>第 {{ pagination.page }} / {{ pagination.total_pages }} 页</span>
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
          @click="goToPage(pagination.page - 1)"
          :disabled="pagination.page <= 1 || loading"
          class="page-btn"
        >
          ← 上一页
        </button>
        <span class="page-info">
          第 {{ pagination.page }} 页，共 {{ pagination.total_pages }} 页
        </span>
        <button
          @click="goToPage(pagination.page + 1)"
          :disabled="pagination.page >= pagination.total_pages || loading"
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
            v-model="currentTransaction"
            :students="students" 
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
            <select id="status-select" v-model="selectedStatus">
              <option value="Pending">待处理</option>
              <option value="Paid">已支付</option>
              <option value="Overdue">逾期</option>
              <option value="Cancelled">已取消</option>
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
import { ref, computed, onMounted, inject, watch } from 'vue';
import { ApiService } from '../api/ApiService';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/dataTransformers';
import TransactionForm from './TransactionForm.vue';
import type { Transaction, Student, InstallmentStatus } from '../types/api';

// 表单数据类型
interface TransactionFormData {
  student_id: number | null;
  amount: number;
  note: string;
  is_installment: boolean;
  is_expense: boolean;
  // 分期付款字段
  total_amount?: number;
  total_installments?: number;
  frequency?: string;
  custom_days?: number | null;
  due_date?: string;
}

interface ErrorHandler {
  showError: (title: string, message: string, details?: string) => void;
  showSuccess: (title: string, message: string) => void;
  showConfirm: (options: any) => void;
}

// 注入错误处理器
const errorHandler = inject<ErrorHandler>('errorHandler');

const showError = errorHandler?.showError || ((title, message, details) => {
  console.error(title + ': ' + message, details);
  alert(`${title}: ${message}`);
});

const showSuccess = errorHandler?.showSuccess || ((title, message) => {
  console.log(title + ': ' + message);
  alert(`${title}: ${message}`);
});

const showConfirm = errorHandler?.showConfirm || ((options) => {
  const confirmed = confirm(options.message);
  if (confirmed && options.onConfirm) {
    options.onConfirm();
  }
});

// 状态
const loading = ref<boolean>(false);
const transactions = ref<Transaction[]>([]);
const students = ref<Student[]>([]);
const transactionFilter = ref<string>('all');
const searchQuery = ref<string>('');
const dateFrom = ref<string>('');
const dateTo = ref<string>('');
const showAddTransaction = ref<boolean>(false);
const showUpdateStatus = ref<boolean>(false);
const selectedTransaction = ref<Transaction | null>(null);
const selectedStatus = ref<InstallmentStatus>('Pending');

// 分页状态
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  total_pages: 0,
});

// 时间周期
const selectedPeriod = ref<string>('ThisMonth');
const timePeriods = [
  { value: 'Today', label: '今日' },
  { value: 'ThisWeek', label: '本周' },
  { value: 'ThisMonth', label: '本月' },
  { value: 'ThisYear', label: '本年' },
];

// 当前交易表单数据
const currentTransaction = ref<TransactionFormData>({
  student_id: null,
  amount: 0,
  note: '',
  is_installment: false,
  is_expense: false,
  total_amount: 0,
  total_installments: 2,
  frequency: 'Monthly',
  custom_days: null,
  due_date: new Date().toISOString().split('T')[0],
});

// 计算属性 - 总收入
const totalIncome = computed(() => {
  return transactions.value
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
});

// 计算属性 - 总支出
const totalExpense = computed(() => {
  return Math.abs(
    transactions.value
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );
});

// 计算属性 - 净收益
const netProfit = computed(() => {
  return totalIncome.value - totalExpense.value;
});

// 计算属性 - 分期付款统计
const installmentCount = computed(() => {
  return transactions.value.filter((t) => t.is_installment).length;
});

const pendingInstallments = computed(() => {
  return transactions.value.filter(
    (t) => t.is_installment && t.installment?.status === 'Pending'
  ).length;
});

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
  switch (status) {
    case 'Paid':
      return 'status-paid';
    case 'Pending':
      return 'status-pending';
    case 'Overdue':
      return 'status-overdue';
    case 'Cancelled':
      return 'status-cancelled';
    default:
      return '';
  }
};

const getStatusText = (status: string | null | undefined): string => {
  switch (status) {
    case 'Paid':
      return '已支付';
    case 'Pending':
      return '待处理';
    case 'Overdue':
      return '逾期';
    case 'Cancelled':
      return '已取消';
    default:
      return '未知';
  }
};

// 加载学员列表
const loadStudents = async () => {
  try {
    const response = await ApiService.getAllStudents();
    students.value = response.students || [];
  } catch (error) {
    console.error('加载学员数据失败:', error);
    showError('加载失败', '加载学员数据时发生错误', (error as Error).message);
  }
};

// 加载交易列表
const loadTransactions = async () => {
  if (loading.value) return;

  loading.value = true;

  try {
    // 构建查询参数
    const params: any = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    };

    // 添加筛选条件
    if (transactionFilter.value === 'income') {
      params.is_income = true;
    } else if (transactionFilter.value === 'expense') {
      params.is_income = false;
    } else if (transactionFilter.value === 'installment') {
      params.has_installment = true;
    }

    if (dateFrom.value) {
      params.date_from = dateFrom.value;
    }
    if (dateTo.value) {
      params.date_to = dateTo.value;
    }

    // 调用 API（返回 { items, pagination }）
    const response = await ApiService.getAllTransactions(params);

    transactions.value = response.items || [];
    pagination.value = {
      page: response.pagination.page,
      limit: response.pagination.limit,
      total: response.pagination.total,
      total_pages: response.pagination.total_pages,
    };

    console.log(`✅ 成功加载 ${transactions.value.length} 条交易记录`);
  } catch (error) {
    console.error('加载交易数据失败:', error);
    transactions.value = [];
    showError('加载失败', '加载交易数据时发生错误', (error as Error).message);
  } finally {
    loading.value = false;
  }
};

// 应用筛选
const applyFilters = () => {
  pagination.value.page = 1; // 重置到第一页
  loadTransactions();
};

// 清除筛选
const clearFilters = () => {
  transactionFilter.value = 'all';
  searchQuery.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  applyFilters();
};

// 分页
const goToPage = (page: number) => {
  if (page < 1 || page > pagination.value.total_pages) return;
  pagination.value.page = page;
  loadTransactions();
};

// 时间周期选择
const selectTimePeriod = async (period: string) => {
  if (loading.value) return;
  selectedPeriod.value = period;
  
  // 根据周期设置日期范围
  const today = new Date();
  let startDate: Date;

  switch (period) {
    case 'Today':
      startDate = today;
      break;
    case 'ThisWeek':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay());
      break;
    case 'ThisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'ThisYear':
      startDate = new Date(today.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  dateFrom.value = startDate.toISOString().split('T')[0];
  dateTo.value = today.toISOString().split('T')[0];
  
  applyFilters();
};

// 打开添加交易模态框
const openAddTransactionModal = () => {
  currentTransaction.value = {
    student_id: null,
    amount: 0,
    note: '',
    is_installment: false,
    is_expense: false,
    total_amount: 0,
    total_installments: 2,
    frequency: 'Monthly',
    custom_days: null,
    due_date: new Date().toISOString().split('T')[0],
  };
  showAddTransaction.value = true;
};

// 保存交易
const saveTransaction = async () => {
  if (loading.value) return;

  const formData = currentTransaction.value;

  // 验证
  if (!formData.is_installment && formData.amount <= 0) {
    showError('验证失败', '请输入有效的金额');
    return;
  }

  if (formData.is_installment) {
    if (!formData.total_amount || formData.total_amount <= 0) {
      showError('验证失败', '请输入有效的总金额');
      return;
    }
    if (!formData.total_installments || formData.total_installments < 2) {
      showError('验证失败', '分期数必须至少为2');
      return;
    }
    if (!formData.due_date) {
      showError('验证失败', '请选择首次到期日');
      return;
    }
  }

  loading.value = true;

  try {
    if (formData.is_installment) {
      // 保存分期交易
      const data = {
        student_id: formData.student_id,
        amount: formData.total_amount!,
        total_installments: formData.total_installments!,
        frequency: formData.frequency!,
        custom_days: formData.frequency === 'Custom' ? formData.custom_days : null,
        start_date: formData.due_date!,
        note: formData.note || null,
      };

      await ApiService.addInstallmentTransaction(data);
      showSuccess('保存成功', '分期付款已创建');
    } else {
      // 保存普通交易
      const amount = formData.is_expense ? -formData.amount : formData.amount;
      
      const data = {
        student_id: formData.student_id,
        amount: amount,
        note: formData.note || null,
      };

      await ApiService.addCashTransaction(data);
      showSuccess('保存成功', '交易已保存');
    }

    closeModals();
    await loadTransactions();
  } catch (error) {
    console.error('保存交易失败:', error);
    showError('保存失败', '保存交易时发生错误', (error as Error).message);
  } finally {
    loading.value = false;
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
      loading.value = true;
      try {
        await ApiService.deleteCashTransaction(uid);
        showSuccess('删除成功', '交易记录已删除');
        await loadTransactions();
      } catch (error: any) {
        console.error('删除交易失败:', error);
        // 显示后端返回的 message
        const errorMessage = error.response?.data?.message || error.message || '删除交易记录时发生错误';
        showError('删除失败', errorMessage);
      } finally {
        loading.value = false;
      }
    },
  });
};

// 显示更新状态模态框
const showUpdateStatusModal = (transaction: Transaction) => {
  selectedTransaction.value = transaction;
  selectedStatus.value = (transaction.installment?.status as InstallmentStatus) || 'Pending';
  showUpdateStatus.value = true;
};

// 更新分期状态
const updateInstallmentStatus = async () => {
  if (!selectedTransaction.value || !selectedTransaction.value.installment) return;

  loading.value = true;
  try {
    // 使用 installment_uid 或交易 uid
    const installmentId = selectedTransaction.value.installment.installment_uid || selectedTransaction.value.uid;
    
    await ApiService.updateInstallmentStatus(installmentId, selectedStatus.value);
    showSuccess('更新成功', '分期状态已更新');
    closeModals();
    await loadTransactions();
  } catch (error) {
    console.error('更新分期状态失败:', error);
    showError('更新失败', '更新分期状态时发生错误', (error as Error).message);
  } finally {
    loading.value = false;
  }
};

// 关闭模态框
const closeModals = () => {
  showAddTransaction.value = false;
  showUpdateStatus.value = false;
  selectedTransaction.value = null;
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

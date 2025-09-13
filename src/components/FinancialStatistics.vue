<template>
  <div class="financial-statistics">
    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-progress"></div>

    <div class="section-header">
      <h2>收支统计</h2>
      <button
        class="add-btn"
        @click="showAddTransaction = true"
        :disabled="loading"
        aria-label="添加新交易"
      >
        {{ loading ? '加载中...' : '➕ 添加交易' }}
      </button>
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

      <!-- 新增：分期付款统计 -->
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
            @change="filterTransactions"
            aria-label="交易类型筛选"
          >
            <option value="all">全部交易</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
            <option value="installment">分期付款</option>
          </select>
          <input
            v-model="transactionSearch"
            type="text"
            placeholder="搜索交易描述、备注..."
            @input="performSearch"
            aria-label="交易搜索"
          />
          <button 
            class="search-btn" 
            @click="performAdvancedSearch"
            :disabled="loading"
            title="高级搜索"
          >
            🔍
          </button>
        </div>
        
        <!-- 日期范围搜索 -->
        <div class="date-filter">
          <div class="date-range">
            <label>日期范围:</label>
            <input 
              v-model="dateFrom" 
              type="date" 
              placeholder="开始日期"
              aria-label="开始日期"
            />
            <span>-</span>
            <input 
              v-model="dateTo" 
              type="date" 
              placeholder="结束日期"
              aria-label="结束日期"
            />
            <button 
              class="apply-date-btn" 
              @click="performAdvancedSearch"
              :disabled="loading"
            >
              应用日期筛选
            </button>
            <button 
              class="clear-date-btn" 
              @click="clearDateFilter"
            >
              清除
            </button>
          </div>
        </div>
      </div>

      <div class="transactions-table">
        <table>
          <thead>
            <tr>
              <th>描述</th>
              <th>金额</th>
              <th>类型</th>
              <th>状态</th>
              <!-- 新增状态列 -->
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="transaction in filteredTransactions"
              :key="transaction.id"
            >
              <td>
                {{ transaction.description }}
                <span
                  v-if="transaction.is_installment"
                  class="installment-badge"
                >
                  分期 {{ transaction.installment_current }}/{{
                    transaction.installment_total
                  }}
                </span>
              </td>
              <td :class="['amount', transaction.type]">
                {{ formatTransactionAmount(transaction) }}
              </td>
              <td>
                <span :class="['transaction-type', transaction.type]">
                  {{ transaction.type === 'income' ? '收入' : '支出' }}
                  <span v-if="transaction.is_installment">(分期)</span>
                </span>
              </td>
              <td>
                <span
                  v-if="transaction.is_installment"
                  :class="[
                    'status-badge',
                    getStatusClass(transaction.installment_status),
                  ]"
                >
                  {{ getStatusText(transaction.installment_status) }}
                </span>
                <span v-else>-</span>
              </td>
              <td>{{ transaction.note || '-' }}</td>
              <td class="actions">
                <button
                  v-if="transaction.is_installment"
                  class="action-btn status-btn"
                  @click="showUpdateStatus(transaction)"
                  title="更新状态"
                >
                  🔄
                </button>
                <button
                  class="action-btn delete-btn"
                  @click="deleteTransaction(transaction.id)"
                  aria-label="删除交易"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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
          <div class="payment-mode-toggle">
            <button
              :class="['mode-btn', { active: !isInstallmentMode }]"
              @click="isInstallmentMode = false"
            >
              普通付款
            </button>
            <button
              :class="['mode-btn', { active: isInstallmentMode }]"
              @click="isInstallmentMode = true"
            >
              分期付款
            </button>
          </div>

          <div class="form-group">
            <label for="transaction-type">类型</label>
            <select
              id="transaction-type"
              v-model="currentTransaction.type"
              :disabled="isInstallmentMode"
            >
              <option value="income">收入</option>
              <option value="expense">支出</option>
            </select>
            <span v-if="isInstallmentMode" class="form-note"
              >分期付款仅支持收入类型</span
            >
          </div>

          <div class="form-group">
            <label for="transaction-amount">金额</label>
            <input
              id="transaction-amount"
              v-model.number="currentTransaction.amount"
              type="number"
              placeholder="填入金额"
              min="0"
              step="1"
              oninput="validity.valid||(value='');"
              class="no-spinners"
            />
          </div>

          <div class="form-group">
            <label for="student-id">学员 (可选)</label>
            <select id="student-id" v-model="currentTransaction.student_id">
              <option :value="null">其他交易</option>
              <option
                v-for="student in students"
                :key="student.uid"
                :value="student.uid"
              >
                {{ student.name }} (ID: {{ student.uid }})
              </option>
            </select>
          </div>

          <!-- 分期付款特定字段 -->
          <div v-if="isInstallmentMode" class="installment-fields">
            <div class="form-group">
              <label for="installment-total">总期数</label>
              <input
                id="installment-total"
                v-model.number="currentTransaction.installment_total"
                type="number"
                placeholder="例如: 12"
                min="2"
                step="1"
              />
            </div>

            <div class="form-group">
              <label for="installment-frequency">付款频率</label>
              <select
                id="installment-frequency"
                v-model="currentTransaction.installment_frequency"
              >
                <option value="Weekly">每周</option>
                <option value="Monthly" selected>每月</option>
                <option value="Quarterly">每季度</option>
                <option value="Custom">自定义</option>
              </select>
            </div>

            <div
              v-if="currentTransaction.installment_frequency === 'Custom'"
              class="form-group"
            >
              <label for="custom-frequency-days">自定义天数</label>
              <input
                id="custom-frequency-days"
                v-model.number="currentTransaction.custom_frequency_days"
                type="number"
                placeholder="天数"
                min="1"
                step="1"
              />
            </div>

            <div class="form-group">
              <label for="installment-due-date">首次到期日</label>
              <input
                id="installment-due-date"
                v-model="currentTransaction.installment_due_date"
                type="date"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="transaction-note">备注</label>
            <textarea
              id="transaction-note"
              v-model="currentTransaction.note"
              placeholder="请输入交易备注信息"
              rows="3"
            ></textarea>
          </div>
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
      v-if="showUpdateStatusModal"
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

<script>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { ApiService } from '../api/ApiService';

export default {
  name: 'FinancialStatistics',
  setup() {
    const loading = ref(false);
    const transactions = ref([]);
    const students = ref([]);
    const transactionFilter = ref('all');
    const transactionSearch = ref('');
    const dateFrom = ref('');
    const dateTo = ref('');
    const showAddTransaction = ref(false);
    const showUpdateStatusModal = ref(false);
    const isInstallmentMode = ref(false);
    const selectedTransaction = ref(null);
    const selectedStatus = ref('Pending');
    const abortController = ref(null);
    const errorHandler = inject('errorHandler');
    
    const showError = errorHandler?.showError || ((title, message, details) => {
      console.error(`${title}: ${message}`, details);
      alert(`${title}\n${message}`);
    });
    
    const showSuccess = errorHandler?.showSuccess || ((title, message) => {
      console.log(`✅ ${title}: ${message}`);
    });
    
    if (!errorHandler) {
      console.warn('⚠️ errorHandler 未正确注入到 FinancialStatistics 组件');
    }

    const currentTransaction = ref({
      type: 'income',
      amount: '',
      student_id: null,
      note: '',
      // 分期付款特定字段
      installment_total: 2,
      installment_frequency: 'Monthly',
      custom_frequency_days: 30,
      installment_due_date: new Date().toISOString().split('T')[0],
    });

    // 计算属性
    const filteredTransactions = computed(() => {
      let filtered = transactions.value;

      if (transactionFilter.value !== 'all') {
        if (transactionFilter.value === 'installment') {
          filtered = filtered.filter((t) => t.is_installment);
        } else {
          filtered = filtered.filter(
            (t) => t.type === transactionFilter.value && !t.is_installment,
          );
        }
      }

      if (transactionSearch.value) {
        const search = transactionSearch.value.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.description.toLowerCase().includes(search) ||
            (t.note && t.note.toLowerCase().includes(search)),
        );
      }

      return filtered;
    });

    // 增强的计算属性 - 防止数值溢出和无效数据
    const totalIncome = computed(() => {
      try {
        const MAX_SAFE_AMOUNT = 999999999999;
        let total = 0;
        
        const incomeTransactions = transactions.value.filter((t) => 
          t && t.type === 'income' && typeof t.amount === 'number' && isFinite(t.amount)
        );
        
        for (const transaction of incomeTransactions) {
          const amount = Math.max(0, Math.min(MAX_SAFE_AMOUNT, transaction.amount));
          total += amount;
          
          // 检查累计是否超出安全范围
          if (total > MAX_SAFE_AMOUNT) {
            console.warn('总收入超出安全范围，限制为最大值');
            return MAX_SAFE_AMOUNT;
          }
        }
        
        return total;
      } catch (error) {
        console.error('计算总收入失败:', error);
        return 0;
      }
    });

    const totalExpense = computed(() => {
      try {
        const MAX_SAFE_AMOUNT = 999999999999;
        let total = 0;
        
        const expenseTransactions = transactions.value.filter((t) => 
          t && t.type === 'expense' && typeof t.amount === 'number' && isFinite(t.amount)
        );
        
        for (const transaction of expenseTransactions) {
          const amount = Math.max(0, Math.min(MAX_SAFE_AMOUNT, transaction.amount));
          total += amount;
          
          // 检查累计是否超出安全范围
          if (total > MAX_SAFE_AMOUNT) {
            console.warn('总支出超出安全范围，限制为最大值');
            return MAX_SAFE_AMOUNT;
          }
        }
        
        return total;
      } catch (error) {
        console.error('计算总支出失败:', error);
        return 0;
      }
    });

    const netProfit = computed(() => {
      try {
        const income = totalIncome.value;
        const expense = totalExpense.value;
        
        // 防止计算结果溢出
        const MAX_SAFE_AMOUNT = 999999999999;
        const result = income - expense;
        
        if (!isFinite(result)) {
          console.warn('净收益计算结果无效');
          return 0;
        }
        
        return Math.max(-MAX_SAFE_AMOUNT, Math.min(MAX_SAFE_AMOUNT, result));
      } catch (error) {
        console.error('计算净收益失败:', error);
        return 0;
      }
    });

    // 新增：分期付款统计
    const installmentCount = computed(() => {
      return transactions.value.filter((t) => t.is_installment).length;
    });

    const pendingInstallments = computed(() => {
      return transactions.value.filter(
        (t) => t.is_installment && t.installment_status === 'Pending',
      ).length;
    });

    // 增强的格式化方法 - 防止数值溢出
    const formatCurrency = (value) => {
      try {
        // 数值验证和范围检查
        if (typeof value !== 'number' || !isFinite(value)) {
          return '¥0.00';
        }
        
        // 防止极大数值导致显示问题
        const MAX_SAFE_AMOUNT = 999999999999; // 约1万亿
        const clampedValue = Math.max(-MAX_SAFE_AMOUNT, Math.min(MAX_SAFE_AMOUNT, value));
        
        if (clampedValue !== value) {
          console.warn('金额数值过大，已限制显示范围:', value, '->', clampedValue);
        }
        
        return new Intl.NumberFormat('zh-CN', {
          style: 'currency',
          currency: 'CNY',
          maximumFractionDigits: 2,
          minimumFractionDigits: 2
        }).format(clampedValue);
      } catch (error) {
        console.error('格式化货币失败:', error, value);
        return '¥--';
      }
    };

    const formatTransactionAmount = (transaction) => {
      const amount =
        transaction.type === 'income'
          ? transaction.amount
          : -transaction.amount;
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
      }).format(amount);
    };

    // 状态处理方法
    const getStatusClass = (status) => {
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

    const getStatusText = (status) => {
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
          return status || '未知';
      }
    };

    // 搜索功能
    const performSearch = () => {
      try {
        // 基础搜索逻辑已通过computed属性实现
        console.log('执行交易搜索:', { search: transactionSearch.value, filter: transactionFilter.value });
      } catch (error) {
        console.error('搜索失败:', error);
        showError('搜索失败', '执行搜索时发生错误', error.message || '未知错误');
      }
    };

    // 执行高级搜索（使用v2 API）
    const performAdvancedSearch = async () => {
      if (loading.value) {
        console.warn('正在加载中，跳过搜索请求');
        return;
      }

      loading.value = true;
      abortController.value = new AbortController();

      try {
        // 构建搜索选项
        const searchOptions = {
          query: transactionSearch.value?.trim() || '',
          transaction_type: transactionFilter.value !== 'all' ? transactionFilter.value : null,
          date_from: dateFrom.value || null,
          date_to: dateTo.value || null,
        };

        console.log('执行高级交易搜索:', searchOptions);
        
        // 使用新的v2 API搜索方法
        const searchResults = await ApiService.searchCash(searchOptions);
        
        if (!Array.isArray(searchResults)) {
          throw new Error('搜索结果格式不正确，期望数组格式');
        }

        // 转换搜索结果为前端格式
        const validTransactions = searchResults
          .filter(transaction => validateTransactionData(transaction))
          .map((transaction) => ({
            id: transaction.uid,
            type: transaction.amount > 0 ? 'income' : 'expense',
            description: transaction.student_id
              ? `学员${transaction.student_id}缴费`
              : '其他交易',
            amount: Math.abs(transaction.amount),
            note: transaction.note || '',
            is_installment: !!transaction.is_installment,
            installment_current: transaction.installment_current || null,
            installment_total: transaction.installment_total || null,
            installment_status: transaction.installment_status || null,
            student_id: transaction.student_id || null,
          }));

        transactions.value = validTransactions;
        console.log(`高级搜索完成，找到 ${validTransactions.length} 条交易记录`);
        
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('高级搜索失败:', error);
          showError('搜索失败', '高级搜索时发生错误', error.message || '未知错误');
        }
      } finally {
        loading.value = false;
        abortController.value = null;
      }
    };

    // 清除日期筛选
    const clearDateFilter = () => {
      dateFrom.value = '';
      dateTo.value = '';
      // 重新加载所有交易数据
      loadTransactions();
    };

    // 数据操作
    const filterTransactions = performSearch; // 保持向后兼容

    // 加载学员列表
    const loadStudents = async () => {
      try {
        const data = await ApiService.getAllStudents();
        
        // 验证学员数据
        if (!Array.isArray(data)) {
          throw new Error('返回的学员数据格式不正确');
        }
        
        const validStudents = data.filter(student => 
          student && typeof student === 'object' && student.uid && student.name
        );
        
        if (validStudents.length !== data.length) {
          console.warn(`过滤了 ${data.length - validStudents.length} 个无效学员记录`);
        }
        
        students.value = validStudents;
        console.log(`成功加载 ${validStudents.length} 个学员记录`);
      } catch (error) {
        console.error('加载学员数据失败:', error);
        students.value = []; // 确保有默认值
        showError('加载失败', '加载学员数据时发生错误', error.message || '未知错误');
      }
    };

    // 数据验证函数
    const validateTransactionData = (transaction) => {
      if (!transaction || typeof transaction !== 'object') return false;
      if (typeof transaction.uid !== 'number' || transaction.uid <= 0) return false;
      if (typeof transaction.amount !== 'number' || !isFinite(transaction.amount)) return false;
      return true;
    };

    // 增强的交易输入验证 - 防止溢出和注入攻击
    const validateTransactionInput = (transaction) => {
      const errors = [];
      
      // 基础对象验证
      if (!transaction || typeof transaction !== 'object') {
        errors.push('交易数据格式无效');
        return { isValid: false, errors };
      }
      
      // 金额验证 - 增强范围和类型检查
      const amount = Number(transaction.amount);
      if (!transaction.amount || isNaN(amount) || !isFinite(amount) || amount <= 0) {
        errors.push('金额必须是大于0的有效数字');
      } else {
        const MAX_AMOUNT = 999999999; // 约10亿
        const MIN_AMOUNT = 0.01; // 最小1分钱
        
        if (amount > MAX_AMOUNT) {
          errors.push(`金额不能超过 ${MAX_AMOUNT.toLocaleString()}`);
        }
        
        if (amount < MIN_AMOUNT) {
          errors.push(`金额不能小于 ${MIN_AMOUNT}`);
        }
        
        // 检查小数位数
        const decimalPlaces = (amount.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          errors.push('金额最多支持2位小数');
        }
      }
      
      // 分期付款验证
      if (isInstallmentMode.value) {
        const installmentTotal = Number(transaction.installment_total);
        if (!installmentTotal || installmentTotal < 2 || installmentTotal > 120) {
          errors.push('分期付款期数必须在2-120之间');
        }
        
        if (!transaction.installment_due_date) {
          errors.push('请选择首次到期日');
        } else {
          try {
            const dueDate = new Date(transaction.installment_due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // 检查日期有效性
            if (isNaN(dueDate.getTime())) {
              errors.push('到期日格式无效');
            } else if (dueDate < today) {
              errors.push('到期日不能早于今天');
            } else {
              // 检查日期不能过于久远
              const maxDate = new Date();
              maxDate.setFullYear(maxDate.getFullYear() + 10);
              if (dueDate > maxDate) {
                errors.push('到期日不能超过10年后');
              }
            }
          } catch (error) {
            errors.push('到期日处理失败');
          }
        }
        
        if (transaction.installment_frequency === 'Custom') {
          const days = Number(transaction.custom_frequency_days);
          if (!days || days < 1 || days > 365) {
            errors.push('自定义频率天数必须在1-365之间');
          }
        }
      }
      
      // 备注验证 - 增强安全检查
      if (transaction.note) {
        if (typeof transaction.note !== 'string') {
          errors.push('备注格式无效');
        } else {
          if (transaction.note.length > 500) {
            errors.push('备注长度不能超过500个字符');
          }
          
          // 检查潜在的脚本注入
          if (/<script|javascript:|data:|vbscript:/i.test(transaction.note)) {
            errors.push('备注包含非法字符');
          }
        }
      }
      
      // 学员ID验证
      if (transaction.student_id !== null && transaction.student_id !== undefined) {
        const studentId = Number(transaction.student_id);
        if (isNaN(studentId) || studentId <= 0) {
          errors.push('学员ID无效');
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    };

    const loadTransactions = async () => {
      if (loading.value) {
        console.warn('交易数据正在加载中，跳过重复请求');
        return;
      }

      loading.value = true;
      abortController.value = new AbortController();

      try {
        // 使用新的v2 API获取财务统计和交易数据
        const [cashTransactions, financialStats] = await Promise.all([
          ApiService.getAllTransactions(),
          ApiService.getFinancialStats()
        ]);
        
        console.log('获取到的财务统计:', financialStats);

        // 验证返回的数据
        if (!Array.isArray(cashTransactions)) {
          throw new Error('返回的交易数据格式不正确，期望数组格式');
        }

        // 验证并转换后端数据为前端格式
        const validTransactions = cashTransactions
          .filter(transaction => {
            const isValid = validateTransactionData(transaction);
            if (!isValid) {
              console.warn('过滤无效交易记录:', transaction);
            }
            return isValid;
          })
          .map((transaction) => {
            try {
              return {
                id: transaction.uid,
                type: transaction.amount > 0 ? 'income' : 'expense',
                description: transaction.student_id
                  ? `学员${transaction.student_id}缴费`
                  : '其他交易',
                amount: Math.abs(transaction.amount),
                note: transaction.note || '',
                is_installment: !!transaction.is_installment,
                installment_current: transaction.installment_current || null,
                installment_total: transaction.installment_total || null,
                installment_status: transaction.installment_status || null,
                student_id: transaction.student_id || null,
              };
            } catch (error) {
              console.warn('转换交易数据失败:', transaction, error);
              return null;
            }
          })
          .filter(transaction => transaction !== null);

        transactions.value = validTransactions;
        
        if (validTransactions.length !== cashTransactions.length) {
          console.warn(`过滤了 ${cashTransactions.length - validTransactions.length} 个无效交易记录`);
        }
        
        console.log(`成功加载 ${validTransactions.length} 条交易记录`);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('加载交易数据失败:', error);
          transactions.value = []; // 确保有默认值
          showError(
            '加载失败',
            '加载交易数据时发生错误，请检查网络连接或稍后重试',
            error.message || '未知错误',
          );
        }
      } finally {
        loading.value = false;
        abortController.value = null;
      }
    };

    const saveTransaction = async () => {
      // 防止重复提交
      if (loading.value) {
        console.warn('正在保存交易，请勿重复提交');
        return;
      }

      // 输入验证
      const validation = validateTransactionInput(currentTransaction.value);
      if (!validation.isValid) {
        showError('输入错误', validation.errors.join('；'));
        return;
      }

      loading.value = true;
      
      try {
        // 数据清理和转换
        const sanitizedTransaction = {
          ...currentTransaction.value,
          amount: Number(currentTransaction.value.amount),
          note: currentTransaction.value.note?.trim() || '',
          student_id: currentTransaction.value.student_id || null,
        };

        if (isInstallmentMode.value) {
          // 处理分期付款
          const frequency =
            sanitizedTransaction.installment_frequency === 'Custom'
              ? `Custom${sanitizedTransaction.custom_frequency_days || 30}`
              : sanitizedTransaction.installment_frequency;

          // 安全的日期处理
          let dueDate;
          try {
            dueDate = new Date(sanitizedTransaction.installment_due_date + 'T00:00:00Z').toISOString();
          } catch (dateError) {
            throw new Error('无效的到期日期格式');
          }

          const result = await ApiService.addInstallmentTransaction(
            sanitizedTransaction.student_id,
            sanitizedTransaction.amount,
            sanitizedTransaction.note,
            Number(sanitizedTransaction.installment_total),
            frequency,
            dueDate,
          );
          
          if (!result) {
            throw new Error('分期付款创建失败，返回数据无效');
          }
          
          console.log('分期付款创建成功:', result);
        } else {
          // 处理普通付款
          const amount = Math.round(Math.abs(sanitizedTransaction.amount));
          const cashAmount =
            sanitizedTransaction.type === 'income' ? amount : -amount;

          const result = await ApiService.addCashTransaction(
            sanitizedTransaction.student_id,
            cashAmount,
            sanitizedTransaction.note,
          );
          
          if (!result) {
            throw new Error('交易创建失败，返回数据无效');
          }
          
          console.log('普通交易创建成功:', result);
        }

        // 重新加载数据
        await loadTransactions();
        closeModals();
        
        // 显示成功消息
        if (showSuccess) {
          const transactionType = isInstallmentMode.value ? '分期付款' : '交易';
          showSuccess('保存成功', `${transactionType}已成功添加`);
        }
      } catch (error) {
        console.error('保存交易失败:', error);
        const errorMessage = error.message || '未知错误';
        showError(
          '保存失败', 
          `保存交易时发生错误: ${errorMessage}`,
          error.stack
        );
      } finally {
        loading.value = false;
      }
    };

    const deleteTransaction = async (id) => {
      if (loading.value) {
        console.warn('正在处理其他操作，请稍后再试');
        return;
      }

      if (!id || isNaN(Number(id)) || Number(id) <= 0) {
        showError('删除失败', '无效的交易ID');
        return;
      }

      // 查找要删除的交易
      const transaction = transactions.value.find(t => t.id === id);
      const confirmMessage = transaction 
        ? `确定要删除这条交易记录吗？\n金额: ${formatTransactionAmount(transaction)}\n描述: ${transaction.description}`
        : '确定要删除这条交易记录吗？';

      if (!confirm(confirmMessage)) {
        return;
      }

      loading.value = true;
      try {
        await ApiService.deleteCashTransaction(Number(id));
        
        console.log(`成功删除交易记录 ID: ${id}`);
        
        // 重新加载数据
        await loadTransactions();
        
        if (showSuccess) {
          showSuccess('删除成功', '交易记录已删除');
        }
      } catch (error) {
        console.error('删除交易失败:', error);
        showError(
          '删除失败', 
          '删除交易记录时发生错误，请稍后重试', 
          error.message || '未知错误'
        );
      } finally {
        loading.value = false;
      }
    };

    const showUpdateStatus = (transaction) => {
      selectedTransaction.value = transaction;
      selectedStatus.value = transaction.installment_status || 'Pending';
      showUpdateStatusModal.value = true;
    };

    const updateInstallmentStatus = async () => {
      if (!selectedTransaction.value) return;

      loading.value = true;
      try {
        await ApiService.updateInstallmentStatus(
          selectedTransaction.value.id,
          selectedStatus.value,
        );

        await loadTransactions();
        closeModals();
        showSuccess('成功', '分期状态已更新');
      } catch (error) {
        console.error('更新分期状态失败:', error);
        showError('更新失败', '更新分期状态时发生错误', error.message);
      } finally {
        loading.value = false;
      }
    };

    const closeModals = () => {
      showAddTransaction.value = false;
      showUpdateStatusModal.value = false;
      isInstallmentMode.value = false;
      selectedTransaction.value = null;
      currentTransaction.value = {
        type: 'income',
        amount: '',
        student_id: null,
        note: '',
        installment_total: 2,
        installment_frequency: 'Monthly',
        custom_frequency_days: 30,
        installment_due_date: new Date().toISOString().split('T')[0],
      };
    };

    onMounted(() => {
      loadStudents();
      loadTransactions();
    });

    onUnmounted(() => {
      if (abortController.value) {
        abortController.value.abort();
      }
    });

    return {
      loading,
      transactions,
      students,
      filteredTransactions,
      transactionFilter,
      transactionSearch,
      dateFrom,
      dateTo,
      showAddTransaction,
      showUpdateStatusModal,
      isInstallmentMode,
      currentTransaction,
      totalIncome,
      totalExpense,
      netProfit,
      installmentCount,
      pendingInstallments,
      selectedStatus,
      formatCurrency,
      formatTransactionAmount,
      filterTransactions,
      performSearch,
      performAdvancedSearch,
      clearDateFilter,
      deleteTransaction,
      saveTransaction,
      showUpdateStatus,
      updateInstallmentStatus,
      closeModals,
      getStatusClass,
      getStatusText,
    };
  },
};
</script>

<style scoped>
.payment-mode-toggle {
  display: flex;
  margin-bottom: 1rem;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.mode-btn {
  flex: 1;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary);
}

.mode-btn.active {
  background: var(--accent-primary);
  color: white;
}

.installment-fields {
  border-left: 3px solid var(--accent-primary);
  padding-left: 1rem;
  margin: 1rem 0;
}

.form-note {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
  display: block;
}

.installment-badge {
  background: var(--accent-primary);
  color: white;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  margin-left: 0.5rem;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-paid {
  background: #d4edda;
  color: #155724;
}

.status-overdue {
  background: #f8d7da;
  color: #721c24;
}

.status-cancelled {
  background: #e2e3e5;
  color: #383d41;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  margin-right: 0.5rem;
}

.status-btn:hover {
  background-color: var(--accent-primary);
  color: white;
}

.delete-btn:hover {
  background-color: var(--accent-danger);
  color: white;
}

.overview-card.installment {
  border-left: 4px solid var(--accent-primary);
}

.search-btn {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-left: 0.5rem;
  transition: all 0.3s ease;
}

.search-btn:hover:not(:disabled) {
  background-color: #1976d2;
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.date-filter {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.date-range label {
  font-weight: 500;
  color: var(--text-primary);
  margin-right: 0.5rem;
}

.date-range input {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.date-range span {
  color: var(--text-secondary);
  font-weight: 500;
}

.apply-date-btn {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.apply-date-btn:hover:not(:disabled) {
  background-color: #1976d2;
}

.clear-date-btn {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.clear-date-btn:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.card-subtext {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* 其他现有样式保持不变 */
.financial-statistics {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
}

.no-spinners::-webkit-outer-spin-button,
.no-spinners::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.no-spinners {
  -moz-appearance: textfield;
}

.loading-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: var(--accent-primary);
  transform: scaleX(0);
  transform-origin: left;
  animation: loading 1.5s ease-in-out forwards;
  z-index: 10;
}

@keyframes loading {
  to {
    transform: scaleX(1);
    transform-origin: right;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.add-btn {
  background-color: var(--accent-secondary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-btn:hover:not(:disabled) {
  background-color: #45a049;
  transform: translateY(-1px);
}

.add-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.overview-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px var(--shadow-color);
  transition: transform 0.3s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
}

.card-icon {
  font-size: 2.5rem;
  opacity: 0.8;
}

.card-content h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.overview-card.balance .card-value {
  color: var(--accent-primary);
}

.transactions-section {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px var(--shadow-color);
  flex: 1;
}

.transactions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.transactions-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.filter-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-controls select,
.filter-controls input {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.transactions-table {
  overflow-x: auto;
}

.transactions-table table {
  width: 100%;
  border-collapse: collapse;
}

.transactions-table th,
.transactions-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.transactions-table th {
  background-color: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-primary);
}

.transactions-table tr:hover {
  background-color: var(--bg-tertiary);
}

.transaction-type {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.transaction-type.income {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.transaction-type.expense {
  background-color: #ffebee;
  color: #c62828;
}

.amount {
  font-weight: 600;
}

.amount.income {
  color: var(--accent-secondary);
}

.amount.expense {
  color: var(--accent-danger);
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--bg-primary);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.form-group select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.cancel-btn,
.save-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.cancel-btn {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.save-btn {
  background-color: var(--accent-primary);
  color: white;
}

.cancel-btn:hover {
  background-color: var(--border-color);
}

.save-btn:hover {
  background-color: #1976d2;
}

@media (max-width: 768px) {
  .overview-cards {
    grid-template-columns: 1fr;
  }

  .transactions-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .filter-controls {
    flex-direction: column;
  }
}
</style>

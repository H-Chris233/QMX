<template>
  <div class="financial-statistics">
    <div class="section-header">
      <h2>收支统计</h2>
      <button class="add-btn" @click="showAddTransaction = true">
        ➕ 添加交易
      </button>
    </div>

    <!-- 总览卡片 -->
    <div class="overview-cards">
      <div class="overview-card income">
        <div class="card-icon">💰</div>
        <div class="card-content">
          <h3>总收入</h3>
          <div class="card-value">¥{{ totalIncome }}</div>
          <div class="card-change">+{{ monthlyChange }}% 本月</div>
        </div>
      </div>
      
      <div class="overview-card expense">
        <div class="card-icon">💸</div>
        <div class="card-content">
          <h3>总支出</h3>
          <div class="card-value">¥{{ totalExpense }}</div>
          <div class="card-change">{{ monthlyExpenseChange }}% 本月</div>
        </div>
      </div>
      
      <div class="overview-card balance">
        <div class="card-icon">💎</div>
        <div class="card-content">
          <h3>净收益</h3>
          <div class="card-value">¥{{ netProfit }}</div>
          <div class="card-change">{{ profitChange }}% 本月</div>
        </div>
      </div>
      
      <div class="overview-card pending">
        <div class="card-icon">⏳</div>
        <div class="card-content">
          <h3>待收款项</h3>
          <div class="card-value">¥{{ pendingAmount }}</div>
          <div class="card-change">{{ pendingCount }} 笔</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <div class="chart-container">
        <h3>月度收支趋势</h3>
        <div class="chart-placeholder">
          <div class="chart-bars">
            <div v-for="(month, index) in monthlyData" :key="index" class="bar-group">
              <div class="bar income-bar" :style="{ height: month.income / 100 + 'px' }"></div>
              <div class="bar expense-bar" :style="{ height: month.expense / 100 + 'px' }"></div>
              <div class="bar-label">{{ month.label }}</div>
            </div>
          </div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color income-color"></div>
              <span>收入</span>
            </div>
            <div class="legend-item">
              <div class="legend-color expense-color"></div>
              <span>支出</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-container">
        <h3>收入分类</h3>
        <div class="pie-chart-placeholder">
          <div class="pie-chart">
            <div class="pie-segment" v-for="(category, index) in incomeCategories" :key="index" 
                 :style="{ 
                   '--percentage': category.percentage + '%',
                   '--color': getCategoryColor(index),
                   '--rotation': (category.cumulativePercentage * 3.6) + 'deg'
                 }">
            </div>
          </div>
          <div class="pie-legend">
            <div v-for="(category, index) in incomeCategories" :key="index" class="legend-item">
              <div class="legend-color" :style="{ backgroundColor: getCategoryColor(index) }"></div>
              <span>{{ category.name }} ({{ category.percentage }}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 交易记录 -->
    <div class="transactions-section">
      <div class="transactions-header">
        <h3>最近交易</h3>
        <div class="filter-controls">
          <select v-model="transactionFilter" @change="filterTransactions">
            <option value="all">全部交易</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
          </select>
          <input 
            v-model="transactionSearch" 
            type="text" 
            placeholder="搜索交易..."
            @input="filterTransactions"
          >
        </div>
      </div>

      <div class="transactions-table">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>描述</th>
              <th>分类</th>
              <th>金额</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="transaction in filteredTransactions" :key="transaction.id">
              <td>{{ transaction.date }}</td>
              <td>
                <span :class="['transaction-type', transaction.type]">
                  {{ transaction.type === 'income' ? '收入' : '支出' }}
                </span>
              </td>
              <td>{{ transaction.description }}</td>
              <td>{{ transaction.category }}</td>
              <td :class="['amount', transaction.type]">
                {{ transaction.type === 'income' ? '+' : '-' }}¥{{ transaction.amount }}
              </td>
              <td>
                <span :class="['status-badge', transaction.status]">
                  {{ getStatusText(transaction.status) }}
                </span>
              </td>
              <td class="actions">
                <button class="edit-btn" @click="editTransaction(transaction)">✏️</button>
                <button class="delete-btn" @click="deleteTransaction(transaction.id)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加交易模态框 -->
    <div v-if="showAddTransaction || showEditTransaction" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ showAddTransaction ? '添加交易' : '编辑交易' }}</h3>
          <button class="close-btn" @click="closeModals">✖️</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>类型</label>
            <select v-model="currentTransaction.type">
              <option value="income">收入</option>
              <option value="expense">支出</option>
            </select>
          </div>
          <div class="form-group">
            <label>描述</label>
            <input v-model="currentTransaction.description" type="text" placeholder="请输入交易描述">
          </div>
          <div class="form-group">
            <label>分类</label>
            <select v-model="currentTransaction.category">
              <option value="">请选择分类</option>
              <option v-if="currentTransaction.type === 'income'" value="学费">学费</option>
              <option v-if="currentTransaction.type === 'income'" value="教材费">教材费</option>
              <option v-if="currentTransaction.type === 'income'" value="其他收入">其他收入</option>
              <option v-if="currentTransaction.type === 'expense'" value="教师工资">教师工资</option>
              <option v-if="currentTransaction.type === 'expense'" value="场地租金">场地租金</option>
              <option v-if="currentTransaction.type === 'expense'" value="设备采购">设备采购</option>
              <option v-if="currentTransaction.type === 'expense'" value="其他支出">其他支出</option>
            </select>
          </div>
          <div class="form-group">
            <label>金额</label>
            <input v-model.number="currentTransaction.amount" type="number" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>状态</label>
            <select v-model="currentTransaction.status">
              <option value="completed">已完成</option>
              <option value="pending">待处理</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModals">取消</button>
          <button class="save-btn" @click="saveTransaction">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ApiService } from '../api/ApiService'

export default {
  name: 'FinancialStatistics',
  setup() {
    const transactions = ref([])
    const transactionFilter = ref('all')
    const transactionSearch = ref('')
    const showAddTransaction = ref(false)
    const showEditTransaction = ref(false)
    const currentTransaction = ref({
      id: null,
      type: 'income',
      description: '',
      category: '',
      amount: 0,
      status: 'completed',
      date: ''
    })
    const loading = ref(false)

    const monthlyData = ref([
      { label: '1月', income: 0, expense: 0 },
      { label: '2月', income: 0, expense: 0 },
      { label: '3月', income: 0, expense: 0 },
      { label: '4月', income: 0, expense: 0 },
      { label: '5月', income: 0, expense: 0 },
      { label: '6月', income: 0, expense: 0 }
    ])

    const filteredTransactions = computed(() => {
      let filtered = transactions.value
      
      if (transactionFilter.value !== 'all') {
        filtered = filtered.filter(t => t.type === transactionFilter.value)
      }
      
      if (transactionSearch.value) {
        filtered = filtered.filter(t => 
          t.description.includes(transactionSearch.value) ||
          t.category.includes(transactionSearch.value)
        )
      }
      
      return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
    })

    const totalIncome = computed(() => {
      return transactions.value
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0)
    })

    const totalExpense = computed(() => {
      return transactions.value
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0)
    })

    const netProfit = computed(() => totalIncome.value - totalExpense.value)

    const pendingAmount = computed(() => {
      return transactions.value
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0)
    })

    const pendingCount = computed(() => {
      return transactions.value.filter(t => t.status === 'pending').length
    })

    const incomeCategories = computed(() => {
      const incomeTransactions = transactions.value.filter(t => t.type === 'income' && t.status === 'completed')
      const categories = {}
      
      incomeTransactions.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount
      })
      
      const total = Object.values(categories).reduce((sum, amount) => sum + amount, 0)
      let cumulative = 0
      
      return Object.entries(categories).map(([name, amount]) => {
        const percentage = Math.round((amount / total) * 100)
        cumulative += percentage
        return {
          name,
          amount,
          percentage,
          cumulativePercentage: cumulative - percentage
        }
      })
    })

    const monthlyChange = ref(15)
    const monthlyExpenseChange = ref(-8)
    const profitChange = ref(25)

    const getStatusText = (status) => {
      const statusMap = {
        completed: '已完成',
        pending: '待处理',
        cancelled: '已取消'
      }
      return statusMap[status] || status
    }

    const getCategoryColor = (index) => {
      const colors = ['#2196f3', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4']
      return colors[index % colors.length]
    }

    const filterTransactions = () => {
      // 筛选逻辑已通过computed属性实现
    }

    const editTransaction = (transaction) => {
      currentTransaction.value = { ...transaction }
      showEditTransaction.value = true
    }

  
    // 加载交易数据
    const loadTransactions = async () => {
      loading.value = true
      try {
        const cashTransactions = await ApiService.getAllTransactions()
        
        // 转换后端数据为前端格式
        transactions.value = cashTransactions.map(transaction => ({
          id: transaction.uid,
          type: transaction.cash > 0 ? 'income' : 'expense',
          description: transaction.student_id ? `学员${transaction.student_id}缴费` : '其他交易',
          category: transaction.cash > 0 ? '学费' : '其他支出',
          amount: Math.abs(transaction.cash),
          status: 'completed', // 后端没有状态字段，默认为已完成
          date: new Date().toISOString().split('T')[0] // 后端没有日期字段，使用当前日期
        }))

        // 更新月度数据
        updateMonthlyData()
        
      } catch (error) {
        console.error('加载交易数据失败:', error)
        alert('加载交易数据失败')
      } finally {
        loading.value = false
      }
    }

    // 更新月度数据
    const updateMonthlyData = () => {
      const currentMonth = new Date().getMonth()
      const monthlyStats = {}
      
      // 初始化月度数据
      for (let i = 0; i < 6; i++) {
        const month = (currentMonth - i + 12) % 12
        monthlyStats[month] = { income: 0, expense: 0 }
      }
      
      // 统计每月收支
      transactions.value.forEach(transaction => {
        const date = new Date(transaction.date)
        const month = date.getMonth()
        
        if (monthlyStats[month]) {
          if (transaction.type === 'income') {
            monthlyStats[month].income += transaction.amount
          } else {
            monthlyStats[month].expense += transaction.amount
          }
        }
      })
      
      // 更新月度数据数组
      const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      monthlyData.value = Object.entries(monthlyStats).map(([month, data]) => ({
        label: monthLabels[parseInt(month)],
        income: data.income,
        expense: data.expense
      })).reverse()
    }

    const saveTransaction = async () => {
      if (!currentTransaction.value.description || !currentTransaction.value.amount) {
        alert('请填写必要信息')
        return
      }

      try {
        const cashAmount = currentTransaction.value.type === 'income' 
          ? currentTransaction.value.amount 
          : -currentTransaction.value.amount

        if (showAddTransaction.value) {
          // 添加新交易
          await ApiService.addCashTransaction(
            cashAmount,
            currentTransaction.value.student_id || null
          )
        } else {
          // 编辑现有交易 - 后端目前不支持编辑，需要删除后重新添加
          await ApiService.deleteCashTransaction(currentTransaction.value.id)
          await ApiService.addCashTransaction(
            cashAmount,
            currentTransaction.value.student_id || null
          )
        }

        // 重新加载数据
        await loadTransactions()
        closeModals()
        
      } catch (error) {
        console.error('保存交易失败:', error)
        alert('保存交易失败')
      }
    }

    const deleteTransaction = async (id) => {
      if (confirm('确定要删除这条交易记录吗？')) {
        try {
          await ApiService.deleteCashTransaction(id)
          await loadTransactions()
        } catch (error) {
          console.error('删除交易失败:', error)
          alert('删除交易失败')
        }
      }
    }

    const closeModals = () => {
      showAddTransaction.value = false
      showEditTransaction.value = false
      currentTransaction.value = {
        id: null,
        type: 'income',
        description: '',
        category: '',
        amount: 0,
        status: 'completed',
        date: '',
        student_id: null
      }
    }

    onMounted(() => {
      loadTransactions()
    })

    return {
      transactions,
      filteredTransactions,
      transactionFilter,
      transactionSearch,
      showAddTransaction,
      showEditTransaction,
      currentTransaction,
      monthlyData,
      loading,
      totalIncome,
      totalExpense,
      netProfit,
      pendingAmount,
      pendingCount,
      incomeCategories,
      monthlyChange,
      monthlyExpenseChange,
      profitChange,
      getStatusText,
      getCategoryColor,
      filterTransactions,
      editTransaction,
      deleteTransaction,
      saveTransaction,
      closeModals
    }
  }
}
</script>

<style scoped>
.financial-statistics {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.add-btn:hover {
  background-color: #45a049;
  transform: translateY(-1px);
}

/* 总览卡片 */
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

.card-change {
  font-size: 0.875rem;
  color: var(--accent-secondary);
}

.overview-card.expense .card-change {
  color: var(--accent-danger);
}

.overview-card.balance .card-value {
  color: var(--accent-primary);
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.chart-container {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.chart-container h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.chart-placeholder {
  height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 200px;
  width: 100%;
  margin-bottom: 1rem;
}

.bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 40px;
}

.bar {
  width: 15px;
  border-radius: 2px;
  transition: height 0.3s ease;
}

.income-bar {
  background-color: var(--accent-secondary);
}

.expense-bar {
  background-color: var(--accent-danger);
}

.bar-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.income-color {
  background-color: var(--accent-secondary);
}

.expense-color {
  background-color: var(--accent-danger);
}

.pie-chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 300px;
}

.pie-chart {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: conic-gradient(
    #2196f3 0deg 120deg,
    #4caf50 120deg 200deg,
    #ff9800 200deg 280deg,
    #f44336 280deg 360deg
  );
  position: relative;
}

.pie-segment {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  clip-path: polygon(50% 50%, 50% 0%, var(--percentage) 0%);
  background-color: var(--color);
  transform: rotate(var(--rotation));
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 交易记录 */
.transactions-section {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px var(--shadow-color);
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

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.completed {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.status-badge.pending {
  background-color: #fff3e0;
  color: #f57c00;
}

.status-badge.cancelled {
  background-color: #ffebee;
  color: #c62828;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn, .delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.edit-btn:hover {
  background-color: var(--accent-primary);
  color: white;
}

.delete-btn:hover {
  background-color: var(--accent-danger);
  color: white;
}

/* 模态框样式 */
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
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.cancel-btn, .save-btn {
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
  
  .charts-section {
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
  
  .pie-chart-placeholder {
    flex-direction: column;
    gap: 2rem;
  }
}
</style>
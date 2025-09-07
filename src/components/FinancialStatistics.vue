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
        title="快捷键: Ctrl+N"
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
    </div>

    <!-- 交易记录 -->
    <div class="transactions-section">
      <div class="transactions-header">
        <h3>交易记录</h3>
        <div class="filter-controls">
          <select v-model="transactionFilter" @change="filterTransactions" aria-label="交易类型筛选">
            <option value="all">全部交易</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
          </select>
          <input 
            v-model="transactionSearch" 
            type="text" 
            placeholder="搜索交易..."
            aria-label="交易搜索"
          >
        </div>
      </div>

      <div class="transactions-table">
        <table>
          <thead>
            <tr>
              <th>描述</th>
              <th>金额</th>
              <th>类型</th>
              <th>备注</th> <!-- 新增备注列 -->
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="transaction in filteredTransactions" :key="transaction.id">
              <td>{{ transaction.description }}</td>
              <td :class="['amount', transaction.type]">
                {{ formatTransactionAmount(transaction) }}
              </td>
              <td>
                <span :class="['transaction-type', transaction.type]">
                  {{ transaction.type === 'income' ? '收入' : '支出' }}
                </span>
              </td>
              <td>{{ transaction.note || '-' }}</td> <!-- 显示备注 -->
              <td class="actions">
                <button 
                  class="delete-btn" 
                  @click="deleteTransaction(transaction.id)" 
                  title="快捷键: Delete"
                  aria-label="删除交易"
                >🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加交易模态框 -->
    <div v-if="showAddTransaction" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h3 id="modal-title">添加交易</h3>
          <button class="close-btn" @click="closeModals" aria-label="关闭模态框">✖️</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="transaction-type">类型</label>
            <select id="transaction-type" v-model="currentTransaction.type">
              <option value="income">收入</option>
              <option value="expense">支出</option>
            </select>
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
            >
          </div>
          <div class="form-group">
            <label for="student-id">学员 (可选)</label>
            <select 
              id="student-id" 
              v-model="currentTransaction.student_id"
            >
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
          >保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { ApiService } from '../api/ApiService'

export default {
  name: 'FinancialStatistics',
  setup() {
    const loading = ref(false)
    const transactions = ref([])
    const students = ref([]) // 添加学员列表
    const transactionFilter = ref('all')
    const transactionSearch = ref('')
    const showAddTransaction = ref(false)
    const abortController = ref(null)
    const { showError } = inject('errorHandler')

    const currentTransaction = ref({
      type: 'income',
      amount: '',
      student_id: null,
      note: ''
    })

    // 计算属性
    const filteredTransactions = computed(() => {
      let filtered = transactions.value
      
      if (transactionFilter.value !== 'all') {
        filtered = filtered.filter(t => t.type === transactionFilter.value)
      }
      
      if (transactionSearch.value) {
        const search = transactionSearch.value.toLowerCase()
        filtered = filtered.filter(t => 
          t.description.toLowerCase().includes(search) ||
          (t.note && t.note.toLowerCase().includes(search)) // 搜索备注
        )
      }
      
      return filtered
    })

    const totalIncome = computed(() => {
      return transactions.value
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
    })

    const totalExpense = computed(() => {
      return transactions.value
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    })

    const netProfit = computed(() => totalIncome.value - totalExpense.value)

    // 格式化方法
    const formatCurrency = (value) => {
      return new Intl.NumberFormat('zh-CN', { 
        style: 'currency', 
        currency: 'CNY' 
      }).format(value)
    }

    const formatTransactionAmount = (transaction) => {
      const amount = transaction.type === 'income' ? transaction.amount : -transaction.amount
      return new Intl.NumberFormat('zh-CN', { 
        style: 'currency', 
        currency: 'CNY' 
      }).format(amount)
    }

    // 数据操作
    const filterTransactions = () => {
      // 筛选逻辑已通过computed属性实现
    }

    // 加载学员列表
    const loadStudents = async () => {
      try {
        students.value = await ApiService.getAllStudents()
      } catch (error) {
        console.error('加载学员数据失败:', error)
        showError('加载失败', '加载学员数据时发生错误', error.message)
      }
    }

    const loadTransactions = async () => {
      loading.value = true
      abortController.value = new AbortController()
      
      try {
        const cashTransactions = await ApiService.getAllTransactions({
          signal: abortController.value.signal
        })
        
        // 转换后端数据为前端格式
        transactions.value = cashTransactions.map(transaction => ({
          id: transaction.uid,
          type: transaction.cash > 0 ? 'income' : 'expense',
          description: transaction.student_id 
            ? `学员${transaction.student_id}缴费` 
            : '其他交易',
          amount: Math.abs(transaction.cash),
          note: transaction.note || '' // 添加备注字段
        }))
        
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('加载交易数据失败:', error)
          showError(
            '加载失败', 
            '加载交易数据时发生错误，请检查网络连接或稍后重试',
            error.message
          )
        }
      } finally {
        loading.value = false
        abortController.value = null
      }
    }

    const saveTransaction = async () => {
      // 检查金额是否已输入且为有效数值
      if (!currentTransaction.value.amount || currentTransaction.value.amount <= 0) {
        showError('输入错误', '请输入有效金额')
        return
      }

      loading.value = true
      try {
        // 确保金额是有效的整数
        const amount = Math.round(Math.abs(currentTransaction.value.amount) * 100) // 转换为分
        const cashAmount = currentTransaction.value.type === 'income' 
          ? amount 
          : -amount

        await ApiService.addCashTransaction(
          currentTransaction.value.student_id,
          cashAmount,
          currentTransaction.value.note || '无' // 传递备注
        )

        // 重新加载数据
        await loadTransactions()
        closeModals()
        
      } catch (error) {
        console.error('保存交易失败:', error)
        showError('保存失败', '保存交易时发生错误', error.message)
      } finally {
        loading.value = false
      }
    }

    const deleteTransaction = async (id) => {
      if (confirm('确定要删除这条交易记录吗？')) {
        loading.value = true
        try {
          await ApiService.deleteCashTransaction(id)
          await loadTransactions()
        } catch (error) {
          console.error('删除交易失败:', error)
          showError('删除失败', '删除交易记录时发生错误', error.message)
        } finally {
          loading.value = false
        }
      }
    }

    const closeModals = () => {
      showAddTransaction.value = false
      currentTransaction.value = {
        type: 'income',
        amount: '',
        student_id: null,
        note: ''
      }
    }

    // 键盘事件处理
    const handleKeyDown = (event) => {
      // 如果模态框打开，只处理模态框内的快捷键
      if (showAddTransaction.value) {
        if (event.key === 'Escape') {
          closeModals()
        }
        return
      }

      // 忽略在输入框中的快捷键
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return
      
      // 全局快捷键
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault()
        showAddTransaction.value = true
      }
      // Ctrl+S 保存交易
      else if (event.ctrlKey && event.key === 's' && showAddTransaction.value) {
        event.preventDefault()
        saveTransaction()
      }
      // F5 刷新
      else if (event.key === 'F5') {
        event.preventDefault()
        loadTransactions()
      }
      // Delete 删除交易
      else if (event.key === 'Delete' && selectedTransaction) {
        event.preventDefault()
        deleteTransaction(selectedTransaction)
      }
    }

    onMounted(() => {
      loadStudents() // 加载学员列表
      loadTransactions()
      window.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
      if (abortController.value) {
        abortController.value.abort()
      }
    })

    return {
      loading,
      transactions,
      students, // 导出学员列表
      filteredTransactions,
      transactionFilter,
      transactionSearch,
      showAddTransaction,
      currentTransaction,
      totalIncome,
      totalExpense,
      netProfit,
      formatCurrency,
      formatTransactionAmount,
      filterTransactions,
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
  position: relative;
}

/* 隐藏数字输入框的上下调整按钮 */
.no-spinners::-webkit-outer-spin-button,
.no-spinners::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.no-spinners {
  -moz-appearance: textfield;
}

/* 加载进度条 */
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

.overview-card.balance .card-value {
  color: var(--accent-primary);
}

/* 交易记录 */
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

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
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

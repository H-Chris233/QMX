<template>
  <div class="financial-statistics">
    <div class="section-header">
      <h2>收支统计</h2>
      <button class="add-btn" @click="showAddTransaction = true" title="快捷键: Ctrl+N">
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
        </div>
      </div>
      
      <div class="overview-card expense">
        <div class="card-icon">💸</div>
        <div class="card-content">
          <h3>总支出</h3>
          <div class="card-value">¥{{ totalExpense }}</div>
        </div>
      </div>
      
      <div class="overview-card balance">
        <div class="card-icon">💎</div>
        <div class="card-content">
          <h3>净收益</h3>
          <div class="card-value">¥{{ netProfit }}</div>
        </div>
      </div>
    </div>

    <!-- 交易记录 -->
    <div class="transactions-section">
      <div class="transactions-header">
        <h3>交易记录</h3>
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
              <th>描述</th>
              <th>金额</th>
              <th>类型</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="transaction in filteredTransactions" :key="transaction.id">
              <td>{{ transaction.description }}</td>
              <td :class="['amount', transaction.type]">
                {{ transaction.type === 'income' ? '+' : '-' }}¥{{ transaction.amount }}
              </td>
              <td>
                <span :class="['transaction-type', transaction.type]">
                  {{ transaction.type === 'income' ? '收入' : '支出' }}
                </span>
              </td>
              <td class="actions">
                <button class="delete-btn" @click="deleteTransaction(transaction.id)" title="快捷键: Delete">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加交易模态框 -->
    <div v-if="showAddTransaction" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>添加交易</h3>
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
            <label>金额</label>
            <input v-model.number="currentTransaction.amount" type="number" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>学员ID (可选)</label>
            <input v-model.number="currentTransaction.student_id" type="number" placeholder="留空表示其他交易">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ApiService } from '../api/ApiService'

export default {
  name: 'FinancialStatistics',
  setup() {
    const transactions = ref([])
    const transactionFilter = ref('all')
    const transactionSearch = ref('')
    const showAddTransaction = ref(false)
    const currentTransaction = ref({
      type: 'income',
      amount: 0,
      student_id: null
    })
    const loading = ref(false)

    const filteredTransactions = computed(() => {
      let filtered = transactions.value
      
      if (transactionFilter.value !== 'all') {
        filtered = filtered.filter(t => t.type === transactionFilter.value)
      }
      
      if (transactionSearch.value) {
        filtered = filtered.filter(t => 
          t.description.includes(transactionSearch.value)
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

    const filterTransactions = () => {
      // 筛选逻辑已通过computed属性实现
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
          amount: Math.abs(transaction.cash)
        }))
        
      } catch (error) {
        console.error('加载交易数据失败:', error)
        alert('加载交易数据失败')
      } finally {
        loading.value = false
      }
    }

    const saveTransaction = async () => {
      if (!currentTransaction.value.amount || currentTransaction.value.amount <= 0) {
        alert('请输入有效金额')
        return
      }

      try {
        const cashAmount = currentTransaction.value.type === 'income' 
          ? currentTransaction.value.amount 
          : -currentTransaction.value.amount

        await ApiService.addCashTransaction(
          cashAmount,
          currentTransaction.value.student_id
        )

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
      currentTransaction.value = {
        type: 'income',
        amount: 0,
        student_id: null
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

      // 全局快捷键
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault()
        showAddTransaction.value = true
      }
      // F5 刷新
      else if (event.key === 'F5') {
        event.preventDefault()
        loadTransactions()
      }
    }

    onMounted(() => {
      loadTransactions()
      window.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
    })

    return {
      transactions,
      filteredTransactions,
      transactionFilter,
      transactionSearch,
      showAddTransaction,
      currentTransaction,
      loading,
      totalIncome,
      totalExpense,
      netProfit,
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
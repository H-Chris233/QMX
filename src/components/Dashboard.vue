<template>
  <div class="student-management">
    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-progress"></div>
    
    <!-- 页面标题 -->
    <div class="section-header">
      <h2>总仪表板</h2>
      <button 
        class="add-btn" 
        @click="loadDashboardData" 
        :disabled="loading"
        title="快捷键: Ctrl+R"
        aria-label="刷新仪表板数据"
      >
        {{ loading ? '加载中...' : '刷新数据' }}
      </button>
    </div>

    <!-- 统计信息 -->
    <div class="stats-grid">
      <!-- 总收入 -->
      <div class="stat-card">
        <h3>总收入</h3>
        <div class="stat-value">{{ formatCurrency(dashboardData.totalRevenue) }}</div>
      </div>

      <!-- 学员总数 -->
      <div class="stat-card">
        <h3>学员总数</h3>
        <div class="stat-value">{{ formatNumber(dashboardData.activeStudents) }}</div>
      </div>

      <!-- 平均成绩 -->
      <div class="stat-card">
        <h3>平均成绩</h3>
        <div class="stat-value">{{ formatDecimal(dashboardData.averageGrade) }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, inject } from 'vue'
import { ApiService } from '../api/ApiService'

export default {
  name: 'Dashboard',
  setup() {
    const loading = ref(false)
    const abortController = ref(null)
    const { showError } = inject('errorHandler')
     
    // 仪表盘数据（使用reactive保持响应性）
    const dashboardData = reactive({
      totalRevenue: 0,
      activeStudents: 0,
      averageGrade: 0
    })

    // 数据获取
    const loadDashboardData = async () => {
      loading.value = true
      abortController.value = new AbortController()
      
      try {
        const stats = await ApiService.getDashboardStats({
          signal: abortController.value.signal
        })
        
        // 更新仪表板数据
        dashboardData.totalRevenue = stats.total_revenue || 0
        dashboardData.activeStudents = stats.total_students || 0
        dashboardData.averageGrade = parseFloat(stats.average_score?.toFixed(1)) || 0

      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('加载仪表盘数据失败:', error)
          showError(
            '数据加载失败', 
            '无法获取仪表板数据，请检查网络连接或稍后重试',
            error.message
          )
        }
      } finally {
        loading.value = false
        abortController.value = null
      }
    }

    // 格式化方法（集成到组件内部）
    const formatNumber = (value) => {
      return new Intl.NumberFormat().format(value)
    }

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('zh-CN', { 
        style: 'currency', 
        currency: 'CNY' 
      }).format(value)
    }

    const formatDecimal = (value) => {
      return parseFloat(value).toFixed(1)
    }

    // 键盘快捷键处理
    const handleKeyDown = (event) => {
      // 忽略在输入框中的快捷键
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return
      
      if (event.ctrlKey && event.key === 'r') {
        event.preventDefault()
        loadDashboardData()
      }
    }

    // 生命周期钩子
    onMounted(() => {
      loadDashboardData()
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
      dashboardData,
      loadDashboardData,
      formatNumber,
      formatCurrency,
      formatDecimal
    }
  }
}
</script>

<style scoped>
.student-management {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background-color: var(--bg-primary);
}

/* 加载进度条优化 */
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px var(--shadow-color);
  transition: transform 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card h3 {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-primary);
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-value {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
}
</style>

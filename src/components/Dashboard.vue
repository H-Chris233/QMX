<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>数据仪表盘</h2>
      <button class="refresh-btn" @click="loadDashboardData" :disabled="loading">
        {{ loading ? '加载中...' : '刷新数据' }}
      </button>
    </div>

    <!-- 关键指标卡片 -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon revenue">💰</div>
        <div class="metric-content">
          <h3>总收入</h3>
          <div class="metric-value">¥{{ formatNumber(totalRevenue) }}</div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon students">👥</div>
        <div class="metric-content">
          <h3>学员总数</h3>
          <div class="metric-value">{{ activeStudents }}</div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon grades">📊</div>
        <div class="metric-content">
          <h3>平均成绩</h3>
          <div class="metric-value">{{ averageGrade }}</div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon courses">📚</div>
        <div class="metric-content">
          <h3>班级数量</h3>
          <div class="metric-value">{{ activeCourses }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, inject } from 'vue'
import { ApiService } from '../api/ApiService'

export default {
  name: 'Dashboard',
  setup() {
    const loading = ref(false)
    const { showError } = inject('errorHandler')
    
    // 仪表盘数据
    const dashboardData = ref({
      totalRevenue: 0,
      activeStudents: 0,
      averageGrade: 0,
      activeCourses: 0
    })

    // 计算属性
    const totalRevenue = computed(() => dashboardData.value.totalRevenue)
    const activeStudents = computed(() => dashboardData.value.activeStudents)
    const averageGrade = computed(() => dashboardData.value.averageGrade)
    const activeCourses = computed(() => dashboardData.value.activeCourses)

    // 方法
    const formatNumber = (num) => {
      return num.toLocaleString()
    }

    // 加载仪表盘数据
    const loadDashboardData = async () => {
      loading.value = true
      try {
        const stats = await ApiService.getDashboardStats()
        
        // 更新仪表盘数据
        dashboardData.value = {
          totalRevenue: stats.total_revenue || 0,
          activeStudents: stats.total_students || 0,
          averageGrade: stats.average_score || 0,
          activeCourses: stats.active_courses || 0
        }

      } catch (error) {
        console.error('加载仪表盘数据失败:', error)
        showError('加载失败', '加载仪表盘数据时发生错误', error.message)
      } finally {
        loading.value = false
      }
    }

    onMounted(() => {
      loadDashboardData()
    })

    return {
      loading,
      totalRevenue,
      activeStudents,
      averageGrade,
      activeCourses,
      formatNumber,
      loadDashboardData
    }
  }
}
</script>

<style scoped>
.dashboard {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dashboard-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.refresh-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
  background-color: var(--bg-tertiary);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 指标卡片 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.metric-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px var(--shadow-color);
  transition: transform 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.metric-icon {
  font-size: 2.5rem;
  opacity: 0.8;
}

.metric-icon.revenue { color: #4caf50; }
.metric-icon.students { color: #2196f3; }
.metric-icon.grades { color: #ff9800; }
.metric-icon.courses { color: #9c27b0; }

.metric-content h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.metric-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
</style>
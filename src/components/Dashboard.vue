<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h2>数据仪表盘</h2>
      <div class="date-range">
        <select v-model="timeRange" @change="updateDashboard">
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="quarter">本季度</option>
          <option value="year">本年</option>
        </select>
      </div>
    </div>

    <!-- 关键指标卡片 -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon revenue">💰</div>
        <div class="metric-content">
          <h3>总收入</h3>
          <div class="metric-value">¥{{ formatNumber(totalRevenue) }}</div>
          <div class="metric-change positive">
            <span>↑</span> {{ revenueChange }}% 较上期
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon students">👥</div>
        <div class="metric-content">
          <h3>在读学员</h3>
          <div class="metric-value">{{ activeStudents }}</div>
          <div class="metric-change positive">
            <span>↑</span> {{ studentChange }}% 较上期
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon grades">📊</div>
        <div class="metric-content">
          <h3>平均成绩</h3>
          <div class="metric-value">{{ averageGrade }}</div>
          <div class="metric-change positive">
            <span>↑</span> {{ gradeChange }}% 较上期
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon courses">📚</div>
        <div class="metric-content">
          <h3>开课数量</h3>
          <div class="metric-value">{{ activeCourses }}</div>
          <div class="metric-change neutral">
            <span>→</span> {{ courseChange }}% 较上期
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <!-- 收入趋势 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>收入趋势</h3>
          <div class="chart-actions">
            <button class="chart-btn" @click="exportChart('revenue')">📥 导出</button>
          </div>
        </div>
        <div class="chart-container">
          <div class="line-chart">
            <div class="chart-y-axis">
              <span v-for="value in revenueYAxis" :key="value">{{ value }}</span>
            </div>
            <div class="chart-content">
              <div class="chart-line">
                <div v-for="(point, index) in revenueData" :key="index" 
                     class="chart-point"
                     :style="{ 
                       left: (index / (revenueData.length - 1)) * 100 + '%',
                       bottom: (point.value / maxRevenue) * 100 + '%'
                     }">
                  <div class="point-tooltip">
                    {{ point.label }}: ¥{{ point.value }}
                  </div>
                </div>
                <svg class="line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline :points="revenueLinePoints" fill="none" stroke="#4caf50" stroke-width="2"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 学员增长 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>学员增长</h3>
          <div class="chart-actions">
            <button class="chart-btn" @click="exportChart('students')">📥 导出</button>
          </div>
        </div>
        <div class="chart-container">
          <div class="bar-chart">
            <div class="chart-y-axis">
              <span v-for="value in studentYAxis" :key="value">{{ value }}</span>
            </div>
            <div class="chart-content">
              <div v-for="(bar, index) in studentData" :key="index" class="bar-group">
                <div class="bar" 
                     :style="{ 
                       height: (bar.value / maxStudents) * 100 + '%',
                       backgroundColor: getBarColor(index)
                     }">
                  <div class="bar-tooltip">{{ bar.label }}: {{ bar.value }}人</div>
                </div>
                <div class="bar-label">{{ bar.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 成绩分布 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>成绩分布</h3>
          <div class="chart-actions">
            <button class="chart-btn" @click="exportChart('grades')">📥 导出</button>
          </div>
        </div>
        <div class="chart-container">
          <div class="pie-chart-container">
            <div class="pie-chart">
              <div v-for="(segment, index) in gradeDistribution" :key="index"
                   class="pie-segment"
                   :style="{ 
                     '--percentage': segment.percentage + '%',
                     '--rotation': (segment.startAngle) + 'deg',
                     '--color': segment.color
                   }">
              </div>
            </div>
            <div class="pie-legend">
              <div v-for="(segment, index) in gradeDistribution" :key="index" class="legend-item">
                <div class="legend-color" :style="{ backgroundColor: segment.color }"></div>
                <div class="legend-text">
                  <span class="legend-label">{{ segment.label }}</span>
                  <span class="legend-value">{{ segment.percentage }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 课程统计 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>课程统计</h3>
          <div class="chart-actions">
            <button class="chart-btn" @click="exportChart('courses')">📥 导出</button>
          </div>
        </div>
        <div class="chart-container">
          <div class="course-stats">
            <div v-for="course in courseStats" :key="course.name" class="course-item">
              <div class="course-info">
                <div class="course-name">{{ course.name }}</div>
                <div class="course-details">
                  <span>{{ course.students }}学员</span>
                  <span>•</span>
                  <span>¥{{ course.revenue }}</span>
                </div>
              </div>
              <div class="course-progress">
                <div class="progress-bar">
                  <div class="progress-fill" 
                       :style="{ 
                         width: course.completionRate + '%',
                         backgroundColor: getProgressColor(course.completionRate)
                       }">
                  </div>
                </div>
                <div class="progress-text">{{ course.completionRate }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近活动 -->
    <div class="recent-activity">
      <div class="activity-header">
        <h3>最近活动</h3>
        <button class="view-all-btn">查看全部</button>
      </div>
      <div class="activity-list">
        <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
          <div class="activity-icon" :class="activity.type">
            {{ getActivityIcon(activity.type) }}
          </div>
          <div class="activity-content">
            <div class="activity-title">{{ activity.title }}</div>
            <div class="activity-description">{{ activity.description }}</div>
            <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ApiService } from '../api/ApiService'

export default {
  name: 'Dashboard',
  setup() {
    const timeRange = ref('month')
    const loading = ref(false)
    
    // 真实数据
    const dashboardData = ref({
      totalRevenue: 0,
      revenueChange: 0,
      activeStudents: 0,
      studentChange: 0,
      averageGrade: 0,
      gradeChange: 0,
      activeCourses: 0,
      courseChange: 0
    })

    const revenueData = ref([])
    const studentData = ref([])
    const gradeDistribution = ref([])
    const courseStats = ref([])
    const recentActivities = ref([])

    // 计算属性
    const totalRevenue = computed(() => dashboardData.value.totalRevenue)
    const revenueChange = computed(() => dashboardData.value.revenueChange)
    const activeStudents = computed(() => dashboardData.value.activeStudents)
    const studentChange = computed(() => dashboardData.value.studentChange)
    const averageGrade = computed(() => dashboardData.value.averageGrade)
    const gradeChange = computed(() => dashboardData.value.gradeChange)
    const activeCourses = computed(() => dashboardData.value.activeCourses)
    const courseChange = computed(() => dashboardData.value.courseChange)

    const maxRevenue = computed(() => Math.max(...revenueData.value.map(d => d.value)))
    const maxStudents = computed(() => Math.max(...studentData.value.map(d => d.value)))

    const revenueYAxis = computed(() => {
      const max = maxRevenue.value
      return [max, max * 0.75, max * 0.5, max * 0.25, 0].map(v => `¥${(v / 1000).toFixed(0)}k`)
    })

    const studentYAxis = computed(() => {
      const max = maxStudents.value
      return [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0]
    })

    const revenueLinePoints = computed(() => {
      return revenueData.value.map((point, index) => {
        const x = (index / (revenueData.value.length - 1)) * 100
        const y = 100 - (point.value / maxRevenue.value) * 100
        return `${x},${y}`
      }).join(' ')
    })

    // 方法
    const formatNumber = (num) => {
      return num.toLocaleString()
    }

    const getBarColor = (index) => {
      const colors = ['#4caf50', '#8bc34a', '#ffc107', '#ff9800', '#f44336']
      return colors[index % colors.length]
    }

    const getProgressColor = (rate) => {
      if (rate >= 90) return '#4caf50'
      if (rate >= 80) return '#8bc34a'
      if (rate >= 70) return '#ffc107'
      if (rate >= 60) return '#ff9800'
      return '#f44336'
    }

    const getActivityIcon = (type) => {
      const icons = {
        student: '👤',
        grade: '📝',
        revenue: '💰',
        course: '📚'
      }
      return icons[type] || '📌'
    }

    const formatTime = (timestamp) => {
      const now = new Date()
      const diff = now - timestamp
      const minutes = Math.floor(diff / (1000 * 60))
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      return `${days}天前`
    }

    // 加载仪表盘数据
    const loadDashboardData = async () => {
      loading.value = true
      try {
        const stats = await ApiService.getDashboardStats()
        
        // 更新仪表盘数据
        dashboardData.value = {
          totalRevenue: stats.totalRevenue || 0,
          revenueChange: stats.revenueChange || 0,
          activeStudents: stats.activeStudents || 0,
          studentChange: stats.studentChange || 0,
          averageGrade: stats.averageGrade || 0,
          gradeChange: stats.gradeChange || 0,
          activeCourses: stats.activeCourses || 0,
          courseChange: stats.courseChange || 0
        }

        // 更新收入趋势数据
        revenueData.value = stats.revenueTrend || [
          { label: '1月', value: 0 },
          { label: '2月', value: 0 },
          { label: '3月', value: 0 },
          { label: '4月', value: 0 },
          { label: '5月', value: 0 },
          { label: '6月', value: 0 }
        ]

        // 更新学员增长数据
        studentData.value = stats.studentGrowth || [
          { label: '1月', value: 0 },
          { label: '2月', value: 0 },
          { label: '3月', value: 0 },
          { label: '4月', value: 0 },
          { label: '5月', value: 0 },
          { label: '6月', value: 0 }
        ]

        // 更新成绩分布数据
        gradeDistribution.value = stats.gradeDistribution || [
          { label: '优秀 (90-100)', percentage: 0, color: '#4caf50', startAngle: 0 },
          { label: '良好 (80-89)', percentage: 0, color: '#8bc34a', startAngle: 0 },
          { label: '中等 (70-79)', percentage: 0, color: '#ffc107', startAngle: 0 },
          { label: '及格 (60-69)', percentage: 0, color: '#ff9800', startAngle: 0 },
          { label: '不及格 (0-59)', percentage: 0, color: '#f44336', startAngle: 0 }
        ]

        // 更新课程统计数据
        courseStats.value = stats.courseStats || []

        // 更新最近活动
        recentActivities.value = stats.recentActivities || []

      } catch (error) {
        console.error('加载仪表盘数据失败:', error)
        alert('加载仪表盘数据失败')
      } finally {
        loading.value = false
      }
    }

    const updateDashboard = () => {
      loadDashboardData()
    }

    const exportChart = (type) => {
      console.log('导出图表:', type)
      // 这里可以实现导出功能
      alert(`${type}图表导出功能开发中...`)
    }

    onMounted(() => {
      loadDashboardData()
    })

    return {
      timeRange,
      loading,
      totalRevenue,
      revenueChange,
      activeStudents,
      studentChange,
      averageGrade,
      gradeChange,
      activeCourses,
      courseChange,
      revenueData,
      studentData,
      gradeDistribution,
      courseStats,
      recentActivities,
      maxRevenue,
      maxStudents,
      revenueYAxis,
      studentYAxis,
      revenueLinePoints,
      formatNumber,
      getBarColor,
      getProgressColor,
      getActivityIcon,
      formatTime,
      updateDashboard,
      exportChart
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

.date-range select {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
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

.metric-change {
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.metric-change.positive {
  color: #4caf50;
}

.metric-change.negative {
  color: #f44336;
}

.metric-change.neutral {
  color: var(--text-secondary);
}

/* 图表网格 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.chart-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.chart-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.chart-actions {
  display: flex;
  gap: 0.5rem;
}

.chart-btn {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.chart-btn:hover {
  background-color: var(--bg-tertiary);
}

.chart-container {
  padding: 1.5rem;
  height: 300px;
}

/* 折线图 */
.line-chart {
  display: flex;
  height: 100%;
}

.chart-y-axis {
  width: 60px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-secondary);
  padding-right: 1rem;
}

.chart-content {
  flex: 1;
  position: relative;
}

.chart-line {
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #4caf50;
  border-radius: 50%;
  transform: translate(-50%, 50%);
  cursor: pointer;
}

.chart-point:hover .point-tooltip {
  opacity: 1;
}

.point-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}

.line-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 柱状图 */
.bar-chart {
  display: flex;
  height: 100%;
}

.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.bar {
  width: 40px;
  background-color: #4caf50;
  border-radius: 4px 4px 0 0;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.bar:hover {
  opacity: 0.8;
}

.bar:hover .bar-tooltip {
  opacity: 1;
}

.bar-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.5rem;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}

.bar-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* 饼图 */
.pie-chart-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.pie-chart {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: conic-gradient(
    #4caf50 0deg 126deg,
    #8bc34a 126deg 226.8deg,
    #ffc107 226.8deg 306deg,
    #ff9800 306deg 342deg,
    #f44336 342deg 360deg
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
  gap: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.legend-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 120px;
}

.legend-label {
  color: var(--text-primary);
  font-size: 0.875rem;
}

.legend-value {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
}

/* 课程统计 */
.course-stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.course-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
}

.course-info {
  flex: 1;
}

.course-name {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.course-details {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.course-details span {
  margin-right: 0.5rem;
}

.course-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 150px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background-color: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 40px;
}

/* 最近活动 */
.recent-activity {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.activity-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.view-all-btn {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.view-all-btn:hover {
  background-color: var(--bg-tertiary);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  transition: all 0.3s ease;
}

.activity-item:hover {
  background-color: var(--bg-primary);
}

.activity-icon {
  font-size: 1.5rem;
  opacity: 0.8;
}

.activity-icon.student { color: #2196f3; }
.activity-icon.grade { color: #ff9800; }
.activity-icon.revenue { color: #4caf50; }
.activity-icon.course { color: #9c27b0; }

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.activity-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.activity-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .chart-container {
    height: 250px;
  }
  
  .pie-chart-container {
    flex-direction: column;
    gap: 2rem;
  }
  
  .course-item {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .course-progress {
    min-width: auto;
  }
}
</style>
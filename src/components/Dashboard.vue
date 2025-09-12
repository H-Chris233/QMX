<template>
  <div class="student-management">
    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-progress"></div>

    <!-- 页面标题 -->
    <div class="section-header">
      <h2>总仪表板</h2>
      <div class="header-actions">
        <span v-if="lastUpdateTime" class="last-update">
          最后更新: {{ formatTime(lastUpdateTime) }}
        </span>
        <button
          class="refresh-btn"
          @click="loadDashboardData"
          :disabled="loading"
          :class="{ 'loading': loading }"
          aria-label="刷新仪表板数据"
        >
          <span class="refresh-icon" :class="{ 'spinning': loading }">🔄</span>
          {{ loading ? '加载中...' : '刷新数据' }}
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-grid" :class="{ 'loading-state': loading }">
      <!-- 总收入 -->
      <div class="stat-card" :class="{ 'skeleton': loading }">
        <div class="card-header">
          <h3>总收入</h3>
          <span class="card-icon">💰</span>
        </div>
        <div class="stat-value" v-if="!loading">
          {{ formatCurrency(dashboardData.totalRevenue) }}
        </div>
        <div class="skeleton-text" v-else></div>
        <div class="stat-trend" v-if="!loading && dashboardData.totalRevenue > 0">
          <span class="trend-positive">📈 良好</span>
        </div>
      </div>

      <!-- 学员总数 -->
      <div class="stat-card" :class="{ 'skeleton': loading }">
        <div class="card-header">
          <h3>学员总数</h3>
          <span class="card-icon">👥</span>
        </div>
        <div class="stat-value" v-if="!loading">
          {{ formatNumber(dashboardData.activeStudents) }}
        </div>
        <div class="skeleton-text" v-else></div>
        <div class="stat-trend" v-if="!loading && dashboardData.activeStudents > 0">
          <span class="trend-info">📊 活跃</span>
        </div>
      </div>

      <!-- 平均成绩 -->
      <div class="stat-card" :class="{ 'skeleton': loading }">
        <div class="card-header">
          <h3>平均成绩</h3>
          <span class="card-icon">🎯</span>
        </div>
        <div class="stat-value" v-if="!loading">
          {{ formatDecimal(dashboardData.averageGrade) }}
        </div>
        <div class="skeleton-text" v-else></div>
        <div class="stat-trend" v-if="!loading && dashboardData.averageGrade > 0">
          <span :class="getGradeTrendClass(dashboardData.averageGrade)">
            {{ getGradeTrendText(dashboardData.averageGrade) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, inject } from 'vue';
import { ApiService } from '../api/ApiService';

export default {
  name: 'Dashboard',
  setup() {
    const loading = ref(false);
    const abortController = ref(null);
    const lastUpdateTime = ref(null);
    const errorHandler = inject('errorHandler');
    
    const showError = errorHandler?.showError || ((title, message, details) => {
      console.error(`${title}: ${message}`, details);
      alert(`${title}\n${message}`);
    });
    
    if (!errorHandler) {
      console.warn('⚠️ errorHandler 未正确注入到 Dashboard 组件');
    }

    // 仪表盘数据（使用reactive保持响应性）
    const dashboardData = reactive({
      totalRevenue: 0,
      activeStudents: 0,
      averageGrade: 0,
    });

    // 增强的数据验证函数
    const validateDashboardStats = (stats) => {
      if (!stats || typeof stats !== 'object') {
        throw new Error('统计数据格式无效');
      }
      
      const requiredFields = ['total_revenue', 'total_students', 'average_score'];
      const missingFields = requiredFields.filter(field => 
        stats[field] === undefined || stats[field] === null
      );
      
      if (missingFields.length > 0) {
        console.warn('缺少统计字段:', missingFields);
        // 为缺失字段设置默认值
        missingFields.forEach(field => {
          stats[field] = 0;
        });
      }
      
      // 数值范围验证
      if (stats.total_revenue && (stats.total_revenue < 0 || stats.total_revenue > 999999999999)) {
        console.warn('总收入数值异常，已重置为0');
        stats.total_revenue = 0;
      }
      
      if (stats.total_students && (stats.total_students < 0 || stats.total_students > 100000)) {
        console.warn('学员数量异常，已重置为0');
        stats.total_students = 0;
      }
      
      if (stats.average_score && (stats.average_score < 0 || stats.average_score > 1000)) {
        console.warn('平均成绩异常，已重置为0');
        stats.average_score = 0;
      }
      
      return true;
    };

    // 增强的安全数值转换函数
    const safeParseNumber = (value, defaultValue = 0, options = {}) => {
      const { min = -Infinity, max = Infinity, decimals } = options;
      
      if (value === null || value === undefined || value === '') {
        return defaultValue;
      }
      
      let parsed = Number(value);
      
      // 检查是否为有效数字
      if (isNaN(parsed) || !isFinite(parsed)) {
        console.warn('无效数值，使用默认值:', value, '->', defaultValue);
        return defaultValue;
      }
      
      // 范围限制
      parsed = Math.max(min, Math.min(max, parsed));
      
      // 小数位限制
      if (typeof decimals === 'number') {
        parsed = Number(parsed.toFixed(decimals));
      }
      
      return parsed;
    };

    // 数据获取
    const loadDashboardData = async () => {
      if (loading.value) {
        console.warn('数据正在加载中，跳过重复请求');
        return;
      }

      loading.value = true;
      abortController.value = new AbortController();

      try {
        const stats = await ApiService.getDashboardStats();
        
        // 验证数据
        validateDashboardStats(stats);

        // 安全更新仪表板数据 - 增强验证
        dashboardData.totalRevenue = safeParseNumber(stats.total_revenue, 0, {
          min: 0,
          max: 999999999999,
          decimals: 2
        });
        
        dashboardData.activeStudents = safeParseNumber(stats.total_students, 0, {
          min: 0,
          max: 100000,
          decimals: 0
        });
        
        dashboardData.averageGrade = safeParseNumber(stats.average_score, 0, {
          min: 0,
          max: 1000,
          decimals: 1
        });

        // 更新最后刷新时间
        lastUpdateTime.value = new Date();
        console.log('仪表板数据加载成功:', dashboardData);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('加载仪表盘数据失败:', error);
          
          // 重置为默认值
          Object.assign(dashboardData, {
            totalRevenue: 0,
            activeStudents: 0,
            averageGrade: 0,
          });
          
          showError(
            '数据加载失败',
            '无法获取仪表板数据，请检查网络连接或稍后重试',
            error.message || '未知错误',
          );
        }
      } finally {
        loading.value = false;
        abortController.value = null;
      }
    };

    // 增强的格式化方法
    const formatNumber = (value) => {
      try {
        const num = safeParseNumber(value, 0, { min: 0, max: 999999999 });
        
        // 大数值使用简化显示
        if (num >= 10000) {
          return (num / 10000).toFixed(1) + '万';
        }
        
        return new Intl.NumberFormat('zh-CN').format(num);
      } catch (error) {
        console.warn('数字格式化失败:', value, error);
        return '0';
      }
    };

    const formatCurrency = (value) => {
      try {
        const num = safeParseNumber(value, 0, { min: 0, max: 999999999999, decimals: 2 });
        
        // 大金额使用简化显示
        if (num >= 10000) {
          const wan = num / 10000;
          if (wan >= 10000) {
            return `¥${(wan / 10000).toFixed(1)}亿`;
          }
          return `¥${wan.toFixed(1)}万`;
        }
        
        return new Intl.NumberFormat('zh-CN', {
          style: 'currency',
          currency: 'CNY',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(num);
      } catch (error) {
        console.warn('货币格式化失败:', value, error);
        return '¥0';
      }
    };

    const formatDecimal = (value) => {
      try {
        const num = safeParseNumber(value, 0, { min: 0, max: 1000, decimals: 1 });
        return num.toFixed(1);
      } catch (error) {
        console.warn('小数格式化失败:', value, error);
        return '0.0';
      }
    };

    // 时间格式化
    const formatTime = (date) => {
      try {
        return new Intl.DateTimeFormat('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(date);
      } catch (error) {
        return '--:--:--';
      }
    };

    // 成绩趋势分析
    const getGradeTrendClass = (grade) => {
      if (grade >= 8) return 'trend-excellent';
      if (grade >= 6) return 'trend-good';
      if (grade >= 4) return 'trend-average';
      return 'trend-poor';
    };

    const getGradeTrendText = (grade) => {
      if (grade >= 8) return '🌟 优秀';
      if (grade >= 6) return '👍 良好';
      if (grade >= 4) return '📊 一般';
      return '📉 待提升';
    };

    // 生命周期钩子
    onMounted(() => {
      loadDashboardData();
    });

    onUnmounted(() => {
      if (abortController.value) {
        abortController.value.abort();
      }
    });

    return {
      loading,
      lastUpdateTime,
      dashboardData,
      loadDashboardData,
      formatNumber,
      formatCurrency,
      formatDecimal,
      formatTime,
      getGradeTrendClass,
      getGradeTrendText,
      safeParseNumber,
    };
  },
};
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
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.last-update {
  font-size: 0.875rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

.refresh-btn {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #1976d2;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-icon {
  display: inline-block;
  transition: transform 0.3s ease;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px var(--shadow-color);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px var(--shadow-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.card-icon {
  font-size: 1.5rem;
  opacity: 0.7;
}

.stat-value {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.stat-trend {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.trend-excellent { color: #4caf50; }
.trend-good { color: #2196f3; }
.trend-average { color: #ff9800; }
.trend-poor { color: #f44336; }
.trend-positive { color: #4caf50; }
.trend-info { color: #2196f3; }

/* 骨架屏效果 */
.stat-card.skeleton {
  pointer-events: none;
}

.skeleton-text {
  height: 2.25rem;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.stats-grid.loading-state .stat-card {
  opacity: 0.7;
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

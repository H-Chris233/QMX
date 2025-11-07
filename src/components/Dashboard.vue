<template>
  <div class="dashboard">
    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-progress"></div>

    <!-- 页面标题 -->
    <div class="section-header">
      <h2>仪表盘</h2>
      <div class="header-actions">
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
    <div class="stats-grid" :class="{ 'loading-state': loading }" data-testid="stats-grid">
      <!-- 总收入 -->
      <div class="stat-card" :class="{ 'skeleton': loading }" data-testid="revenue-card">
        <div class="card-header">
          <h3>总收入</h3>
          <span class="card-icon">💰</span>
        </div>
        <div class="stat-value" v-if="!loading" data-testid="total-revenue">
          {{ formatCurrency(dashboardData.totalRevenue) }}
        </div>
        <div class="skeleton-text" v-else></div>
        <div class="stat-trend" v-if="!loading && dashboardData.totalRevenue > 0">
          <span class="trend-positive">📈 良好</span>
        </div>
      </div>

      <!-- 学员总数 -->
      <div class="stat-card" :class="{ 'skeleton': loading }" data-testid="students-card">
        <div class="card-header">
          <h3>学员总数</h3>
          <span class="card-icon">👥</span>
        </div>
        <div class="stat-value" v-if="!loading" data-testid="active-students">
          {{ formatNumber(dashboardData.activeStudents) }}
        </div>
        <div class="skeleton-text" v-else></div>
        <div class="stat-trend" v-if="!loading && dashboardData.activeStudents > 0">
          <span class="trend-info">📊 活跃</span>
        </div>
      </div>

      <!-- 平均成绩 -->
      <div class="stat-card" :class="{ 'skeleton': loading }" data-testid="grades-card">
        <div class="card-header">
          <h3>平均成绩</h3>
          <span class="card-icon">🎯</span>
        </div>
        <div class="stat-value" v-if="!loading" data-testid="average-grade">
          {{ formatDecimal(dashboardData.averageGrade) }}
        </div>
        <div class="skeleton-text" v-else></div>
        <div class="stat-trend" v-if="!loading && dashboardData.averageGrade > 0">
          <span :class="getGradeTrendClass(dashboardData.averageGrade)">
            {{ getGradeTrendText(dashboardData.averageGrade) }}
          </span>
        </div>
      </div>

      <!-- 会员提醒 -->
      <div class="stat-card membership-alerts-card" :class="{ 'skeleton': loading }">
        <div class="card-header">
          <h3>会员提醒</h3>
          <span class="card-icon">⚠️</span>
        </div>
        <div v-if="!loading" class="membership-content">
          <div v-if="expiringMemberships.length > 0" class="expiring-list">
            <div class="stat-value expiring-count">
              {{ expiringMemberships.length }}
            </div>
            <div class="expiring-text">个会员即将过期</div>
            <div class="expiring-members">
              <div 
                v-for="student in expiringMemberships.slice(0, 3)" 
                :key="student.uid"
                class="member-item"
              >
                <span class="member-name">{{ student.name }}</span>
                <span class="member-days">{{ student.membership_days_remaining }}天</span>
              </div>
              <div v-if="expiringMemberships.length > 3" class="more-members">
                还有 {{ expiringMemberships.length - 3 }} 个...
              </div>
            </div>
          </div>
          <div v-else class="no-expiring">
            <div class="stat-value no-alerts">✅</div>
            <div class="no-alerts-text">暂无即将过期的会员</div>
          </div>
        </div>
        <div class="skeleton-text" v-else></div>
      </div>
    </div>
    <ErrorModal
      :show="showStatsErrorModal"
      :title="statsErrorTitle"
      :message="statsErrorMessage"
      :details="statsErrorDetails"
      :showRetry="true"
      @close="closeStatsError"
      @retry="retryLoadStats"
    />
    <ErrorModal
      :show="showMembershipErrorModal"
      :title="membershipErrorTitle"
      :message="membershipErrorMessage"
      :details="membershipErrorDetails"
      :showRetry="true"
      @close="closeMembershipError"
      @retry="retryLoadMembership"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, inject, watch, type Ref } from 'vue';
import { ApiService } from '../api/ApiService';
import { transformDashboardData, safeParseNumber } from '../utils/dataTransformers';
import ErrorModal from './ErrorModal.vue';

// 定义类型接口
interface DashboardData {
  totalRevenue: number;
  activeStudents: number;
  averageGrade: number;
}

interface Student {
  uid: number;
  name: string;
  membership_days_remaining: number | null;
  is_membership_active: boolean;
  membership_start_date?: string;
  membership_end_date?: string;
}


interface RefreshSystem {
  refreshTriggers: {
    dashboard: number;
  };
}
const loading: Ref<boolean> = ref(false);
const abortController: Ref<AbortController | null> = ref(null);
const lastUpdateTime: Ref<Date | null> = ref(null);
const refreshSystem = inject<RefreshSystem>('refreshSystem');

const showStatsErrorModal: Ref<boolean> = ref(false);
const statsErrorTitle: Ref<string> = ref('错误');
const statsErrorMessage: Ref<string> = ref('');
const statsErrorDetails: Ref<string> = ref('');

const showMembershipErrorModal: Ref<boolean> = ref(false);
const membershipErrorTitle: Ref<string> = ref('错误');
const membershipErrorMessage: Ref<string> = ref('');
const membershipErrorDetails: Ref<string> = ref('');

const showStatsError = (title: string, message: string, details?: string): void => {
  statsErrorTitle.value = title;
  statsErrorMessage.value = message;
  statsErrorDetails.value = details || '';
  showStatsErrorModal.value = true;
  if (import.meta.env?.MODE !== 'production') console.error(`${title}: ${message}`, details);
};

const showMembershipError = (title: string, message: string, details?: string): void => {
  membershipErrorTitle.value = title;
  membershipErrorMessage.value = message;
  membershipErrorDetails.value = details || '';
  showMembershipErrorModal.value = true;
  if (import.meta.env?.MODE !== 'production') console.error(`${title}: ${message}`, details);
};

// 仪表盘数据（使用reactive保持响应性）
const dashboardData: DashboardData = reactive({
  totalRevenue: 0,
  activeStudents: 0,
  averageGrade: 0,
});

// 会员提醒数据
const expiringMemberships: Ref<Student[]> = ref([]);



// 加载即将过期的会员 - 简化版，错误处理在调用方
const loadExpiringMemberships = async (): Promise<Student[]> => {
      // 使用新的v2 API方法，直接返回结果，不做错误处理
      const expiring = await ApiService.getMembershipExpiringSoon(7);
      
      if (!Array.isArray(expiring)) {
        throw new Error('返回的数据格式不正确，期望数组格式');
      }

      const validExpiring = expiring.filter(student => 
        student && student.uid && student.name
      ) as Student[];

      if (import.meta.env?.MODE !== 'production') console.log('找到 ' + validExpiring.length + ' 个即将过期的会员');
      return validExpiring;
    };

// 数据获取 - 使用新的v2 API方法
const loadDashboardData = async (): Promise<void> => {
      if (loading.value) {
        if (import.meta.env?.MODE !== 'production') console.warn('数据正在加载中，跳过重复请求');
        return;
      }

      loading.value = true;
      abortController.value = new AbortController();

      try {
        // 分别处理两个API调用，让每个API调用都能独立失败并显示错误
        if (import.meta.env?.MODE !== 'production') console.log('🔄 开始并行调用两个API...');
        
        // 统计数据API调用 - 不做内部错误处理，让错误抛出到组件层
        const statsPromise = ApiService.getDashboardStats()
          .then(result => {
            if (import.meta.env?.MODE !== 'production') console.log('✅ getDashboardStats 调用成功:', result);
            return { success: true, data: result };
          })
          .catch(error => {
            if (import.meta.env?.MODE !== 'production') console.error('❌ getDashboardStats 调用失败:', error);
            if (import.meta.env?.MODE !== 'production') console.error('getDashboardStats 错误详情:', error.message, error.stack);
            // 确保错误被正确传递，包括错误消息
            const errorObj = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: errorObj };
          });

        // 会员数据API调用 - 不做内部错误处理，让错误抛出到组件层  
        const membershipPromise = loadExpiringMemberships()
          .then(result => {
            if (import.meta.env?.MODE !== 'production') console.log('✅ loadExpiringMemberships 调用成功:', result);
            expiringMemberships.value = result;
            return { success: true, data: result };
          })
          .catch(error => {
            if (import.meta.env?.MODE !== 'production') console.error('❌ loadExpiringMemberships 调用失败:', error);
            if (import.meta.env?.MODE !== 'production') console.error('loadExpiringMemberships 错误详情:', error.message, error.stack);
            expiringMemberships.value = [];
            // 确保错误被正确传递，包括错误消息
            const errorObj = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: errorObj };
          });

        // 等待两个API调用完成
        const [statsResult, membershipResult] = await Promise.all([statsPromise, membershipPromise]);
        
        if (import.meta.env?.MODE !== 'production') console.log('statsResult:', statsResult);
        if (import.meta.env?.MODE !== 'production') console.log('membershipResult:', membershipResult);
        
        // 处理统计数据结果
        let stats;
        if (statsResult.success && 'data' in statsResult) {
          stats = statsResult.data;
        } else {
          // 统计数据API失败，显示错误并使用默认值
          showStatsError(
            '统计数据加载失败',
            '无法获取仪表板统计数据，请检查网络连接或稍后重试',
            ('error' in statsResult ? (statsResult.error as Error).message : '未知错误')
          );
          stats = {
            total_revenue: 0,
            total_students: 0,
            average_score: 0,
            total_expense: 0,
            net_income: 0,
            max_score: 0,
            active_courses: 0
          };
        }
        
        // 处理会员数据结果
        if (!membershipResult.success) {
          showMembershipError(
            '会员数据加载失败',
            '无法获取即将过期的会员信息，请稍后刷新页面重试',
            ('error' in membershipResult ? (membershipResult.error as Error).message : '未知错误')
          );
        }
        
        if (import.meta.env?.MODE !== 'production') console.log('获取到的仪表板统计数据:', stats);

        // 使用新的转换函数更新仪表板数据
        const transformedData = transformDashboardData(stats);
        Object.assign(dashboardData, transformedData);

        // 更新最后刷新时间
        lastUpdateTime.value = new Date();
        if (import.meta.env?.MODE !== 'production') console.log('仪表板数据加载成功:', dashboardData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          if (import.meta.env?.MODE !== 'production') console.error('加载仪表盘数据时发生未预期错误:', error);
          
          // 重置为默认值
          Object.assign(dashboardData, {
            totalRevenue: 0,
            activeStudents: 0,
            averageGrade: 0,
          });
          
          // 这里只处理Promise.all本身的错误，具体API错误已在上面处理
          showStatsError(
            '系统错误',
            '数据加载过程中发生未预期错误，请刷新页面重试',
            (error as Error).message || '未知错误'
          );
        }
      } finally {
        loading.value = false;
        abortController.value = null;
      }
    };

// 增强的格式化方法
const formatNumber = (value: number | string): string => {
      try {
        const num = safeParseNumber(value, 0, { min: 0, max: 999999999 });
        
        // 大数值使用简化显示
        if (num >= 10000) {
          return (num / 10000).toFixed(1) + '万';
        }
        
        return new Intl.NumberFormat('zh-CN').format(num);
      } catch (error) {
        if (import.meta.env?.MODE !== 'production') console.warn('数字格式化失败:', value, error);
        return '0';
      }
    };

const formatCurrency = (value: number | string): string => {
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
        if (import.meta.env?.MODE !== 'production') console.warn('货币格式化失败:', value, error);
        return '¥0';
      }
    };

const formatDecimal = (value: number | string): string => {
      try {
        const num = safeParseNumber(value, 0, { min: 0, max: 1000, decimals: 1 });
        return num.toFixed(1);
      } catch (error) {
        if (import.meta.env?.MODE !== 'production') console.warn('小数格式化失败:', value, error);
        return '0.0';
      }
    };



// 成绩趋势分析
const getGradeTrendClass = (grade: number): string => {
      if (grade >= 8) return 'trend-excellent';
      if (grade >= 6) return 'trend-good';
      if (grade >= 4) return 'trend-average';
      return 'trend-poor';
    };

const getGradeTrendText = (grade: number): string => {
      if (grade >= 8) return '🌟 优秀';
      if (grade >= 6) return '👍 良好';
      if (grade >= 4) return '📊 一般';
      return '📉 待提升';
    };

    // 生命周期钩子
    // 监听刷新触发器
    if (refreshSystem?.refreshTriggers) {
      watch(
        () => refreshSystem.refreshTriggers.dashboard,
        (newValue, oldValue) => {
          if (newValue > oldValue) {
            if (import.meta.env?.MODE !== 'production') console.log('Dashboard 收到刷新信号，重新加载数据');
            loadDashboardData();
          }
        }
      );
    }

    onMounted(() => {
      loadDashboardData();
    });

const closeStatsError = (): void => {
  showStatsErrorModal.value = false;
};

const closeMembershipError = (): void => {
  showMembershipErrorModal.value = false;
};

const retryLoadStats = async (): Promise<void> => {
      showStatsErrorModal.value = false;
      loading.value = true;
      try {
        const statsResult = await ApiService.getDashboardStats();
        dashboardData.totalRevenue = safeParseNumber(statsResult.total_revenue, 0, { min: 0, max: 999999999999, decimals: 2 });
        dashboardData.activeStudents = safeParseNumber(statsResult.total_students, 0, { min: 0, max: 100000, decimals: 0 });
        dashboardData.averageGrade = safeParseNumber(statsResult.average_score, 0, { min: 0, max: 1000, decimals: 1 });
        lastUpdateTime.value = new Date();
      } catch (e) {
        showStatsError('统计数据加载失败', '无法获取仪表板统计数据，请检查网络连接或稍后重试', (e as Error).message || '未知错误');
      } finally {
        loading.value = false;
      }
    };

const retryLoadMembership = async (): Promise<void> => {
      showMembershipErrorModal.value = false;
      try {
        const result = await loadExpiringMemberships();
        expiringMemberships.value = result;
      } catch (e) {
        showMembershipError('会员数据加载失败', '无法获取即将过期的会员信息，请稍后刷新页面重试', (e as Error).message || '未知错误');
      }
    };

    onUnmounted(() => {
      if (abortController.value) {
        abortController.value.abort();
      }
    });


</script>

<style scoped>
.dashboard {
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

/* 会员提醒卡片样式 */
.membership-alerts-card {
  grid-column: span 2; /* 占据两列宽度 */
}

.membership-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expiring-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expiring-count {
  color: #ff9800;
  font-size: 2rem;
  margin-bottom: 0;
}

.expiring-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.expiring-members {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  font-size: 0.875rem;
}

.member-name {
  color: var(--text-primary);
  font-weight: 500;
}

.member-days {
  color: #ff9800;
  font-weight: 600;
}

.more-members {
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-align: center;
  padding: 0.25rem;
  font-style: italic;
}

.no-expiring {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.no-alerts {
  color: #4caf50;
  font-size: 2rem;
  margin-bottom: 0;
}

.no-alerts-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* 响应式设计优化 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .membership-alerts-card {
    grid-column: span 2; /* 在小屏幕上仍然占据两列 */
  }

  .stat-value {
    font-size: 1.75rem;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .membership-alerts-card {
    grid-column: span 1; /* 在极小屏幕上占据一列 */
  }

  .stat-value {
    font-size: 1.5rem;
  }
}
</style>

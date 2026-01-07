<template>
  <div class="dashboard-container">
    <!-- 顶部标题栏 -->
    <header class="dashboard-header">
      <div class="header-left">
        <h2 class="page-title">仪表盘</h2>
        <p class="last-updated" v-if="lastUpdateTime">
          上次更新: {{ lastUpdateTime.toLocaleTimeString() }}
        </p>
      </div>
      
      <div class="header-actions">
        <button
          class="action-btn"
          @click="loadDashboardData"
          :disabled="loading"
          aria-label="刷新数据"
        >
          <RefreshCw 
            :class="['btn-icon', { 'spinning': loading }]" 
            :size="18" 
          />
          <span>{{ loading ? '同步中...' : '刷新' }}</span>
        </button>
      </div>
    </header>

    <!-- 核心指标网格 -->
    <div class="stats-grid">
      
      <!-- 总收入 -->
      <div class="stat-card" :class="{ 'is-loading': loading }">
        <div class="card-top">
          <span class="card-label">总收入</span>
          <div class="icon-wrapper income">
            <Wallet :size="20" />
          </div>
        </div>
        <div class="card-content">
          <div v-if="!loading" class="stat-value">
            {{ formatCurrency(dashboardData.totalRevenue) }}
          </div>
          <div v-else class="skeleton-line h-8 w-2/3"></div>
          
          <div class="stat-trend positive" v-if="!loading">
            <TrendingUp :size="14" />
            <span>较上月增长 12%</span> <!-- 示例数据，可视情况对接真实环比 -->
          </div>
          <div v-else class="skeleton-line h-4 w-1/2 mt-2"></div>
        </div>
      </div>

      <!-- 学员总数 -->
      <div class="stat-card" :class="{ 'is-loading': loading }">
        <div class="card-top">
          <span class="card-label">活跃学员</span>
          <div class="icon-wrapper students">
            <Users :size="20" />
          </div>
        </div>
        <div class="card-content">
          <div v-if="!loading" class="stat-value">
            {{ formatNumber(dashboardData.activeStudents) }}
          </div>
          <div v-else class="skeleton-line h-8 w-1/2"></div>
          
          <div class="stat-trend neutral" v-if="!loading">
            <Activity :size="14" />
            <span>本周新增 3 人</span>
          </div>
          <div v-else class="skeleton-line h-4 w-1/3 mt-2"></div>
        </div>
      </div>

      <!-- 平均成绩 -->
      <div class="stat-card" :class="{ 'is-loading': loading }">
        <div class="card-top">
          <span class="card-label">平均绩效</span>
          <div class="icon-wrapper score">
            <Award :size="20" />
          </div>
        </div>
        <div class="card-content">
          <div v-if="!loading" class="stat-value">
            {{ formatDecimal(dashboardData.averageGrade) }}
          </div>
          <div v-else class="skeleton-line h-8 w-1/2"></div>
          
          <div class="stat-badge" :class="getGradeTrendClass(dashboardData.averageGrade)" v-if="!loading">
            {{ getGradeTrendText(dashboardData.averageGrade) }}
          </div>
          <div v-else class="skeleton-line h-4 w-1/3 mt-2"></div>
        </div>
      </div>

      <!-- 会员到期提醒 (宽卡片) -->
      <div class="stat-card membership-card" :class="{ 'is-loading': loading }">
        <div class="card-header-row">
          <div class="header-title">
            <Clock :size="18" class="text-warning" />
            <h3>会员到期提醒 (7日内)</h3>
          </div>
          <span class="badge-count" v-if="!loading && expiringMemberships.length > 0">
            {{ expiringMemberships.length }}
          </span>
        </div>

        <div class="card-body-scroll">
          <template v-if="!loading">
            <div v-if="expiringMemberships.length > 0" class="member-list">
              <div
                v-for="student in expiringMemberships"
                :key="student.uid"
                class="member-item"
              >
                <div class="member-info">
                  <div class="member-top-row">
                    <span class="member-name">{{ student.name }}</span>
                    <button
                      v-if="student.phone"
                      class="phone-btn"
                      @click="contactStudent(student)"
                      :title="student.phone"
                    >
                      <Phone :size="12" />
                      {{ student.phone }}
                    </button>
                  </div>
                  <span class="expiry-date">
                    <Calendar :size="12" />
                    剩余 {{ student.membership_days_remaining }} 天
                  </span>
                </div>
                <div class="renew-action">
                  <input
                    type="number"
                    min="1"
                    placeholder="天数"
                    v-model.number="extendDaysMap[student.uid]"
                    :disabled="loading"
                    class="renew-input"
                  />
                  <button
                    class="renew-btn"
                    @click="extendMembership(student)"
                    :disabled="loading || !(Number(extendDaysMap[student.uid] || 0) > 0)"
                  >
                    <CreditCard :size="12" />
                    续费
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="empty-state">
              <CheckCircle2 :size="48" class="empty-icon" />
              <p>近期无即将过期会员</p>
            </div>
          </template>

          <!-- 骨架屏 -->
          <template v-else>
            <div class="member-list">
              <div class="skeleton-line h-10 w-full mb-2" v-for="i in 3" :key="i"></div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 错误弹窗 (保持原有逻辑) -->
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
import { ref, reactive, onMounted, onUnmounted, type Ref } from 'vue';
import { useAppStore } from '../stores/app';
import { ApiService } from '../api/ApiService';
import { transformDashboardData, safeParseNumber } from '../utils/dataTransformers';
import ErrorModal from './ErrorModal.vue';

// 引入图标
import {
  RefreshCw,
  Wallet,
  Users,
  Award,
  TrendingUp,
  Activity,
  Clock,
  Calendar,
  CheckCircle2,
  Phone,
  CreditCard
} from 'lucide-vue-next';

// === 以下保持原有的业务逻辑不变 ===

interface DashboardData {
  totalRevenue: number;
  activeStudents: number;
  averageGrade: number;
}

interface Student {
  uid: number;
  name: string;
  phone?: string;
  membership_days_remaining: number | null;
  is_membership_active: boolean;
  membership_start_date?: string;
  membership_end_date?: string;
}

const loading: Ref<boolean> = ref(false);
const abortController: Ref<AbortController | null> = ref(null);
const lastUpdateTime: Ref<Date | null> = ref(null);

const appStore = useAppStore();
const { showError, showSuccess } = appStore.errorHandler;

// 续费天数映射
const extendDaysMap: Record<number, number> = reactive({});

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
};

const showMembershipError = (title: string, message: string, details?: string): void => {
  membershipErrorTitle.value = title;
  membershipErrorMessage.value = message;
  membershipErrorDetails.value = details || '';
  showMembershipErrorModal.value = true;
};

const dashboardData: DashboardData = reactive({
  totalRevenue: 0,
  activeStudents: 0,
  averageGrade: 0,
});

const expiringMemberships: Ref<Student[]> = ref([]);

const loadExpiringMemberships = async (): Promise<Student[]> => {
  const expiring = await ApiService.getMembershipExpiringSoon(7);
  if (!Array.isArray(expiring)) throw new Error('返回的数据格式不正确');
  return expiring.filter(s => s && s.uid && s.name) as Student[];
};

const loadDashboardData = async (): Promise<void> => {
  if (loading.value) return;
  loading.value = true;
  abortController.value = new AbortController();

  try {
    const statsPromise = ApiService.getDashboardStats()
      .then(result => ({ success: true, data: result }))
      .catch(error => ({ success: false, error }));

    const membershipPromise = loadExpiringMemberships()
      .then(result => {
        expiringMemberships.value = result;
        return { success: true, data: result };
      })
      .catch(error => {
        expiringMemberships.value = [];
        return { success: false, error };
      });

    const [statsResult, membershipResult] = await Promise.all([statsPromise, membershipPromise]);
    
    if (statsResult.success && 'data' in statsResult) {
      Object.assign(dashboardData, transformDashboardData(statsResult.data));
      lastUpdateTime.value = new Date();
    } else {
       showStatsError('加载失败', '无法获取统计数据', String((statsResult as any).error));
    }

    if (!membershipResult.success) {
      showMembershipError('部分数据异常', '会员到期列表加载失败');
    }

  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      showStatsError('系统错误', (error as Error).message);
    }
  } finally {
    loading.value = false;
    abortController.value = null;
  }
};

const formatNumber = (val: any) => {
  try {
    const num = safeParseNumber(val, 0, { min: 0 });
    return num >= 10000 ? (num/10000).toFixed(1) + '万' : num.toLocaleString();
  } catch { return '0'; }
};

const formatCurrency = (val: any) => {
  try {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(safeParseNumber(val, 0));
  } catch { return '¥0'; }
};

const formatDecimal = (val: any) => safeParseNumber(val, 0).toFixed(1);

const getGradeTrendClass = (grade: number) => grade >= 8 ? 'text-success' : grade >= 6 ? 'text-info' : 'text-warning';
const getGradeTrendText = (grade: number) => grade >= 8 ? '优秀' : grade >= 6 ? '良好' : '需关注';

// 简单的重试逻辑
const closeStatsError = () => showStatsErrorModal.value = false;
const closeMembershipError = () => showMembershipErrorModal.value = false;
const retryLoadStats = () => { closeStatsError(); loadDashboardData(); };
const retryLoadMembership = () => { closeMembershipError(); loadDashboardData(); };

// 续费逻辑
const extendMembership = async (student: Student): Promise<void> => {
  if (!student?.uid) return;
  const days = extendDaysMap[student.uid] || 0;
  if (days <= 0) {
    showError('请输入有效天数');
    return;
  }

  loading.value = true;
  try {
    const baseDate = student.is_membership_active && student.membership_end_date
      ? new Date(student.membership_end_date)
      : new Date();

    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    const startDate = student.membership_start_date
      ? student.membership_start_date
      : baseDate.toISOString();

    await ApiService.setStudentMembership(student.uid, {
      startDate: startDate,
      endDate: newEndDate.toISOString()
    });

    showSuccess(`已为 ${student.name} 续费 ${days} 天`);
    extendDaysMap[student.uid] = 0;
    await loadDashboardData(); // 刷新列表
  } catch (error) {
    showError('续费失败', (error as Error).message);
  } finally {
    loading.value = false;
  }
};

// 联系学员
const contactStudent = (student: Student): void => {
  if (!student.phone) {
    showError('无电话号码');
    return;
  }

  try {
    window.location.href = `tel:${student.phone}`;
  } catch {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(student.phone);
      showSuccess('号码已复制');
    }
  }
};

onMounted(loadDashboardData);
onUnmounted(() => abortController.value?.abort());
</script>

<style scoped>
/* 继承 App.vue 的变量，并定义局部变量 */
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  animation: fade-in 0.5s ease;
}

/* Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

.last-updated {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.action-btn {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover:not(:disabled) {
  background-color: var(--bg-hover);
  border-color: var(--text-secondary);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.spinning {
  animation: spin 1s linear infinite;
}

/* Grid Layout */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* Common Card Styles */
.stat-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
  border-color: rgba(255,255,255,0.1);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.card-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.icon-wrapper {
  padding: 0.5rem;
  border-radius: 8px;
  background-color: rgba(255,255,255,0.03);
}

.icon-wrapper.income { color: #10b981; background-color: rgba(16, 185, 129, 0.1); }
.icon-wrapper.students { color: #3b82f6; background-color: rgba(59, 130, 246, 0.1); }
.icon-wrapper.score { color: #f59e0b; background-color: rgba(245, 158, 11, 0.1); }

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 0.5rem;
  font-feature-settings: "tnum"; /* 等宽数字 */
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 500;
}
.stat-trend.positive { color: #10b981; }
.stat-trend.neutral { color: var(--text-secondary); }

.stat-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  background-color: rgba(255,255,255,0.05);
}
.text-success { color: #10b981; }
.text-info { color: #3b82f6; }
.text-warning { color: #f59e0b; }

/* Membership Card Special Styles */
.membership-card {
  grid-column: span 1; 
  /* 在宽屏下跨两列，后面媒体查询处理 */
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.card-body-scroll {
  flex: 1;
  overflow-y: auto;
  max-height: 200px;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: var(--bg-app); /* 比卡片表面更深 */
  border-radius: 8px;
  border: 1px solid transparent;
  transition: border-color 0.2s;
}

.member-item:hover {
  border-color: var(--border-subtle);
}

.member-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.member-top-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.member-name {
  font-weight: 600;
  color: var(--text-primary);
}

.phone-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  transition: all 0.2s;
}
.phone-btn:hover {
  color: var(--primary-color);
  background-color: rgba(99, 102, 241, 0.1);
}

.expiry-date {
  font-size: 0.75rem;
  color: #ef4444; /* red-500 */
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.1rem;
}

.renew-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.renew-input {
  width: 60px;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  color: var(--text-primary);
}
.renew-input:focus {
  outline: none;
  border-color: var(--primary-color);
}
.renew-input::placeholder {
  color: var(--text-secondary);
}

.renew-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.renew-btn:hover:not(:disabled) {
  background-color: #4f46e5;
}
.renew-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-link {
  font-size: 0.8rem;
  color: var(--primary-color);
  background: none;
  border: none;
  cursor: pointer;
}
.action-link:hover { text-decoration: underline; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.empty-icon {
  color: #3f3f46;
  margin-bottom: 0.5rem;
}

/* Skeleton Loading Animation */
.skeleton-line {
  background-color: rgba(255,255,255,0.05);
  border-radius: 4px;
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Responsive */
@media (min-width: 1024px) {
  .membership-card {
    grid-column: span 2;
  }
}
</style>
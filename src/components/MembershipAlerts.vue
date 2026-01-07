<template>
  <Transition name="slide-fade">
    <div 
      class="membership-widget" 
      v-if="showAlerts"
      role="alertdialog"
    >
      <!-- 顶部 Header -->
      <div class="widget-header">
        <div class="header-title">
          <BellRing :size="18" class="text-warning" />
          <h3>会员预警</h3>
        </div>
        <div class="header-actions">
          <button 
            class="icon-btn" 
            @click="loadExpiringMemberships"
            :disabled="loading"
            title="刷新列表"
          >
            <RefreshCw :size="16" :class="{ 'spin-anim': loading }" />
          </button>
          <button 
            class="icon-btn close" 
            @click="startFadeOut"
            title="关闭"
          >
            <X :size="16" />
          </button>
        </div>
      </div>

      <!-- 列表内容区域 -->
      <div class="widget-body">
        
        <!-- Loading State -->
        <div v-if="loading && expiringMemberships.length === 0" class="state-loading">
          <Loader2 :size="24" class="spin-anim text-muted" />
          <span>正在同步数据...</span>
        </div>

        <!-- 列表有数据 -->
        <div v-else-if="expiringMemberships.length > 0" class="alert-list custom-scrollbar">
          <div class="list-summary">
            <span>发现 {{ expiringMemberships.length }} 名学员需关注</span>
          </div>

          <div 
            v-for="student in expiringMemberships" 
            :key="student.uid"
            class="alert-card"
          >
            <!-- 学员信息行 -->
            <div class="student-row">
              <div class="student-meta">
                <span class="name">{{ student.name }}</span>
                <div class="expiry-tag">
                  剩余 {{ student.membership_days_remaining }} 天
                </div>
              </div>
              <button class="btn-icon-text" @click="contactStudent(student)">
                <Phone :size="14" />
                <span>{{ student.phone }}</span>
              </button>
            </div>

            <!-- 到期时间 -->
            <div class="date-row">
              <CalendarX2 :size="14" class="text-muted" />
              <span class="date-text">
                到期日: {{ formatDate(student.membership_end_date) }}
              </span>
            </div>

            <!-- 操作行 (续费) -->
            <div class="action-row">
              <div class="input-group">
                <input
                  type="number"
                  min="1"
                  placeholder="天数"
                  v-model.number="extendDaysMap[student.uid]"
                  :disabled="loading"
                  class="compact-input"
                />
                <button 
                  class="btn-compact primary" 
                  @click="extendMembership(student)"
                  :disabled="loading || !(Number(extendDaysMap[student.uid] || 0) > 0)"
                >
                  <CreditCard :size="14" />
                  续费
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 (无过期会员) -->
        <div v-else-if="!loading" class="state-empty">
          <div class="icon-circle">
            <CheckCircle2 :size="32" />
          </div>
          <h4>暂无过期风险</h4>
          <p>所有会员状态良好</p>
          
          <!-- 自动关闭倒计时条 -->
          <div class="auto-close-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, type Ref } from 'vue';
import { ApiService } from '../api/ApiService';
import { useAppStore } from '../stores/app';
import { 
  BellRing, 
  RefreshCw, 
  X, 
  Phone, 
  CalendarX2, 
  CreditCard, 
  CheckCircle2,
  Loader2 
} from 'lucide-vue-next';

const appStore = useAppStore();

interface Student {
  uid: number;
  name: string;
  phone?: string;
  membership_days_remaining: number | null;
  membership_end_date?: string | null;
  membership_start_date?: string | null;
  is_membership_active: boolean;
}

const loading: Ref<boolean> = ref(false);
const showAlerts: Ref<boolean> = ref(true);
const expiringMemberships: Ref<Student[]> = ref([]);
const extendDaysMap: Record<number, number> = reactive({});

// 直接使用 appStore 的统一错误处理
const { showError, showSuccess } = appStore.errorHandler;

// 加载逻辑
const loadExpiringMemberships = async (): Promise<void> => {
  if (loading.value) return;

  showAlerts.value = true;
  loading.value = true;

  try {
    const expiring = await ApiService.getMembershipExpiringSoon(7);
    
    if (!Array.isArray(expiring)) throw new Error('数据格式错误');

    expiringMemberships.value = expiring.filter((s: any): s is Student => 
      s && s.uid && s.name && typeof s.uid === 'number'
    ) as Student[];
    
    // 如果无数据，2.5秒后自动关闭
    if (expiringMemberships.value.length === 0) {
      setTimeout(() => {
        // Double check in case data changed during timeout
        if (expiringMemberships.value.length === 0) {
          startFadeOut();
        }
      }, 2500);
    }
  } catch (error) {
    showError('无法加载会员提醒', (error as Error).message);
    expiringMemberships.value = [];
  } finally {
    loading.value = false;
  }
};

// 续费逻辑
const extendMembership = async (student: Student): Promise<void> => {
  if (!student?.uid) return;
  const days = extendDaysMap[student.uid] || 0;
  if (days <= 0) return showError('请输入有效天数');

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
    extendDaysMap[student.uid] = 0 as any; // Reset input
    await loadExpiringMemberships(); // Refresh list
  } catch (error) {
    showError('续费失败', (error as Error).message);
  } finally {
    loading.value = false;
  }
};

// 联系学员
const contactStudent = (student: Student): void => {
  if (!student.phone) return showError('无电话号码');
  
  try {
    window.location.href = `tel:${student.phone}`;
  } catch {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(student.phone);
      showSuccess('号码已复制');
    }
  }
};

// 辅助函数
const formatDate = (dateString: any) => {
  if (!dateString) return '--';
  try {
    return new Date(dateString).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch { return dateString; }
};

const startFadeOut = () => {
  showAlerts.value = false;
};

onMounted(() => loadExpiringMemberships());
</script>

<style scoped>
/* Widget Container */
.membership-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 360px;
  background-color: rgba(30, 30, 30, 0.95); /* Deep dark background */
  backdrop-filter: blur(12px); /* Glassmorphism */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1), 
    0 10px 15px -3px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(0,0,0,0.2);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #e2e8f0;
}

/* Header */
.widget-header {
  padding: 12px 16px;
  background-color: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-title h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.text-warning { color: #f59e0b; }

.header-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
}
.icon-btn:hover { background-color: rgba(255, 255, 255, 0.1); color: #fff; }
.icon-btn.close:hover { background-color: rgba(239, 68, 68, 0.2); color: #ef4444; }

/* Body Content */
.widget-body {
  max-height: 400px;
  overflow-y: auto;
  position: relative;
}

/* List Items */
.alert-list {
  padding: 0 16px 16px 16px;
}
.list-summary {
  padding: 12px 0 8px 0;
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: 500;
}

.alert-card {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.2s;
}
.alert-card:hover { border-color: rgba(255, 255, 255, 0.15); }

/* Card Rows */
.student-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.student-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.name { font-weight: 600; font-size: 0.95rem; }
.expiry-tag { 
  font-size: 0.75rem; 
  color: #f59e0b; 
  background: rgba(245, 158, 11, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  align-self: flex-start;
}

.btn-icon-text {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.btn-icon-text:hover { color: #6366f1; text-decoration: underline; }

.date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #64748b;
}

/* Action Input Group */
.action-row {
  margin-top: 4px;
}
.input-group {
  display: flex;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.compact-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  padding: 4px 8px;
  font-size: 0.85rem;
  width: 60px;
}
.compact-input:focus { outline: none; }
.btn-compact {
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}
.btn-compact.primary {
  background-color: #6366f1;
  color: white;
}
.btn-compact.primary:hover:not(:disabled) { background-color: #4f46e5; }
.btn-compact:disabled { opacity: 0.5; cursor: not-allowed; }

/* Empty State */
.state-empty {
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.state-empty h4 { margin: 0 0 4px 0; font-size: 1rem; color: #fff; }
.state-empty p { margin: 0; font-size: 0.85rem; color: #94a3b8; }

/* Loading State */
.state-loading {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #94a3b8;
  font-size: 0.9rem;
}

/* Auto Close Bar Animation */
.auto-close-bar {
  margin-top: 16px;
  width: 120px;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background-color: #10b981;
  width: 100%;
  animation: shrink-bar 2.5s linear forwards;
}

/* Animations */
@keyframes shrink-bar {
  from { width: 100%; }
  to { width: 0%; }
}
.spin-anim { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Vue Transition */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}

/* Custom Scrollbar for list */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
</style>
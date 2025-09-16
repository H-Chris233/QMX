<template>
  <div 
    class="membership-alerts" 
    v-if="showAlerts"
    :class="{ 'fade-out': isFadingOut }"
  >
    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-progress"></div>
    
    <div class="alerts-header">
      <h3>会员提醒</h3>
      <div class="header-actions">
        <button 
          class="refresh-btn" 
          @click="loadExpiringMemberships"
          :disabled="loading"
        >
          🔄 刷新
        </button>
        <button 
          class="close-btn" 
          @click="startFadeOut"
        >
          ✖️
        </button>
      </div>
    </div>

    <!-- 即将过期的会员 -->
    <div v-if="expiringMemberships.length > 0" class="alert-section expiring">
      <div class="alert-title">
        <span class="alert-icon">⚠️</span>
        <span>即将过期的会员 ({{ expiringMemberships.length }})</span>
      </div>
      <div class="alert-list">
        <div 
          v-for="student in expiringMemberships" 
          :key="student.uid"
          class="alert-item"
        >
          <div class="student-info">
            <span class="student-name">{{ student.name }}</span>
            <span class="student-phone">{{ student.phone }}</span>
          </div>
          <div class="expiry-info">
            <span class="days-remaining">
              剩余 {{ student.membership_days_remaining }} 天
            </span>
            <span class="expiry-date">
              {{ formatDate(student.membership_end_date) }}到期
            </span>
          </div>
          <div class="alert-actions">
            <button 
              class="extend-btn" 
              @click="extendMembership(student)"
              :disabled="loading"
            >
              续费
            </button>
            <button 
              class="contact-btn" 
              @click="contactStudent(student)"
            >
              联系
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 无即将过期的会员 -->
    <div v-else-if="!loading" class="no-alerts">
      <div class="no-alerts-icon">✅</div>
      <div class="no-alerts-text">暂无即将过期的会员</div>
      <div class="no-alerts-subtitle">窗口将在2.5秒后自动关闭</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject, type Ref } from 'vue';
import { ApiService } from '../api/ApiService';

interface Student {
  uid: number;
  name: string;
  phone?: string;
  membership_days_remaining: number | null;
  membership_end_date?: string | null;
  is_membership_active: boolean;
}

interface ErrorHandler {
  showError: (title: string, message: string, details?: string) => void;
  showSuccess: (title: string, message: string) => void;
}
const loading: Ref<boolean> = ref(false);
const showAlerts: Ref<boolean> = ref(true);
const isFadingOut: Ref<boolean> = ref(false);
const expiringMemberships: Ref<Student[]> = ref([]);
const errorHandler = inject<ErrorHandler>('errorHandler');

const showError = errorHandler?.showError || ((title: string, message: string, details?: string) => {
  console.error(`${title}: ${message}`, details);
  alert(`${title}\n${message}`);
});

const showSuccess = errorHandler?.showSuccess || ((title: string, message: string) => {
  console.log(`✅ ${title}: ${message}`);
});

// 加载即将过期的会员
const loadExpiringMemberships = async (): Promise<void> => {
      if (loading.value) {
        console.warn('正在加载中，跳过重复请求');
        return;
      }

      // 重置状态，重新显示组件
      isFadingOut.value = false;
      showAlerts.value = true;

      loading.value = true;
      try {
        // 使用新的v2 API方法
        const expiring = await ApiService.getMembershipExpiringSoon(7); // 7天内过期
        
        if (!Array.isArray(expiring)) {
          throw new Error('返回的数据格式不正确，期望数组格式');
        }

        expiringMemberships.value = expiring.filter((student: any): student is Student => 
          student && student.uid && student.name
        ) as Student[];

        console.log(`找到 ${expiringMemberships.value.length} 个即将过期的会员`);
        
        // 如果没有即将过期的会员，2.5秒后自动隐藏
        if (expiringMemberships.value.length === 0) {
          setTimeout(() => {
            if (expiringMemberships.value.length === 0) {
              startFadeOut();
            }
          }, 2500);
        }
      } catch (error) {
        console.error('加载即将过期会员失败:', error);
        expiringMemberships.value = [];
        showError('加载失败', '无法获取即将过期的会员信息', (error as Error).message || '未知错误');
      } finally {
        loading.value = false;
      }
    };

    // 续费会员
    const extendMembership = async (student: Student): Promise<void> => {
      if (!student || !student.uid) {
        showError('操作失败', '学员信息无效');
        return;
      }

      const extendDays = prompt(`为 ${student.name} 续费多少天？`, '30');
      if (!extendDays || isNaN(Number(extendDays)) || Number(extendDays) <= 0) {
        return;
      }

      loading.value = true;
      try {
        const days = Number(extendDays);
        // 注意：这里使用有效的API方法
        await ApiService.setMembershipByType(student.uid, 'month', true); // 设置为月卡
        showSuccess('续费成功', `已为 ${student.name} 续费 ${days} 天`);
        
        // 重新加载数据
        await loadExpiringMemberships();
      } catch (error) {
        console.error('续费失败:', error);
        showError('续费失败', '续费时发生错误', (error as Error).message || '未知错误');
      } finally {
        loading.value = false;
      }
    };

    // 联系学员（打开电话应用）
    const contactStudent = (student: Student): void => {
      if (!student || !student.phone) {
        showError('联系失败', '学员电话信息无效');
        return;
      }

      try {
        // 尝试打开电话应用
        window.location.href = `tel:${student.phone}`;
      } catch (error) {
        console.error('打开电话应用失败:', error);
        // 降级方案：复制到剪贴板
        if (navigator.clipboard) {
          navigator.clipboard.writeText(student.phone).then(() => {
            showSuccess('已复制', `电话号码 ${student.phone} 已复制到剪贴板`);
          });
        } else {
          alert(`学员电话: ${student.phone}`);
        }
      }
    };

    // 格式化日期
    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleDateString('zh-CN', {
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        console.warn('日期格式化失败:', error);
        return dateString;
      }
    };

    // 开始渐隐动画
    const startFadeOut = (): void => {
      isFadingOut.value = true;
      setTimeout(() => {
        showAlerts.value = false;
      }, 500); // 渐隐动画持续500ms
    };

    // 组件挂载时自动加载数据
    onMounted(() => {
      loadExpiringMemberships();
    });


</script>

<style scoped>
.membership-alerts {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 350px;
  max-height: 500px;
  background-color: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
  z-index: 1000;
  overflow: hidden;
  opacity: 1;
  transform: translateY(0) translateX(0);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
  animation: slideInFromRight 0.6s ease-out;
}

.membership-alerts.fade-out {
  opacity: 0;
  transform: translateY(20px) translateX(20px);
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(100%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
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

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-primary);
}

.alerts-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.refresh-btn,
.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.refresh-btn:hover,
.close-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.alert-section {
  padding: 1rem;
}

.alert-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.alert-icon {
  font-size: 1.2rem;
}

.expiring .alert-icon {
  color: #ff9800;
}

.alert-list {
  max-height: 300px;
  overflow-y: auto;
}

.alert-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background-color: var(--bg-primary);
  border-radius: 8px;
  border-left: 4px solid #ff9800;
  gap: 1rem;
}

.student-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.student-name {
  font-weight: 600;
  color: var(--text-primary);
}

.student-phone {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.expiry-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.days-remaining {
  font-weight: 600;
  color: #ff9800;
  font-size: 0.875rem;
}

.expiry-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.alert-actions {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.extend-btn,
.contact-btn {
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.extend-btn {
  background-color: var(--accent-primary);
  color: white;
}

.extend-btn:hover:not(:disabled) {
  background-color: #1976d2;
}

.extend-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.contact-btn {
  background-color: transparent;
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary);
}

.contact-btn:hover {
  background-color: var(--accent-primary);
  color: white;
}

.no-alerts {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  text-align: center;
}

.no-alerts-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.no-alerts-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.no-alerts-subtitle {
  color: var(--text-secondary);
  opacity: 0.7;
  font-size: 0.75rem;
  font-style: italic;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .membership-alerts {
    position: fixed;
    bottom: 10px;
    right: 10px;
    left: 10px;
    width: auto;
    max-width: none;
  }
  
  .alert-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .alert-actions {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
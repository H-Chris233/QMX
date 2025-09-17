<template>
  <div
    v-if="show"
    class="error-modal-overlay"
    @click="closeOnOverlayClick ? closeModal() : null"
  >
    <div class="error-modal" @click.stop>
      <div class="error-header">
        <div class="error-icon">❌</div>
        <h3>{{ title }}</h3>
      </div>

      <div class="error-content">
        <p>{{ message }}</p>
        <div v-if="details" class="error-details">
          <details>
            <summary>详细信息</summary>
            <pre>{{ details }}</pre>
          </details>
        </div>
      </div>

      <div class="error-actions">
        <button class="error-btn primary" @click="closeModal">确定</button>
        <button v-if="showRetry" class="error-btn secondary" @click="retry">
          重试
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue';

interface Props {
  show?: boolean;
  title?: string;
  message: string;
  details?: string;
  closeOnOverlayClick?: boolean;
  showRetry?: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'retry'): void;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: '错误',
  details: '',
  closeOnOverlayClick: true,
  showRetry: false,
});

const emit = defineEmits<Emits>();
const closeModal = (): void => {
  emit('close');
};

const retry = (): void => {
  emit('retry');
};

// 修复内存泄漏：使用ref跟踪监听器状态
const escapeHandler = ref<((e: KeyboardEvent) => void) | null>(null);

watch(
  () => props.show,
  (newVal: boolean) => {
    // 清理之前的监听器
    if (escapeHandler.value) {
      document.removeEventListener('keydown', escapeHandler.value);
      escapeHandler.value = null;
    }
    
    if (newVal) {
      const handler = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          closeModal();
        }
      };
      document.addEventListener('keydown', handler);
      escapeHandler.value = handler;
    }
  },
  { immediate: true }
);

// 组件卸载时清理
onUnmounted(() => {
  if (escapeHandler.value) {
    document.removeEventListener('keydown', escapeHandler.value);
    escapeHandler.value = null;
  }
});


</script>

<style scoped>
.error-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.error-modal {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.error-icon {
  font-size: 2rem;
  color: var(--accent-danger);
}

.error-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
}

.error-content {
  margin-bottom: 1.5rem;
}

.error-content p {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  line-height: 1.5;
}

.error-details {
  margin-top: 1rem;
}

.error-details details {
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  padding: 0.75rem;
}

.error-details summary {
  cursor: pointer;
  color: var(--accent-primary);
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.error-details summary:hover {
  text-decoration: underline;
}

.error-details pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.error-btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.error-btn.primary {
  background-color: var(--accent-danger);
  color: white;
}

.error-btn.primary:hover {
  background-color: #d32f2f;
  transform: translateY(-1px);
}

.error-btn.secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.error-btn.secondary:hover {
  background-color: var(--border-color);
  transform: translateY(-1px);
}

/* 主题适配 */
.light-theme .error-modal {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .error-modal {
    padding: 1rem;
    margin: 1rem;
  }

  .error-header {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .error-actions {
    flex-direction: column;
  }

  .error-btn {
    width: 100%;
  }
}
</style>

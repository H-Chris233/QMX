<template>
  <div
    v-if="show"
    class="confirm-modal-overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="title || '确认操作'"
    @click="closeOnOverlayClick ? cancelAction() : null"
  >
    <div class="confirm-modal" tabindex="-1" @click.stop>
      <div class="confirm-header">
        <div class="confirm-icon" aria-hidden="true">❓</div>
        <h3>{{ title }}</h3>
      </div>

      <div class="confirm-content">
        <p>{{ message }}</p>
        <div v-if="details" class="confirm-details">
          <details>
            <summary>详细信息</summary>
            <pre>{{ details }}</pre>
          </details>
        </div>
      </div>

      <div class="confirm-actions">
        <button class="confirm-btn secondary" @click="cancelAction">
          {{ cancelText }}
        </button>
        <button class="confirm-btn primary" :data-type="props.confirmType" @click="confirmAction">
          {{ confirmText }}
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
  confirmText?: string;
  cancelText?: string;
  confirmType?: string;
}

interface Emits {
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: '确认操作',
  details: '',
  closeOnOverlayClick: true,
  confirmText: '确定',
  cancelText: '取消',
  confirmType: 'primary',
});

const emit = defineEmits<Emits>();
const confirmAction = (): void => {
  emit('confirm');
};

const cancelAction = (): void => {
  emit('cancel');
};

// 修复内存泄漏：正确管理ESC键监听器
let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

watch(
  () => props.show,
  (newVal: boolean) => {
    // 清理之前的监听器
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
      escapeHandler = null;
    }
    
    if (newVal) {
      escapeHandler = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          cancelAction();
        }
      };
      document.addEventListener('keydown', escapeHandler);
    }
  },
);

// 组件卸载时清理
onUnmounted(() => {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }
});


</script>

<style scoped>
.confirm-modal-overlay {
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

.confirm-modal {
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

.confirm-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.confirm-icon {
  font-size: 2rem;
  color: var(--accent-warning);
}

.confirm-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
}

.confirm-content {
  margin-bottom: 1.5rem;
}

.confirm-content p {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  line-height: 1.5;
}

.confirm-details {
  margin-top: 1rem;
}

.confirm-details details {
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  padding: 0.75rem;
}

.confirm-details summary {
  cursor: pointer;
  color: var(--accent-primary);
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.confirm-details summary:hover {
  text-decoration: underline;
}

.confirm-details pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.confirm-btn.primary {
  background-color: var(--accent-primary);
  color: white;
}

.confirm-btn.primary:hover {
  background-color: #1976d2;
  transform: translateY(-1px);
}

.confirm-btn.secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.confirm-btn.secondary:hover {
  background-color: var(--border-color);
  transform: translateY(-1px);
}

/* 危险操作样式 */
.confirm-btn.danger {
  background-color: var(--accent-danger);
  color: white;
}

.confirm-btn.danger:hover {
  background-color: #d32f2f;
  transform: translateY(-1px);
}

/* 警告操作样式 */
.confirm-btn.warning {
  background-color: var(--accent-warning);
  color: white;
}

.confirm-btn.warning:hover {
  background-color: #f57c00;
  transform: translateY(-1px);
}

/* 根据confirmType动态应用样式 */
.confirm-btn.primary[data-type="danger"] {
  background-color: var(--accent-danger);
}

.confirm-btn.primary[data-type="danger"]:hover {
  background-color: #d32f2f;
}

.confirm-btn.primary[data-type="warning"] {
  background-color: var(--accent-warning);
}

.confirm-btn.primary[data-type="warning"]:hover {
  background-color: #f57c00;
}

/* 主题适配 */
.light-theme .confirm-modal {
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .confirm-modal {
    padding: 1.5rem;
    margin: 1rem;
    max-width: calc(100vw - 2rem);
    border-radius: 16px;
  }

  .confirm-header {
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
  }

  .confirm-icon {
    font-size: 2.5rem;
  }

  .confirm-header h3 {
    font-size: 1.375rem;
  }

  .confirm-content {
    margin-bottom: 2rem;
  }

  .confirm-content p {
    font-size: 1rem;
    line-height: 1.6;
  }

  .confirm-actions {
    flex-direction: column-reverse;
    gap: 1rem;
  }

  .confirm-btn {
    width: 100%;
    padding: 1rem 1.5rem;
    font-size: 1rem;
    min-height: 48px;
    border-radius: 12px;
    font-weight: 600;
  }
}

@media (max-width: 480px) {
  .confirm-modal {
    padding: 1rem;
    margin: 0.5rem;
    max-width: calc(100vw - 1rem);
    border-radius: 20px;
  }

  .confirm-header {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .confirm-icon {
    font-size: 3rem;
  }

  .confirm-header h3 {
    font-size: 1.5rem;
  }

  .confirm-btn {
    padding: 1.25rem 1.5rem;
    font-size: 1.125rem;
    min-height: 52px;
    border-radius: 16px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .confirm-btn:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
  
  .confirm-modal-overlay {
    -webkit-tap-highlight-color: transparent;
  }
}
</style>
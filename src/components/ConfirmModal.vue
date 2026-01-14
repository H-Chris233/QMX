<template>
  <Teleport to="body" :disabled="disableTeleport">
    <Transition name="modal-fade">
      <div
        v-if="showState"
        class="confirm-overlay confirm-modal-overlay"
        :class="typeClass"
        role="dialog"
        aria-modal="true"
        :aria-label="titleText"
        @click="closeOnOverlayClick ? cancelAction() : null"
        :style="{ zIndex: 9999 }"
      >
        <div class="confirm-card modal-content" @click.stop>
          <!-- 头部 -->
          <div class="card-header">
            <div class="icon-wrapper">
              <component :is="typeIcon" :size="24" />
            </div>
            <h3 class="title modal-title">{{ titleText }}</h3>
          </div>

          <!-- 内容 -->
          <div class="card-body">
            <p class="message modal-message">{{ messageText }}</p>

            <!-- 详细信息 (可选) -->
            <div v-if="detailsText" class="details-section">
              <details>
                <summary>
                  <Terminal :size="14" />
                  <span>详细信息</span>
                  <ChevronDown :size="14" class="arrow" />
                </summary>
                <div class="code-block">
                  <pre>{{ detailsText }}</pre>
                </div>
              </details>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="card-footer">
            <button class="btn btn-secondary cancel-btn" @click="cancelAction">
              {{ cancelTextValue }}
            </button>
            <button 
              class="btn btn-primary confirm-btn"
              :class="confirmTypeValue"
              ref="confirmBtnRef"
              @click="confirmAction"
            >
              {{ confirmTextValue }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted, ref, computed, nextTick, getCurrentInstance } from 'vue';
import { 
  HelpCircle, 
  AlertTriangle, 
  AlertOctagon, 
  Terminal, 
  ChevronDown 
} from 'lucide-vue-next';
import { useAppStore } from '../stores/app';

type ConfirmType = 'primary' | 'danger' | 'warning';

interface Props {
  show?: boolean;
  title?: string;
  message: string;
  details?: string;
  closeOnOverlayClick?: boolean;
  confirmText?: string;
  cancelText?: string;
  confirmType?: ConfirmType;
}

interface Emits {
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: '确认操作',
  details: undefined,
  closeOnOverlayClick: true,
  confirmText: '确定',
  cancelText: '取消',
  confirmType: 'primary',
});

const emit = defineEmits<Emits>();
const confirmBtnRef = ref<HTMLButtonElement | null>(null);
const appStore = useAppStore();
const instance = getCurrentInstance();
const isControlled = Boolean(instance?.vnode.props && 'show' in instance.vnode.props);
const disableTeleport = (import.meta as { env?: { MODE?: string } }).env?.MODE === 'test';

const showState = computed(() => isControlled ? props.show : appStore.confirmModal.show);
const titleText = computed(() => isControlled ? props.title : appStore.confirmModal.title);
const messageText = computed(() => isControlled ? props.message : appStore.confirmModal.message);
const detailsText = computed(() => isControlled ? props.details : undefined);
const confirmTextValue = computed(() => isControlled ? props.confirmText : appStore.confirmModal.confirmText);
const cancelTextValue = computed(() => isControlled ? props.cancelText : appStore.confirmModal.cancelText);
const confirmTypeValue = computed(() => isControlled ? props.confirmType : appStore.confirmModal.confirmType);

// === 视觉逻辑 ===
const typeClass = computed(() => `type-${confirmTypeValue.value}`);

const typeIcon = computed(() => {
  switch (confirmTypeValue.value) {
    case 'danger': return AlertOctagon;
    case 'warning': return AlertTriangle;
    case 'primary': 
    default: return HelpCircle;
  }
});

// === 交互逻辑 ===
const confirmAction = () => {
  if (isControlled) {
    emit('confirm');
    return;
  }
  appStore.handleConfirm();
};
const cancelAction = () => {
  if (isControlled) {
    emit('cancel');
    return;
  }
  appStore.handleCancel();
};

// 键盘事件 (Escape 关闭, Enter 确认)
const keyHandler = ref<((e: KeyboardEvent) => void) | null>(null);

watch(
  () => showState.value,
  (newVal) => {
    // 清理旧监听
    if (keyHandler.value) {
      document.removeEventListener('keydown', keyHandler.value);
      keyHandler.value = null;
    }
    
    if (newVal) {
      // 自动聚焦确认按钮 (提升体验)
      nextTick(() => {
        if (confirmBtnRef.value) confirmBtnRef.value.focus();
      });

      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') cancelAction();
        // 只有当没有焦点在按钮上时，Enter 才触发确认，避免重复触发
        if (e.key === 'Enter' && document.activeElement !== confirmBtnRef.value) {
           e.preventDefault();
           // 可选：在这里决定是否允许回车直接提交，通常为了安全，Delete 操作不建议回车直接提交
           if (props.confirmType !== 'danger') confirmAction();
        }
      };
      document.addEventListener('keydown', handler);
      keyHandler.value = handler;
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (keyHandler.value) document.removeEventListener('keydown', keyHandler.value);
});
</script>

<style scoped>
/* 确保变量回退，防止透明 */
.confirm-overlay {
  --bg-fallback: #1e1e1e;
  --text-fallback: #fff;
}

/* Overlay */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

/* Themes */
.type-primary { --theme-color: #6366f1; --theme-bg: rgba(99, 102, 241, 0.1); }
.type-warning { --theme-color: #f59e0b; --theme-bg: rgba(245, 158, 11, 0.1); }
.type-danger  { --theme-color: #ef4444; --theme-bg: rgba(239, 68, 68, 0.1); }

/* Card */
.confirm-card {
  background-color: var(--bg-surface, var(--bg-fallback));
  border: 1px solid var(--border-subtle, #333);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-primary, var(--text-fallback));
  /* 顶部带颜色的装饰条 */
  border-top: 4px solid var(--theme-color);
}

/* Header */
.card-header {
  padding: 1.5rem 1.5rem 0.5rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-wrapper {
  color: var(--theme-color);
  background-color: var(--theme-bg);
  padding: 0.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

/* Body */
.card-body {
  padding: 1rem 1.5rem 1.5rem 1.5rem;
}

.message {
  margin: 0;
  line-height: 1.6;
  color: var(--text-secondary, #ccc);
  font-size: 0.95rem;
}

/* Details Section */
.details-section {
  margin-top: 1rem;
}

.details-section details {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-subtle, #333);
  border-radius: 8px;
  overflow: hidden;
}

.details-section summary {
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  list-style: none;
  transition: background 0.2s;
}
.details-section summary:hover { background-color: rgba(255,255,255,0.05); }
.details-section summary::-webkit-details-marker { display: none; }

.details-section details[open] .arrow { transform: rotate(180deg); }
.arrow { margin-left: auto; transition: transform 0.2s; }

.code-block {
  background-color: #0d0d0d;
  padding: 0.75rem;
  border-top: 1px solid var(--border-subtle, #333);
}

.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 0.75rem;
  color: #a3a3a3;
  max-height: 150px;
  overflow-y: auto;
}

/* Footer */
.card-footer {
  padding: 1rem 1.5rem;
  background-color: rgba(0, 0, 0, 0.2);
  border-top: 1px solid var(--border-subtle, #333);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn {
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--border-subtle, #555);
  color: var(--text-primary, #fff);
}
.btn-secondary:hover { background-color: rgba(255,255,255,0.1); }

.btn-primary {
  background-color: var(--theme-color);
  color: #fff; /* Most theme colors work with white text, warning might need check */
}
/* Warning 情况下文字颜色可能需要深色，视具体配色而定，这里统一用白色 */
.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}
.btn-primary:active { transform: translateY(0); }

/* Animation */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.modal-fade-enter-active .confirm-card, .modal-fade-leave-active .confirm-card { 
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); 
}
.modal-fade-enter-from .confirm-card { transform: scale(0.95) translateY(10px); }
.modal-fade-leave-to .confirm-card { transform: scale(0.95) translateY(10px); }
</style>

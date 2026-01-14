<template>
  <!-- Teleport 确保弹窗挂载到 body，不受父组件 overflow/z-index 限制 -->
  <Teleport to="body" :disabled="disableTeleport">
    <Transition name="modal-fade">
      <div
        v-if="show"
        class="modal-overlay error-modal-overlay"
        :class="{ 'is-critical': resolvedPriority === 'critical' }"
        @click="closeOnOverlayClick ? closeModal() : null"
        role="alertdialog"
        aria-modal="true"
        :style="{ zIndex: 9999 }" 
      >
        <div 
          class="error-card error-modal" 
          :class="[priorityClass, { 'shake-anim': resolvedPriority === 'critical' }]" 
          @click.stop
        >
          <!-- 头部：图标与标题 -->
          <div class="card-header">
            <div class="icon-wrapper">
              <component :is="priorityIcon" :size="24" />
            </div>
            <div class="header-text">
              <h3>{{ title }}</h3>
              <span v-if="priorityText" class="priority-badge">
                {{ priorityText }}
              </span>
            </div>
          </div>

          <!-- 内容区域 -->
          <div class="card-body">
            <p class="error-message">{{ message }}</p>

            <!-- 技术细节 (仿终端样式) -->
            <div v-if="details" class="technical-details error-details">
              <details>
                <summary>
                  <Terminal :size="14" />
                  <span>调试信息 (Debug Info)</span>
                  <ChevronDown :size="14" class="arrow-icon" />
                </summary>
                <div class="code-block">
                  <pre>{{ details }}</pre>
                  <button class="copy-btn" @click="copyDetails" title="复制">
                    <Copy :size="14" />
                  </button>
                </div>
              </details>
            </div>
          </div>

          <!-- 底部操作栏 -->
          <div class="card-footer">
            <button v-if="showRetry" class="btn btn-secondary error-btn secondary" @click="retry">
              <RefreshCcw :size="16" />
              重试
            </button>
            <button class="btn btn-primary error-btn primary" @click="closeModal">
              确定
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted, ref, computed } from 'vue';
import { getPriorityDescription, getPriorityClass, ErrorPriority, type ErrorPriorityLevel } from '../utils/errorHandler';
import { 
  AlertTriangle, 
  XCircle, 
  AlertOctagon, 
  Info, 
  Terminal, 
  ChevronDown, 
  Copy,
  RefreshCcw 
} from 'lucide-vue-next';

interface Props {
  show?: boolean;
  title?: string;
  message: string;
  details?: string;
  closeOnOverlayClick?: boolean;
  showRetry?: boolean;
  priority?: ErrorPriorityLevel;
}

interface Emits {
  (e: 'close'): void;
  (e: 'retry'): void;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  title: '系统提示',
  details: undefined,
  closeOnOverlayClick: true,
  showRetry: false,
  priority: 'medium' as ErrorPriorityLevel,
});

const emit = defineEmits<Emits>();

const disableTeleport = (import.meta as { env?: { MODE?: string } }).env?.MODE === 'test';

// === 优先级逻辑处理 ===
const normalizePriority = (priority?: ErrorPriorityLevel): ErrorPriority => {
  switch (priority) {
    case 'critical': return ErrorPriority.CRITICAL;
    case 'high': return ErrorPriority.HIGH;
    case 'low': return ErrorPriority.LOW;
    default: return ErrorPriority.MEDIUM;
  }
};

const resolvedPriority = computed(() => normalizePriority(props.priority));
const priorityText = computed(() => getPriorityDescription(resolvedPriority.value));
const priorityClass = computed(() => getPriorityClass(resolvedPriority.value));

// 图标映射
const priorityIcon = computed(() => {
  switch (resolvedPriority.value) {
    case ErrorPriority.CRITICAL: return AlertOctagon;
    case ErrorPriority.HIGH: return XCircle;
    case ErrorPriority.MEDIUM: return AlertTriangle;
    case ErrorPriority.LOW: return Info;
    default: return AlertTriangle;
  }
});

// === 交互逻辑 ===
const closeModal = () => emit('close');
const retry = () => emit('retry');

const copyDetails = async () => {
  if (props.details) {
    try {
      await navigator.clipboard.writeText(props.details);
    } catch (err) {
      // 复制失败静默处理
    }
  }
};

// 键盘事件管理 (Escape 关闭)
const escapeHandler = ref<((e: KeyboardEvent) => void) | null>(null);

watch(
  () => props.show,
  (newVal) => {
    if (escapeHandler.value) {
      document.removeEventListener('keydown', escapeHandler.value);
      escapeHandler.value = null;
    }
    if (newVal) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeModal();
      };
      document.addEventListener('keydown', handler);
      escapeHandler.value = handler;
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (escapeHandler.value) document.removeEventListener('keydown', escapeHandler.value);
});
</script>

<style scoped>
/* 核心修复：确保样式变量有默认值，防止因变量缺失导致透明背景 */
.error-card {
  --bg-fallback: #1e1e1e;
  --border-fallback: #333;
  --text-fallback: #fff;
}

/* Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  /* z-index 通过内联样式强制设为 9999 */
}

/* Critical Overlay */
.modal-overlay.is-critical {
  background-color: rgba(69, 10, 10, 0.8);
}

/* Card Container */
.error-card {
  background-color: var(--bg-surface, var(--bg-fallback));
  border: 1px solid var(--border-subtle, var(--border-fallback));
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--text-primary, var(--text-fallback));
}

/* 优先级主题色 */
.error-critical { border-color: #ef4444; }
.error-critical .icon-wrapper { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.error-critical .priority-badge { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
.error-critical .btn-primary { background-color: #ef4444; color: white; }
.error-critical .btn-primary:hover { background-color: #dc2626; }

.error-high { border-color: #f97316; }
.error-high .icon-wrapper { color: #f97316; background: rgba(249, 115, 22, 0.1); }
.error-high .priority-badge { background: rgba(249, 115, 22, 0.1); color: #f97316; }
.error-high .btn-primary { background-color: #f97316; color: white; }

.error-medium { border-color: #eab308; }
.error-medium .icon-wrapper { color: #eab308; background: rgba(234, 179, 8, 0.1); }
.error-medium .priority-badge { background: rgba(234, 179, 8, 0.1); color: #eab308; }
.error-medium .btn-primary { background-color: #eab308; color: #000; }

.error-low { border-color: #3b82f6; }
.error-low .icon-wrapper { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
.error-low .btn-primary { background-color: #3b82f6; color: white; }

/* Header */
.card-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.icon-wrapper {
  padding: 0.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-text h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #fff);
}

.priority-badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  display: inline-block;
}

/* Body */
.card-body {
  padding: 0 1.5rem 1.5rem 1.5rem;
}

.error-message {
  color: var(--text-secondary, #ccc);
  line-height: 1.6;
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
}

/* Technical Details */
.technical-details details {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-subtle, #333);
  border-radius: 8px;
  overflow: hidden;
}

.technical-details summary {
  padding: 0.75rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary, #aaa);
  list-style: none; /* Hide default triangle */
  user-select: none;
}
.technical-details summary::-webkit-details-marker { display: none; }

.technical-details summary:hover { background-color: rgba(255,255,255,0.05); }

.arrow-icon { margin-left: auto; transition: transform 0.2s; }
.technical-details details[open] .arrow-icon { transform: rotate(180deg); }

.code-block {
  position: relative;
  background-color: #0d0d0d;
  padding: 1rem;
  border-top: 1px solid var(--border-subtle, #333);
}

.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 0.75rem;
  color: #ef4444;
  max-height: 200px;
  overflow-y: auto;
}

.copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(255,255,255,0.1);
  border: none;
  color: #ccc;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--border-subtle, #555);
  color: var(--text-primary, #fff);
}
.btn-secondary:hover { background-color: rgba(255,255,255,0.1); }

/* Animation */
.shake-anim {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .error-card, .modal-fade-leave-active .error-card { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-fade-enter-from .error-card { transform: scale(0.95) translateY(10px); }
</style>

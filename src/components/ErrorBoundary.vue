<template>
  <div class="error-boundary">
    <!-- 正常渲染子组件 -->
    <template v-if="!hasError">
      <slot />
    </template>

    <!-- 错误状态显示 -->
    <div v-else class="error-boundary-fallback">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">{{ errorTitle }}</h2>
      <p class="error-message">{{ errorMessage }}</p>

      <!-- 开发环境显示详细错误 -->
      <details v-if="isDev && errorDetails" class="error-details">
        <summary>查看详细错误信息</summary>
        <pre>{{ errorDetails }}</pre>
      </details>

      <div class="error-actions">
        <button @click="handleRetry" class="btn-retry">
          重试
        </button>
        <button @click="handleReset" class="btn-reset">
          重置页面
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, provide } from 'vue';
import { logger } from '@/utils/logger';

/**
 * ErrorBoundary 组件 - Vue 3 错误边界
 * 捕获子组件的错误，防止整个应用崩溃
 */

interface Props {
  // 自定义错误标题
  fallbackTitle?: string;
  // 自定义错误消息
  fallbackMessage?: string;
  // 错误回调
  onError?: (error: Error, info: string) => void;
  // 重试回调
  onRetry?: () => void;
}

const defaultFallbackMessage = '抱歉，该功能遇到了问题。请尝试刷新页面或联系管理员。';
const props = withDefaults(defineProps<Props>(), {
  fallbackTitle: '组件加载失败',
  fallbackMessage: defaultFallbackMessage
});

const hasError = ref(false);
const errorTitle = ref(props.fallbackTitle);
const errorMessage = ref(props.fallbackMessage);
const errorDetails = ref('');
const isDev = import.meta.env.DEV;
const suppressNextError = ref(false);

// 捕获子组件错误
onErrorCaptured((err: Error, instance, info: string) => {
  if (suppressNextError.value) {
    suppressNextError.value = false;
    return false;
  }
  logger.error('🔴 ErrorBoundary捕获到错误:', {
    error: err,
    component: instance?.$options.name || 'Unknown',
    errorInfo: info,
    timestamp: new Date().toISOString()
  });

  // 设置错误状态
  hasError.value = true;
  errorTitle.value = props.fallbackTitle || '组件加载失败';
  const useCustomMessage = props.fallbackMessage !== defaultFallbackMessage;
  const errorText = err?.message || (err ? String(err) : '');
  if (useCustomMessage) {
    errorMessage.value = props.fallbackMessage;
  } else if (errorText) {
    errorMessage.value = `${props.fallbackMessage} ${errorText}`.trim();
  } else {
    errorMessage.value = props.fallbackMessage;
  }
  errorDetails.value = `错误信息: ${err.message}\n\n错误位置: ${info}\n\n堆栈:\n${err.stack || '无堆栈信息'}`;

  // 调用错误回调
  if (props.onError) {
    props.onError(err, info);
  }

  // 返回 false 阻止错误继续向上传播
  return false;
});

// 重试操作
function handleRetry(): void {
  hasError.value = false;
  errorDetails.value = '';
  suppressNextError.value = true;

  if (props.onRetry) {
    props.onRetry();
  }
}

// 重置页面
function handleReset(): void {
  window.location.reload();
}

// 提供错误边界状态（子组件可以访问）
provide('errorBoundary', {
  hasError,
  resetError: handleRetry
});
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.error-boundary-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  min-height: 400px;
  background-color: var(--bg-surface);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.8;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
}

.error-message {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0 0 2rem 0;
  max-width: 500px;
  line-height: 1.6;
}

.error-details {
  margin-bottom: 2rem;
  text-align: left;
  max-width: 600px;
  width: 100%;
}

.error-details summary {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  user-select: none;
}

.error-details summary:hover {
  color: var(--text-primary);
}

.error-details pre {
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-retry,
.btn-reset {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-retry {
  background-color: var(--primary-color);
  color: white;
}

.btn-retry:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-retry:active {
  transform: translateY(0);
}

.btn-reset {
  background-color: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}

.btn-reset:hover {
  background-color: var(--bg-app);
}

.btn-reset:active {
  transform: scale(0.98);
}
</style>

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface LoadingState {
  global: boolean;
  api: Record<string, boolean>;
  components: Record<string, boolean>;
}

export interface ErrorInfo {
  message: string;
  code?: string | number;
  timestamp: Date;
  context?: string;
}

export interface SystemInfo {
  version: string;
  lastUpdated: Date | null;
  adapterHealth: any;
}

export interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmType: 'danger' | 'warning' | 'primary';
  onConfirm?: (() => void) | null;
  onCancel?: (() => void) | null;
}

/**
 * 应用全局状态管理
 * 负责加载状态、错误处理、系统信息等全局功能
 */
export const useAppStore = defineStore('app', () => {
  // State
  const loading = ref<LoadingState>({
    global: false,
    api: {},
    components: {}
  });

  // 主题状态
  const theme = ref<'light' | 'dark'>('dark');

  const errors = ref<ErrorInfo[]>([]);
  const systemInfo = ref<SystemInfo>({
    version: '0.12.1',
    lastUpdated: null,
    adapterHealth: null
  });
  const isOnline = ref<boolean>(true);

  const confirmModal = ref<ConfirmModalState>({
    show: false,
    title: '',
    message: '',
    confirmText: '确定',
    cancelText: '取消',
    confirmType: 'primary',
    onConfirm: null,
    onCancel: null
  });

  // Getters
  const isLoading = computed(() => {
    return loading.value.global ||
           Object.values(loading.value.api).some(Boolean) ||
           Object.values(loading.value.components).some(Boolean);
  });

  const apiLoading = computed(() => (key: string) => {
    return loading.value.api[key] || false;
  });

  const hasErrors = computed(() => errors.value.length > 0);

  const latestError = computed(() => {
    return errors.value[errors.value.length - 1] || null;
  });

  // Actions
  function setGlobalLoading(state: boolean) {
    loading.value.global = state;
  }

  function setApiLoading(key: string, state: boolean) {
    loading.value.api[key] = state;
  }

  function setComponentLoading(key: string, state: boolean) {
    loading.value.components[key] = state;
  }

  function clearLoading() {
    loading.value = {
      global: false,
      api: {},
      components: {}
    };
  }

  function addError(error: Omit<ErrorInfo, 'timestamp'>) {
    const errorInfo: ErrorInfo = {
      ...error,
      timestamp: new Date()
    };

    errors.value.push(errorInfo);

    // 限制错误数量，最多保留50个
    if (errors.value.length > 50) {
      errors.value = errors.value.slice(-50);
    }

    // 在开发环境打印错误
    if (import.meta.env.DEV) {
      console.error('App Error:', errorInfo);
    }
  }

  function removeError(index: number) {
    errors.value.splice(index, 1);
  }

  function clearErrors() {
    errors.value = [];
  }

  function updateSystemInfo(info: Partial<SystemInfo>) {
    systemInfo.value = {
      ...systemInfo.value,
      ...info,
      lastUpdated: new Date()
    };
  }

  function setOnlineStatus(status: boolean) {
    isOnline.value = status;
  }

  /**
   * 系统刷新 - 替代原来的 provide/inject refreshSystem
   */
  async function refreshSystem(): Promise<void> {
    setGlobalLoading(true);
    clearErrors();

    try {
      // 这里可以添加系统刷新逻辑
      // 比如重新获取系统信息、清理缓存等
      updateSystemInfo({ lastUpdated: new Date() });

      // 触发其他store的刷新
      // 通过事件总线或者直接调用其他store的方法
    } catch (error) {
      addError({
        message: '系统刷新失败',
        context: 'refreshSystem',
        code: 'REFRESH_ERROR'
      });
    } finally {
      setGlobalLoading(false);
    }
  }

  /**
   * 简化的错误处理器 - 替代原来的 provide/inject errorHandler
   */
  const errorHandler = {
    showError: (message: string, context?: string) => {
      addError({ message, context });
    },

    showSuccess: (message: string) => {
      // 可以添加成功提示逻辑
      if (import.meta.env.DEV) {
        console.log('Success:', message);
      }
    },

    clearErrors
  };

  /**
   * 显示确认弹窗
   */
  function showConfirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmType?: 'danger' | 'warning' | 'primary';
    onConfirm?: () => void;
    onCancel?: () => void;
  }) {
    confirmModal.value = {
      show: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      confirmType: options.confirmType || 'primary',
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null
    };
  }

  /**
   * 隐藏确认弹窗
   */
  function hideConfirm() {
    confirmModal.value.show = false;
  }

  /**
   * 处理确认操作
   */
  function handleConfirm() {
    if (confirmModal.value.onConfirm) {
      confirmModal.value.onConfirm();
    }
    hideConfirm();
  }

  /**
   * 处理取消操作
   */
  function handleCancel() {
    if (confirmModal.value.onCancel) {
      confirmModal.value.onCancel();
    }
    hideConfirm();
  }

  /**
   * 初始化主题
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      theme.value = savedTheme;
    } else {
      theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    applyTheme(theme.value);
  }

  /**
   * 设置主题
   */
  function setTheme(mode: 'light' | 'dark') {
    theme.value = mode;
    localStorage.setItem('theme', mode);
    applyTheme(mode);
  }

  /**
   * 应用主题到 DOM
   */
  function applyTheme(mode: 'light' | 'dark') {
    const root = document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');
    root.classList.add(`${mode}-theme`);
    root.setAttribute('data-theme', mode);
  }

  return {
    // State
    loading,
    errors,
    systemInfo,
    isOnline,
    confirmModal,
    theme,

    // Getters
    isLoading,
    apiLoading,
    hasErrors,
    latestError,

    // Actions
    setGlobalLoading,
    setApiLoading,
    setComponentLoading,
    clearLoading,
    addError,
    removeError,
    clearErrors,
    updateSystemInfo,
    setOnlineStatus,
    refreshSystem,
    showConfirm,
    hideConfirm,
    handleConfirm,
    handleCancel,
    initTheme,
    setTheme,

    // 便捷方法
    errorHandler
  };
});
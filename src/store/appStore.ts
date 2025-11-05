/**
 * 应用状态管理
 * 全局状态和方法
 */
import { reactive, ref } from 'vue';

// 错误模态框状态
interface ErrorModal {
  show: boolean;
  title: string;
  message: string;
  details?: string | undefined;
  showRetry?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

// 确认模态框状态
interface ConfirmModal {
  show: boolean;
  title: string;
  message: string;
  details?: string | undefined;
  confirmText?: string | undefined;
  cancelText?: string | undefined;
  confirmType?: 'primary' | 'danger' | 'warning' | undefined;
  onConfirm?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
}

// 成功提示状态
interface SuccessToast {
  show: boolean;
  title: string;
  message: string;
}

// 刷新触发器
interface RefreshTriggers {
  students: number;
  transactions: number;
  grades: number;
  dashboard: number;
}

// 创建全局应用store
const createAppStore = () => {
  // 当前激活的标签页
  const activeTab = ref<string>('dashboard');
  
  // 主题
  const theme = ref<string>('dark');
  
  // 错误模态框
  const errorModal = reactive<ErrorModal>({
    show: false,
    title: '',
    message: '',
    details: '',
    showRetry: false,
    priority: 'medium',
  });

  // 确认模态框
  const confirmModal = reactive<ConfirmModal>({
    show: false,
    title: '',
    message: '',
    details: undefined,
    confirmText: '确认',
    cancelText: '取消',
    confirmType: 'primary',
    onConfirm: undefined,
    onCancel: undefined,
  });

  // 成功提示
  const successToast = reactive<SuccessToast>({
    show: false,
    title: '',
    message: '',
  });

  // 刷新触发器
  const refreshTriggers = reactive<RefreshTriggers>({
    students: 0,
    transactions: 0,
    grades: 0,
    dashboard: 0,
  });

  // 设置激活标签
  const setActiveTab = (tab: string) => {
    activeTab.value = tab;
  };

  // 显示错误
  const showError = (
    title: string,
    message: string,
    details?: string,
    showRetry: boolean = false,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    errorModal.show = true;
    errorModal.title = title;
    errorModal.message = message;
    errorModal.details = details ?? undefined;
    errorModal.showRetry = showRetry;
    errorModal.priority = priority;
  };

  // 隐藏错误
  const hideError = () => {
    errorModal.show = false;
    errorModal.title = '';
    errorModal.message = '';
    errorModal.details = undefined;
    errorModal.showRetry = false;
  };

  // 显示确认框
  const showConfirm = (options: {
    title: string;
    message: string;
    details?: string;
    confirmText?: string;
    cancelText?: string;
    confirmType?: 'primary' | 'danger' | 'warning';
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => {
    confirmModal.show = true;
    confirmModal.title = options.title;
    confirmModal.message = options.message;
    confirmModal.details = options.details;
    confirmModal.confirmText = options.confirmText || '确认';
    confirmModal.cancelText = options.cancelText || '取消';
    confirmModal.confirmType = options.confirmType || 'primary';
    confirmModal.onConfirm = options.onConfirm;
    confirmModal.onCancel = options.onCancel;
  };

  // 隐藏确认框
  const hideConfirm = () => {
    confirmModal.show = false;
    confirmModal.title = '';
    confirmModal.message = '';
    confirmModal.details = undefined;
    confirmModal.onConfirm = undefined;
    confirmModal.onCancel = undefined;
  };

  // 处理确认
  const handleConfirm = () => {
    if (confirmModal.onConfirm) {
      confirmModal.onConfirm();
    }
    hideConfirm();
  };

  // 处理取消
  const handleCancel = () => {
    if (confirmModal.onCancel) {
      confirmModal.onCancel();
    }
    hideConfirm();
  };

  // 显示成功提示
  const showSuccess = (title: string, message: string) => {
    successToast.show = true;
    successToast.title = title;
    successToast.message = message;
    
    // 3秒后自动隐藏
    setTimeout(() => {
      successToast.show = false;
    }, 3000);
  };

  // 触发刷新
  const triggerRefresh = (target: keyof RefreshTriggers) => {
    refreshTriggers[target]++;
  };

  // 切换主题
  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };

  return {
    // 状态
    activeTab,
    theme,
    errorModal,
    confirmModal,
    successToast,
    refreshTriggers,
    
    // 方法
    setActiveTab,
    showError,
    hideError,
    showConfirm,
    hideConfirm,
    handleConfirm,
    handleCancel,
    showSuccess,
    triggerRefresh,
    toggleTheme,
  };
};

// 导出单例
export const appStore = createAppStore();

// 向后兼容 - useAppStore
export const useAppStore = () => appStore;

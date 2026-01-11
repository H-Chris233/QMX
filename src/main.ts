import { createApp, defineAsyncComponent } from 'vue';
import { createPinia } from 'pinia';
import MainApp from './MainApp.vue';
import pinia from './stores';

const KEY_AGREED = 'qmx_agreed_to_terms';

/**
 * 全局错误处理器
 * 捕获所有未被组件处理的错误
 */
function setupGlobalErrorHandler(app: ReturnType<typeof createApp>): void {
  // Vue 组件错误处理
  app.config.errorHandler = (err, instance, info) => {
    console.error('🔴 Vue组件错误:', {
      error: err,
      component: instance?.$options.name || 'Unknown',
      errorInfo: info,
      timestamp: new Date().toISOString()
    });

    // 尝试显示用户友好的错误提示
    try {
      const appStore = useAppStore();
      appStore.addError({
        message: '组件加载失败',
        context: err instanceof Error ? err.message : '未知错误',
        type: 'component_error',
        timestamp: Date.now()
      });
    } catch (storeError) {
      // 如果 store 也失败，至少在控制台显示
      console.error('无法记录错误到 store:', storeError);
    }
  };

  // Vue 警告处理（开发环境）
  if (import.meta.env.DEV) {
    app.config.warnHandler = (msg, instance, trace) => {
      console.warn('⚠️ Vue警告:', {
        message: msg,
        component: instance?.$options.name || 'Unknown',
        trace
      });
    };
  }
}

/**
 * 全局未捕获错误处理
 */
function setupGlobalUncaughtHandlers(): void {
  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🔴 未处理的Promise拒绝:', {
      reason: event.reason,
      promise: event.promise,
      timestamp: new Date().toISOString()
    });

    event.preventDefault(); // 阻止默认的控制台错误输出

    // 尝试显示错误
    try {
      const appStore = useAppStore();
      appStore.addError({
        message: '操作失败',
        context: event.reason instanceof Error ? event.reason.message : String(event.reason),
        type: 'promise_rejection',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('无法记录Promise拒绝到store:', err);
    }
  });

  // 捕获全局JavaScript错误
  window.addEventListener('error', (event) => {
    console.error('🔴 全局JavaScript错误:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: new Date().toISOString()
    });

    // 阻止资源加载错误的默认处理
    if (event.target !== window) {
      return; // 资源加载错误，不显示给用户
    }

    event.preventDefault();

    try {
      const appStore = useAppStore();
      appStore.addError({
        message: '系统错误',
        context: event.message,
        type: 'runtime_error',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('无法记录全局错误到store:', err);
    }
  });
}

// 延迟导入 useAppStore（避免循环依赖）
function useAppStore() {
  const { useAppStore: getAppStore } = require('./stores/app');
  return getAppStore();
}

let agreedToTerms = 'false';
try {
  agreedToTerms = localStorage.getItem(KEY_AGREED) || 'false';
} catch {}

if (agreedToTerms === 'true') {
  const app = createApp(MainApp);
  app.use(pinia);

  // 设置全局错误处理
  setupGlobalErrorHandler(app);
  setupGlobalUncaughtHandlers();

  app.mount('#app');
} else {
  // UserAgreement 懒加载（首次访问时才加载）
  const UserAgreement = defineAsyncComponent(() => import('./components/UserAgreement.vue'));
  const app = createApp(UserAgreement);
  app.use(createPinia()); // 为协议页面也创建Pinia实例

  // 设置全局错误处理
  setupGlobalErrorHandler(app);
  setupGlobalUncaughtHandlers();

  app.mount('#app');
}

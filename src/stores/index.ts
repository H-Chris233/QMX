import { createPinia } from 'pinia';

// 创建 Pinia 实例
const pinia = createPinia();

// 开发环境启用调试
if (import.meta.env.DEV) {
  pinia.use(() => {
    // 添加调试插件
    if (typeof window !== 'undefined' && (window as any).__PINIA_DEVTOOLS_GLOBAL_HOOK__) {
      (window as any).__PINIA_DEVTOOLS_GLOBAL_HOOK__.pinia = pinia;
    }
  });
}

export default pinia;

// 导出所有store
export * from './auth';
export * from './student';
export * from './transaction';
export * from './installment';
export * from './stats';
export * from './app';
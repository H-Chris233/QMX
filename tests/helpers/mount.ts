import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Component } from 'vue';

/**
 * 自定义 Vue Test Utils mount 助手
 * 
 * 提供预配置的：
 * - Pinia 状态管理
 * - 全局 stub（如需要）
 * - 其他通用 providers
 */

interface MountOptions {
  props?: Record<string, any>;
  slots?: Record<string, any>;
  global?: {
    stubs?: Record<string, any>;
    mocks?: Record<string, any>;
    provide?: Record<string, any>;
  };
}

/**
 * 创建配置了 Pinia 的挂载函数
 */
export function createMount() {
  return (component: Component, options?: MountOptions): VueWrapper<any> => {
    // 初始化或重用 Pinia 实例
    const pinia = createPinia();
    setActivePinia(pinia);

    const defaultOptions = {
      global: {
        plugins: [pinia],
        stubs: {
          // 可以在这里添加通用的 stub 组件
          // 例如：teleport: true
        },
        mocks: {},
        ...options?.global,
      },
      props: options?.props,
      slots: options?.slots,
    };

    return mount(component, defaultOptions);
  };
}

/**
 * 默认的 mount 函数
 */
export const mountWithPinia = createMount();

/**
 * 通用的组件测试工具函数
 */
export function waitForAsync(callback: () => void, timeout = 100): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      callback();
      resolve();
    }, timeout);
  });
}

/**
 * 查找组件并验证其存在
 */
export function expectComponent(wrapper: VueWrapper, selector: string): any {
  const component = wrapper.find(selector);
  expect(component.exists()).toBe(true);
  return component;
}

/**
 * 触发事件并等待异步操作完成
 */
export async function triggerAndWait(
  wrapper: VueWrapper,
  selector: string,
  eventName: string = 'click'
): Promise<void> {
  const element = wrapper.find(selector);
  await element.trigger(eventName);
  await wrapper.vm.$nextTick();
}

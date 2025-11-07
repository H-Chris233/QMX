import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { vi, expect } from 'vitest';
import type { Component } from 'vue';

/**
 * 自定义 Vue Test Utils mount 助手
 * 
 * 提供预配置的：
 * - Pinia 状态管理
 * - 全局 stub（如需要）
 * - 其他通用 providers
 * - 改进的异步处理
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
 * 等待所有 Promise 解析的辅助函数
 */
export const flushPromises = (): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, 0));

/**
 * 等待 Vue 的 nextTick 和 Promise 微任务队列清空
 */
export const waitForNextTick = async (): Promise<void> => {
  await nextTick();
  await flushPromises();
};

/**
 * 等待 DOM 更新完成的辅助函数
 */
export const waitForDOMUpdate = async (wrapper?: VueWrapper): Promise<void> => {
  await nextTick();
  await flushPromises();
  if (wrapper) {
    await wrapper.vm.$nextTick();
  }
};

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
          'router-link': true,
          'router-view': true,
        },
        mocks: {
          // 常用的全局 mock
          $router: {
            push: vi.fn(),
            replace: vi.fn(),
            go: vi.fn(),
            back: vi.fn(),
            forward: vi.fn(),
          },
          $route: {
            path: '/',
            query: {},
            params: {},
            name: 'test',
          },
          ...options?.global?.mocks,
        },
        ...options?.global,
      },
      props: options?.props,
      slots: options?.slots,
      attachTo: document.body, // 确保组件挂载到 DOM 中
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
  await waitForDOMUpdate(wrapper);
}

/**
 * 等待元素出现
 */
export async function waitForElement(
  wrapper: VueWrapper,
  selector: string,
  timeout = 5000
): Promise<any> {
  return vi.waitFor(
    () => {
      const element = wrapper.find(selector);
      if (element.exists()) {
        return element;
      }
      throw new Error(`Element ${selector} not found`);
    },
    { timeout }
  );
}

/**
 * 等待文本出现
 */
export async function waitForText(
  wrapper: VueWrapper,
  text: string,
  timeout = 5000
): Promise<void> {
  await vi.waitFor(
    () => {
      expect(wrapper.text()).toContain(text);
    },
    { timeout }
  );
}

/**
 * 模拟用户输入
 */
export async function simulateInput(
  wrapper: VueWrapper,
  selector: string,
  value: string
): Promise<void> {
  const element = wrapper.find(selector);
  await element.setValue(value);
  await element.trigger('input');
  await waitForDOMUpdate(wrapper);
}

/**
 * 创建测试专用的 setTimeout mock
 */
export const createMockTimer = () => {
  vi.useFakeTimers();
  return {
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    runAllAsync: () => vi.runAllTimersAsync(),
    restore: () => vi.useRealTimers(),
  };
};

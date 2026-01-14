/**
 * ErrorBoundary 组件单元测试
 *
 * 测试覆盖：
 * 1. 正常渲染子组件
 * 2. 错误捕获
 * 3. 错误信息显示
 * 4. 重试功能
 * 5. 重置页面功能
 * 6. 自定义props
 * 7. 回调函数
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountWithPinia, waitForDOMUpdate } from './test-utils';
import ErrorBoundary from '../ErrorBoundary.vue';

// 测试用子组件
const TestChildComponent = {
  name: 'TestChild',
  template: '<div>Child Component</div>'
};

// 测试用会崩溃的子组件
const CrashingChildComponent = {
  name: 'CrashingChild',
  template: '<div>crash</div>',
  setup() {
    throw new Error('Crash');
  }
};

const CrashingChildStub = {
  template: '<div>crash</div>',
  setup() {
    throw new Error('Crash');
  }
};
describe('ErrorBoundary', () => {
  let wrapper: ReturnType<typeof mountWithPinia>;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('1. 正常渲染', () => {
    it('应该正常渲染子组件', () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<div>Test Content</div>'
        }
      });

      const content = wrapper.text();
      expect(content).toContain('Test Content');
    });

    it('应该渲染插槽内容', () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<button>Click me</button>'
        }
      });

      const button = wrapper.find('button');
      expect(button.exists()).toBe(true);
    });

    it('无错误时应该显示hasError为false', () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<span>Normal</span>'
        }
      });

      // 不应该显示错误界面
      const errorFallback = wrapper.find('.error-boundary-fallback');
      expect(errorFallback.exists()).toBe(false);
    });
  });

  describe('2. 错误捕获', () => {
    it('应该捕获子组件错误并显示错误界面', async () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      // 等待错误被捕获
      await waitForDOMUpdate();

      const errorFallback = wrapper.find('.error-boundary-fallback');
      expect(errorFallback.exists()).toBe(true);
    });

    it('错误后应该显示错误图标', async () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const errorIcon = wrapper.find('.error-icon');
      expect(errorIcon.exists()).toBe(true);
      expect(errorIcon.text()).toBe('⚠️');
    });

    it('错误后应该显示错误标题', async () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const errorTitle = wrapper.find('.error-title');
      expect(errorTitle.exists()).toBe(true);
    });

    it('错误后应该显示默认错误消息', async () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const errorMessage = wrapper.find('.error-message');
      expect(errorMessage.exists()).toBe(true);
    });
  });

  describe('3. 自定义错误信息', () => {
    it('应该使用自定义错误标题', async () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        props: {
          fallbackTitle: '自定义错误标题'
        },
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const errorTitle = wrapper.find('.error-title');
      expect(errorTitle.text()).toBe('自定义错误标题');
    });

    it('应该使用自定义错误消息', async () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        props: {
          fallbackMessage: '这是一个自定义错误消息'
        },
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const errorMessage = wrapper.find('.error-message');
      expect(errorMessage.text()).toBe('这是一个自定义错误消息');
    });

    it('应该显示错误消息中的错误详情', async () => {
      const errorMessage = 'Test error message';
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: {
              template: '<div>{{ throwError }}</div>',
              setup() {
                throw new Error(errorMessage);
              }
            }
          }
        }
      });

      await waitForDOMUpdate();

      const errMsg = wrapper.find('.error-message');
      expect(errMsg.text()).toContain(errorMessage);
    });
  });

  describe('4. 重试功能', () => {
    it('应该显示重试按钮', async () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const retryBtn = wrapper.find('.btn-retry');
      expect(retryBtn.exists()).toBe(true);
      expect(retryBtn.text()).toBe('重试');
    });

    it('点击重试应该清除错误状态', async () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      // 验证错误界面存在
      expect(wrapper.find('.error-boundary-fallback').exists()).toBe(true);

      // 点击重试
      const retryBtn = wrapper.find('.btn-retry');
      await retryBtn.trigger('click');

      // 错误界面应该消失
      const errorFallback = wrapper.find('.error-boundary-fallback');
      expect(errorFallback.exists()).toBe(false);
    });

    it('重试后应该回调onRetry函数', async () => {
      const onRetry = vi.fn();

      wrapper = mountWithPinia(ErrorBoundary, {
        props: { onRetry },
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const retryBtn = wrapper.find('.btn-retry');
      await retryBtn.trigger('click');

      expect(onRetry).toHaveBeenCalled();
    });
  });

  describe('5. 重置页面功能', () => {
    it('应该显示重置页面按钮', async () => {
      const reloadMock = vi.fn();
      window.location.reload = reloadMock;

      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const resetBtn = wrapper.find('.btn-reset');
      expect(resetBtn.exists()).toBe(true);
      expect(resetBtn.text()).toBe('重置页面');
    });

    it('点击重置页面应该调用location.reload', async () => {
      const reloadMock = vi.fn();
      window.location.reload = reloadMock;

      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const resetBtn = wrapper.find('.btn-reset');
      await resetBtn.trigger('click');

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe('6. 错误详情（开发环境）', () => {
    it('开发环境应该显示错误详情展开区域', async () => {
      // 需要模拟开发环境
      import.meta.env = { ...import.meta.env, DEV: true };

      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: {
              template: '<div>crash</div>',
              setup() {
                throw new Error('Test error');
              }
            }
          }
        }
      });

      await waitForDOMUpdate();

      const errorDetails = wrapper.find('.error-details');
      expect(errorDetails.exists()).toBe(true);

      const summary = wrapper.find('.error-details summary');
      expect(summary.text()).toContain('查看详细错误信息');
    });
  });

  describe('7. 错误回调', () => {
    it('错误时应该调用onError回调', async () => {
      const onError = vi.fn();
      const errorInfo = 'componentRenderError';

      wrapper = mountWithPinia(ErrorBoundary, {
        props: { onError },
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      expect(onError).toHaveBeenCalled();
      // 回调应该接收错误对象和info字符串
      const call = onError.mock.calls[0];
      expect(call[0]).toBeInstanceOf(Error);
      expect(typeof call[1]).toBe('string');
    });
  });

  describe('8. 边界条件', () => {
    it('应该处理onError为undefined的情况', async () => {
      wrapper = mountWithPinia(ErrorBoundary, {
        props: { onError: undefined },
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      // 不应该崩溃
      await waitForDOMUpdate();
      expect(wrapper.find('.error-boundary-fallback').exists()).toBe(true);
    });

    it('应该处理onRetry为undefined的情况', async () => {
      const reloadMock = vi.fn();
      window.location.reload = reloadMock;

      wrapper = mountWithPinia(ErrorBoundary, {
        props: { onRetry: undefined },
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: CrashingChildStub
          }
        }
      });

      await waitForDOMUpdate();

      const retryBtn = wrapper.find('.btn-retry');
      await retryBtn.trigger('click');

      // 应该清除错误但不调用undefined的回调
      expect(wrapper.find('.error-boundary-fallback').exists()).toBe(false);
    });

    it('重试后子组件应该能正常渲染', async () => {
      let shouldCrash = true;

      wrapper = mountWithPinia(ErrorBoundary, {
        slots: {
          default: '<CrashingChild />'
        },
        global: {
          stubs: {
            CrashingChild: {
              template: '<div>crash</div>',
              setup() {
                if (shouldCrash) {
                  throw new Error('Crash');
                }
                return {};
              }
            }
          }
        }
      });

      await waitForDOMUpdate();

      // 先有错误
      expect(wrapper.find('.error-boundary-fallback').exists()).toBe(true);

      // 重试后清除错误
      shouldCrash = false;
      const retryBtn = wrapper.find('.btn-retry');
      await retryBtn.trigger('click');

      // 错误界面消失
      expect(wrapper.find('.error-boundary-fallback').exists()).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import ErrorModal from '../ErrorModal.vue';
// 测试助手通过 tests 目录相对路径导入
import { mountWithPinia } from '../../../tests/helpers/mount';

describe('ErrorModal Component', () => {
  it('应该正确渲染错误模态框', async () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: true,
        title: '错误',
        message: '测试错误消息',
      },
    });

    expect(wrapper.find('.error-modal-overlay').exists()).toBe(true);
    expect(wrapper.find('.error-modal').exists()).toBe(true);
    expect(wrapper.text()).toContain('测试错误消息');
  });

  it('当 show 为 false 时应该不显示', async () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: false,
        message: '测试错误消息',
      },
    });

    expect(wrapper.find('.error-modal-overlay').exists()).toBe(false);
  });

  it('应该触发 close 事件', async () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: true,
        message: '测试错误消息',
      },
    });

    await wrapper.find('.error-btn.primary').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('当有 retry 按钮时应该显示', async () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: true,
        message: '测试错误消息',
        showRetry: true,
      },
    });

    const retryBtn = wrapper.find('.error-btn.secondary');
    expect(retryBtn.exists()).toBe(true);
  });

  it('应该触发 retry 事件', async () => {
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: true,
        message: '测试错误消息',
        showRetry: true,
      },
    });

    await wrapper.find('.error-btn.secondary').trigger('click');
    expect(wrapper.emitted('retry')).toBeTruthy();
  });

  it('应该显示详细信息', async () => {
    const details = '这是详细的错误信息';
    const wrapper = mountWithPinia(ErrorModal, {
      props: {
        show: true,
        message: '测试错误消息',
        details,
      },
    });

    expect(wrapper.find('.error-details').exists()).toBe(true);
    expect(wrapper.text()).toContain(details);
  });
});

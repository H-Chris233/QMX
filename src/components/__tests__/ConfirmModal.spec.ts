/**
 * ConfirmModal 组件单元测试
 *
 * 测试覆盖：
 * 1. 基本渲染
 * 2. 确认/取消操作
 * 3. 自定义按钮文本
 * 4. 危险操作样式
 * 5. 键盘事件
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountWithPinia, waitForDOMUpdate, createMockConfirmState } from './test-utils';
import ConfirmModal from '../ConfirmModal.vue';
import { useAppStore } from '../../stores/app';

describe('ConfirmModal', () => {
  let wrapper: ReturnType<typeof mountWithPinia>;
  let appStore: ReturnType<typeof useAppStore>;

  beforeEach(() => {
    wrapper = mountWithPinia(ConfirmModal);
    appStore = useAppStore();
    // 初始化确认弹窗状态
    appStore.confirmModal = createMockConfirmState();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('1. 基本渲染', () => {
    it('应该在show为false时隐藏弹窗', async () => {
      appStore.confirmModal = createMockConfirmState({ show: false });

      await waitForDOMUpdate();

      const modal = wrapper.find('.confirm-modal-overlay');
      expect(modal.exists()).toBe(false);
    });

    it('应该在show为true时显示弹窗', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true,
        title: '确认删除',
        message: '确定要删除吗？'
      });

      await waitForDOMUpdate();

      const modal = wrapper.find('.confirm-modal-overlay');
      expect(modal.exists()).toBe(true);

      const title = wrapper.find('.modal-title');
      expect(title.text()).toBe('确认删除');

      const message = wrapper.find('.modal-message');
      expect(message.text()).toBe('确定要删除吗？');
    });

    it('应该显示默认标题（未设置时）', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true,
        title: '',
        message: '测试消息'
      });

      await waitForDOMUpdate();

      const title = wrapper.find('.modal-title');
      expect(title.text()).toBe('');
    });
  });

  describe('2. 按钮渲染', () => {
    it('应该显示默认按钮文本', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true,
        confirmText: '确定',
        cancelText: '取消'
      });

      await waitForDOMUpdate();

      const confirmBtn = wrapper.find('.confirm-btn');
      const cancelBtn = wrapper.find('.cancel-btn');

      expect(confirmBtn.text()).toBe('确定');
      expect(cancelBtn.text()).toBe('取消');
    });

    it('应该显示自定义按钮文本', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true,
        confirmText: '删除',
        cancelText: '关闭'
      });

      await waitForDOMUpdate();

      const confirmBtn = wrapper.find('.confirm-btn');
      const cancelBtn = wrapper.find('.cancel-btn');

      expect(confirmBtn.text()).toBe('删除');
      expect(cancelBtn.text()).toBe('关闭');
    });
  });

  describe('3. 确认操作', () => {
    it('应该在点击确认按钮时调用onConfirm', async () => {
      const onConfirm = vi.fn();
      appStore.confirmModal = createMockConfirmState({
        show: true,
        onConfirm
      });

      await waitForDOMUpdate();

      const confirmBtn = wrapper.find('.confirm-btn');
      await confirmBtn.trigger('click');

      expect(onConfirm).toHaveBeenCalled();
      expect(appStore.confirmModal.show).toBe(false);
    });

    it('应该在确认后隐藏弹窗', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true
      });

      await waitForDOMUpdate();

      const confirmBtn = wrapper.find('.confirm-btn');
      await confirmBtn.trigger('click');

      expect(appStore.confirmModal.show).toBe(false);
    });

    it('应该在没有onConfirm时只关闭弹窗', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true,
        onConfirm: null
      });

      await waitForDOMUpdate();

      const confirmBtn = wrapper.find('.confirm-btn');
      await confirmBtn.trigger('click');

      expect(appStore.confirmModal.show).toBe(false);
    });
  });

  describe('4. 取消操作', () => {
    it('应该在点击取消按钮时调用onCancel', async () => {
      const onCancel = vi.fn();
      appStore.confirmModal = createMockConfirmState({
        show: true,
        onCancel
      });

      await waitForDOMUpdate();

      const cancelBtn = wrapper.find('.cancel-btn');
      await cancelBtn.trigger('click');

      expect(onCancel).toHaveBeenCalled();
      expect(appStore.confirmModal.show).toBe(false);
    });

    it('应该在取消后隐藏弹窗', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true
      });

      await waitForDOMUpdate();

      const cancelBtn = wrapper.find('.cancel-btn');
      await cancelBtn.trigger('click');

      expect(appStore.confirmModal.show).toBe(false);
    });
  });

  describe('5. 危险操作样式', () => {
    it('应该在confirmType为danger时应用危险样式', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true,
        confirmType: 'danger'
      });

      await waitForDOMUpdate();

      const confirmBtn = wrapper.find('.confirm-btn.danger');
      expect(confirmBtn.exists()).toBe(true);
    });

    it('应该在confirmType为warning时应用警告样式', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true,
        confirmType: 'warning'
      });

      await waitForDOMUpdate();

      const confirmBtn = wrapper.find('.confirm-btn.warning');
      expect(confirmBtn.exists()).toBe(true);
    });

    it('应该在confirmType为primary时应用主要样式', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true,
        confirmType: 'primary'
      });

      await waitForDOMUpdate();

      const confirmBtn = wrapper.find('.confirm-btn.primary');
      expect(confirmBtn.exists()).toBe(true);
    });
  });

  describe('6. 键盘事件', () => {
    it('应该在点击遮罩层时取消', async () => {
      const onCancel = vi.fn();
      appStore.confirmModal = createMockConfirmState({
        show: true,
        onCancel
      });

      await waitForDOMUpdate();

      const overlay = wrapper.find('.confirm-modal-overlay');
      await overlay.trigger('click');

      expect(appStore.confirmModal.show).toBe(false);
    });

    it('不应该在点击弹窗内容时取消', async () => {
      appStore.confirmModal = createMockConfirmState({
        show: true
      });

      await waitForDOMUpdate();

      const content = wrapper.find('.modal-content');
      await content.trigger('click');

      expect(appStore.confirmModal.show).toBe(true);
    });
  });

  describe('7. AppStore集成', () => {
    it('应该响应store状态变化显示/隐藏', async () => {
      expect(wrapper.find('.confirm-modal-overlay').exists()).toBe(false);

      appStore.showConfirm({
        title: '测试',
        message: '消息'
      });

      await waitForDOMUpdate();
      expect(wrapper.find('.confirm-modal-overlay').exists()).toBe(true);

      appStore.hideConfirm();
      await waitForDOMUpdate();
      expect(wrapper.find('.confirm-modal-overlay').exists()).toBe(false);
    });

    it('应该正确处理确认回调', async () => {
      const onConfirm = vi.fn();

      appStore.showConfirm({
        title: '测试',
        message: '消息',
        onConfirm
      });

      await waitForDOMUpdate();

      appStore.handleConfirm();
      await waitForDOMUpdate();

      expect(onConfirm).toHaveBeenCalled();
      expect(appStore.confirmModal.show).toBe(false);
    });

    it('应该正确处理取消回调', async () => {
      const onCancel = vi.fn();

      appStore.showConfirm({
        title: '测试',
        message: '消息',
        onCancel
      });

      await waitForDOMUpdate();

      appStore.handleCancel();
      await waitForDOMUpdate();

      expect(onCancel).toHaveBeenCalled();
      expect(appStore.confirmModal.show).toBe(false);
    });
  });
});

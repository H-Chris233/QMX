/**
 * App Store 单元测试
 *
 * 测试覆盖：
 * 1. 加载状态管理
 * 2. 错误处理
 * 3. 确认弹窗操作
 * 4. 主题管理
 * 5. 网络状态
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAppStore } from '../app';

// 创建测试专用的Pinia实例
function createTestPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return pinia;
}

describe('useAppStore', () => {
  let pinia: ReturnType<typeof createPinia>;
  let store: ReturnType<typeof useAppStore>;

  beforeEach(() => {
    pinia = createTestPinia();
    vi.useRealTimers();
    vi.useFakeTimers();
    // 模拟 localStorage
    vi.spyOn(localStorage, 'getItem').mockImplementation((key) => {
      if (key === 'theme') return null;
      return null;
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {});
    vi.spyOn(document.documentElement, 'classList', 'get').mockReturnValue({
      contains: () => false,
      add: vi.fn(),
      remove: vi.fn()
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('1. 加载状态管理', () => {
    it('应该正确初始化加载状态', () => {
      store = useAppStore();
      expect(store.loading.global).toBe(false);
      expect(store.loading.api).toEqual({});
      expect(store.loading.components).toEqual({});
    });

    it('应该正确设置全局加载状态', () => {
      store = useAppStore();
      store.setGlobalLoading(true);
      expect(store.loading.global).toBe(true);

      store.setGlobalLoading(false);
      expect(store.loading.global).toBe(false);
    });

    it('应该正确设置API加载状态', () => {
      store = useAppStore();
      store.setApiLoading('students', true);
      expect(store.loading.api.students).toBe(true);

      store.setApiLoading('students', false);
      expect(store.loading.api.students).toBe(false);
    });

    it('应该正确设置组件加载状态', () => {
      store = useAppStore();
      store.setComponentLoading('dashboard', true);
      expect(store.loading.components.dashboard).toBe(true);

      store.setComponentLoading('dashboard', false);
      expect(store.loading.components.dashboard).toBe(false);
    });

    it('应该正确清除所有加载状态', () => {
      store = useAppStore();
      store.setGlobalLoading(true);
      store.setApiLoading('test', true);
      store.setComponentLoading('test', true);

      store.clearLoading();

      expect(store.loading.global).toBe(false);
      expect(store.loading.api).toEqual({});
      expect(store.loading.components).toEqual({});
    });

    it('isLoading getter应该在有任一加载状态时返回true', () => {
      store = useAppStore();

      expect(store.isLoading).toBe(false);

      store.setGlobalLoading(true);
      expect(store.isLoading).toBe(true);

      store.setGlobalLoading(false);
      store.setApiLoading('students', true);
      expect(store.isLoading).toBe(true);
    });
  });

  describe('2. 错误处理', () => {
    it('应该正确添加错误信息', () => {
      store = useAppStore();
      expect(store.errors.length).toBe(0);

      store.addError({
        message: '测试错误',
        code: 'TEST_ERROR'
      });

      expect(store.errors.length).toBe(1);
      expect(store.errors[0].message).toBe('测试错误');
      expect(store.errors[0].code).toBe('TEST_ERROR');
      expect(store.errors[0].timestamp).toBeInstanceOf(Date);
    });

    it('should correctly add error with context', () => {
      store = useAppStore();
      store.addError({
        message: 'Network request failed',
        context: 'fetchStudents'
      });

      expect(store.errors[0].context).toBe('fetchStudents');
    });

    it('应该限制错误列表最多50条', () => {
      store = useAppStore();

      // 添加51条错误
      for (let i = 0; i < 51; i++) {
        store.addError({ message: `Error ${i}` });
      }

      expect(store.errors.length).toBe(50);
      expect(store.errors[0].message).toBe('Error 1'); // 第一条被移除
      expect(store.errors[49].message).toBe('Error 50');
    });

    it('应该正确判断是否有错误', () => {
      store = useAppStore();
      expect(store.hasErrors).toBe(false);

      store.addError({ message: 'Test error' });
      expect(store.hasErrors).toBe(true);
    });

    it('should correctly return latest error', () => {
      store = useAppStore();
      expect(store.latestError).toBeNull();

      store.addError({ message: 'First error' });
      store.addError({ message: 'Second error' });

      expect(store.latestError?.message).toBe('Second error');
    });

    it('应该正确移除指定索引的错误', () => {
      store = useAppStore();
      store.addError({ message: 'Error 1' });
      store.addError({ message: 'Error 2' });
      store.addError({ message: 'Error 3' });

      store.removeError(1);

      expect(store.errors.length).toBe(2);
      expect(store.errors[0].message).toBe('Error 1');
      expect(store.errors[1].message).toBe('Error 3');
    });

    it('应该正确清空所有错误', () => {
      store = useAppStore();
      store.addError({ message: 'Error 1' });
      store.addError({ message: 'Error 2' });

      store.clearErrors();

      expect(store.errors.length).toBe(0);
      expect(store.hasErrors).toBe(false);
    });
  });

  describe('3. 确认弹窗操作', () => {
    it('应该正确初始化确认弹窗状态', () => {
      store = useAppStore();
      expect(store.confirmModal.show).toBe(false);
      expect(store.confirmModal.title).toBe('');
      expect(store.confirmModal.message).toBe('');
    });

    it('应该正确显示确认弹窗', () => {
      store = useAppStore();

      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      store.showConfirm({
        title: '确认删除',
        message: '确定要删除这个学员吗？',
        confirmText: '删除',
        cancelText: '取消',
        confirmType: 'danger',
        onConfirm,
        onCancel
      });

      expect(store.confirmModal.show).toBe(true);
      expect(store.confirmModal.title).toBe('确认删除');
      expect(store.confirmModal.message).toBe('确定要删除这个学员吗？');
      expect(store.confirmModal.confirmText).toBe('删除');
      expect(store.confirmModal.cancelText).toBe('取消');
      expect(store.confirmModal.confirmType).toBe('danger');
      expect(store.confirmModal.onConfirm).toBe(onConfirm);
      expect(store.confirmModal.onCancel).toBe(onCancel);
    });

    it('应该使用默认值显示确认弹窗', () => {
      store = useAppStore();

      store.showConfirm({
        title: '测试确认',
        message: '这是一条测试消息'
      });

      expect(store.confirmModal.confirmText).toBe('确定');
      expect(store.confirmModal.cancelText).toBe('取消');
      expect(store.confirmModal.confirmType).toBe('primary');
    });

    it('应该正确隐藏确认弹窗', () => {
      store = useAppStore();
      store.showConfirm({
        title: '测试',
        message: '消息'
      });

      store.hideConfirm();

      expect(store.confirmModal.show).toBe(false);
    });

    it('should correctly handle confirm action', () => {
      store = useAppStore();
      const onConfirm = vi.fn();

      store.showConfirm({
        title: '测试',
        message: '消息',
        onConfirm
      });

      store.handleConfirm();

      expect(onConfirm).toHaveBeenCalled();
      expect(store.confirmModal.show).toBe(false);
    });

    it('should correctly handle cancel action', () => {
      store = useAppStore();
      const onCancel = vi.fn();

      store.showConfirm({
        title: '测试',
        message: '消息',
        onCancel
      });

      store.handleCancel();

      expect(onCancel).toHaveBeenCalled();
      expect(store.confirmModal.show).toBe(false);
    });
  });

  describe('4. 主题管理', () => {
    it('应该初始化默认主题', () => {
      store = useAppStore();
      expect(store.theme).toBe('dark');
    });

    it('应该正确设置主题', () => {
      store = useAppStore();

      store.setTheme('light');

      expect(store.theme).toBe('light');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    it('should persist theme to localStorage', () => {
      store = useAppStore();
      store.setTheme('light');

      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });
  });

  describe('5. 网络状态', () => {
    it('应该正确初始化在线状态', () => {
      store = useAppStore();
      expect(store.isOnline).toBe(true);
    });

    it('应该正确设置在线状态', () => {
      store = useAppStore();

      store.setOnlineStatus(false);

      expect(store.isOnline).toBe(false);
    });
  });

  describe('6. 系统信息', () => {
    it('应该正确初始化系统信息', () => {
      store = useAppStore();
      expect(store.systemInfo.version).toBe('0.12.1');
      expect(store.systemInfo.lastUpdated).toBeNull();
    });

    it('应该正确更新系统信息', () => {
      store = useAppStore();

      store.updateSystemInfo({
        adapterHealth: { status: 'healthy' }
      });

      expect(store.systemInfo.adapterHealth).toEqual({ status: 'healthy' });
      expect(store.systemInfo.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('7. 错误处理器便捷方法', () => {
    it('errorHandler.showError 应该添加错误', () => {
      store = useAppStore();

      store.errorHandler.showError('测试错误', '测试上下文');

      expect(store.errors.length).toBe(1);
      expect(store.errors[0].message).toBe('测试错误');
      expect(store.errors[0].context).toBe('测试上下文');
    });
  });

  describe('8. 刷新系统', () => {
    it('should refresh system and clear errors', async () => {
      store = useAppStore();
      store.addError({ message: 'Old error' });

      await store.refreshSystem();

      expect(store.errors.length).toBe(0);
      expect(store.loading.global).toBe(false);
      expect(store.systemInfo.lastUpdated).toBeInstanceOf(Date);
    });
  });
});

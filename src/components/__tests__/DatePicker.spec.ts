/**
 * DatePicker 组件单元测试
 *
 * 测试覆盖：
 * 1. 基本渲染
 * 2. 日期选择功能
 * 3. 日期预设（今天、明天、下周、下月）
 * 4. 日期验证
 * 5. 禁用状态
 * 6. 错误处理
 * 7. 事件发射
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountWithPinia, waitForDOMUpdate } from './test-utils';
import DatePicker from '../DatePicker.vue';

describe('DatePicker', () => {
  let wrapper: ReturnType<typeof mountWithPinia>;

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('1. 基本渲染', () => {
    it('应该渲染日期选择器容器', () => {
      wrapper = mountWithPinia(DatePicker);

      const container = wrapper.find('.input-wrapper');
      expect(container.exists()).toBe(true);
    });

    it('应该显示日历图标', () => {
      wrapper = mountWithPinia(DatePicker);

      const calendarIcon = wrapper.find('.text-icon');
      expect(calendarIcon.exists()).toBe(true);
    });

    it('应该渲染原生日期输入框', () => {
      wrapper = mountWithPinia(DatePicker);

      const dateInput = wrapper.find('.native-input');
      expect(dateInput.exists()).toBe(true);
    });

    it('应该显示标签（如果有）', () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { label: '开始日期' }
      });

      const label = wrapper.find('.input-label');
      expect(label.text()).toContain('开始日期');
    });
  });

  describe('2. 双向绑定', () => {
    it('应该正确响应外部modelValue变化', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { modelValue: '2024-03-15' }
      });

      await waitForDOMUpdate();

      const dateInput = wrapper.find('.native-input');
      expect((dateInput.element as HTMLInputElement).value).toBe('2024-03-15');
    });

    it('应该正确emit update:modelValue', async () => {
      wrapper = mountWithPinia(DatePicker);

      const dateInput = wrapper.find('.native-input');
      await dateInput.setValue('2024-03-15');

      const emitEvent = wrapper.emitted('update:modelValue');
      expect(emitEvent).toBeTruthy();
      expect(emitEvent[emitEvent.length - 1]).toEqual(['2024-03-15']);
    });
  });

  describe('3. 日期预设', () => {
    it('preset为today应该设置今天日期', async () => {
      const today = new Date().toISOString().split('T')[0];

      wrapper = mountWithPinia(DatePicker, {
        props: { preset: 'today' }
      });

      await waitForDOMUpdate();

      const emitEvent = wrapper.emitted('update:modelValue');
      expect(emitEvent).toBeTruthy();
      expect(emitEvent[emitEvent.length - 1][0]).toBe(today);
    });

    it('preset为tomorrow应该设置明天日期', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      wrapper = mountWithPinia(DatePicker, {
        props: { preset: 'tomorrow' }
      });

      await waitForDOMUpdate();

      const emitEvent = wrapper.emitted('update:modelValue');
      expect(emitEvent).toBeTruthy();
      expect(emitEvent[emitEvent.length - 1][0]).toBe(tomorrowStr);
    });

    it('preset为nextWeek应该设置7天后日期', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      wrapper = mountWithPinia(DatePicker, {
        props: { preset: 'nextWeek' }
      });

      await waitForDOMUpdate();

      const emitEvent = wrapper.emitted('update:modelValue');
      expect(emitEvent).toBeTruthy();
      expect(emitEvent[emitEvent.length - 1][0]).toBe(nextWeekStr);
    });

    it('preset为nextMonth应该设置30天后日期', async () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      wrapper = mountWithPinia(DatePicker, {
        props: { preset: 'nextMonth' }
      });

      await waitForDOMUpdate();

      const emitEvent = wrapper.emitted('update:modelValue');
      expect(emitEvent).toBeTruthy();
      expect(emitEvent[emitEvent.length - 1][0]).toBe(nextMonthStr);
    });

    it('已有值时不应该覆盖preset', async () => {
      const today = new Date().toISOString().split('T')[0];

      wrapper = mountWithPinia(DatePicker, {
        props: { modelValue: today, preset: 'tomorrow' }
      });

      await waitForDOMUpdate();

      // 不应该emit新的值
      const emitEvent = wrapper.emitted('update:modelValue');
      expect(emitEvent).toBeFalsy();
    });
  });

  describe('4. 日期验证', () => {
    it('required为true时空值应该显示错误', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { required: true, validateOnBlur: true }
      });

      const dateInput = wrapper.find('.native-input');
      await dateInput.setValue('');
      await dateInput.trigger('blur');

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-msg');
      expect(errorMsg.text()).toBe('此项为必填项');
    });

    it('minDate应该阻止选择更早的日期', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: {
          minDate: '2024-03-01',
          validateOnBlur: true
        }
      });

      const dateInput = wrapper.find('.native-input');
      await dateInput.setValue('2024-02-15');
      await dateInput.trigger('blur');

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-msg');
      expect(errorMsg.text()).toContain('不能早于');
    });

    it('maxDate应该阻止选择更晚的日期', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: {
          maxDate: '2024-03-31',
          validateOnBlur: true
        }
      });

      const dateInput = wrapper.find('.native-input');
      await dateInput.setValue('2024-04-15');
      await dateInput.trigger('blur');

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-msg');
      expect(errorMsg.text()).toContain('不能晚于');
    });

    it('无效日期格式应该显示错误', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { validateOnBlur: true }
      });

      // 设置无效日期值
      const input = wrapper.find('.native-input');
      await input.setValue('invalid-date');
      await input.trigger('blur');

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-msg');
      expect(errorMsg.text()).toBe('日期格式无效');
    });
  });

  describe('5. 禁用状态', () => {
    it('disabled为true时应该禁用输入框', () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { disabled: true }
      });

      const inputWrapper = wrapper.find('.input-wrapper');
      expect(inputWrapper.classes()).toContain('is-disabled');

      const dateInput = wrapper.find('.native-input');
      expect((dateInput.element as HTMLInputElement).disabled).toBe(true);
    });

    it('禁用状态下不应触发change事件', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { disabled: true }
      });

      const dateInput = wrapper.find('.native-input');
      await dateInput.setValue('2024-03-15');

      const emitEvent = wrapper.emitted('change');
      expect(emitEvent).toBeFalsy();
    });
  });

  describe('6. 事件发射', () => {
    it('change事件应该在值改变时发射', async () => {
      wrapper = mountWithPinia(DatePicker);

      const dateInput = wrapper.find('.native-input');
      await dateInput.setValue('2024-03-15');

      const emitEvent = wrapper.emitted('change');
      expect(emitEvent).toBeTruthy();
      expect(emitEvent[emitEvent.length - 1]).toEqual(['2024-03-15']);
    });

    it('blur事件应该在失去焦点时发射', async () => {
      wrapper = mountWithPinia(DatePicker);

      const dateInput = wrapper.find('.native-input');
      await dateInput.setValue('2024-03-15');
      await dateInput.trigger('blur');

      const emitEvent = wrapper.emitted('blur');
      expect(emitEvent).toBeTruthy();
      expect(emitEvent[emitEvent.length - 1]).toEqual(['2024-03-15']);
    });

    it('focus事件应该在获得焦点时发射', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { modelValue: '2024-03-15' }
      });

      const dateInput = wrapper.find('.native-input');
      await dateInput.trigger('focus');

      const emitEvent = wrapper.emitted('focus');
      expect(emitEvent).toBeTruthy();
    });
  });

  describe('7. 错误消息显示', () => {
    it('应该显示errorMessage props', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { errorMessage: '自定义错误信息' }
      });

      await waitForDOMUpdate();

      const errorMsg = wrapper.find('.error-msg');
      expect(errorMsg.text()).toBe('自定义错误信息');
    });

    it('错误状态应该有error图标', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { errorMessage: '错误' }
      });

      await waitForDOMUpdate();

      const errorIcon = wrapper.find('.status-icon.error');
      expect(errorIcon.exists()).toBe(true);
    });

    it('hasError computed应该正确反映状态', async () => {
      wrapper = mountWithPinia(DatePicker);

      const inputWrapper = wrapper.find('.input-wrapper');
      expect(inputWrapper.classes()).not.toContain('has-error');

      await wrapper.setProps({ errorMessage: '错误信息' });
      await waitForDOMUpdate();

      expect(inputWrapper.classes()).toContain('has-error');
    });
  });

  describe('8. 辅助文本', () => {
    it('应该显示helpText', () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { helpText: '这是帮助文本' }
      });

      const helpText = wrapper.find('.help-text');
      expect(helpText.text()).toBe('这是帮助文本');
    });

    it('有错误时不显示helpText', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { helpText: '帮助文本', errorMessage: '错误' }
      });

      await waitForDOMUpdate();

      const helpText = wrapper.find('.help-text');
      expect(helpText.exists()).toBe(false);
    });
  });

  describe('9. 无障碍属性', () => {
    it('应该有aria-label', () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { ariaLabel: '选择开始日期' }
      });

      const dateInput = wrapper.find('.native-input');
      expect(dateInput.attributes('aria-label')).toBe('选择开始日期');
    });

    it('有错误时应该有aria-invalid', async () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { errorMessage: '错误' }
      });

      await waitForDOMUpdate();

      const dateInput = wrapper.find('.native-input');
      expect(dateInput.attributes('aria-invalid')).toBe('true');
    });
  });

  describe('10. 边界条件', () => {
    it('应该处理null modelValue', () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { modelValue: null as any }
      });

      // 不应该崩溃
      expect(wrapper.find('.input-wrapper').exists()).toBe(true);
    });

    it('应该处理undefined modelValue', () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { modelValue: undefined as any }
      });

      // 不应该崩溃
      expect(wrapper.find('.input-wrapper').exists()).toBe(true);
    });

    it('应该处理空字符串modelValue', () => {
      wrapper = mountWithPinia(DatePicker, {
        props: { modelValue: '' }
      });

      // 不应该崩溃
      expect(wrapper.find('.input-wrapper').exists()).toBe(true);
    });
  });
});

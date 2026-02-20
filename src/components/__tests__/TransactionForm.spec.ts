/**
 * TransactionForm 组件单元测试
 *
 * 测试覆盖：
 * 1. 模式切换（普通交易/分期付款）
 * 2. 收支类型选择
 * 3. 学员关联
 * 4. 金额输入
 * 5. 分期计算
 * 6. 表单联动
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountWithPinia, waitForDOMUpdate, createMockStudent } from './test-utils';
import TransactionForm from '../TransactionForm.vue';
import type { TransactionFormModel } from '../../types/forms';
import { PaymentFrequency } from '../../types/api';

describe('TransactionForm', () => {
  let wrapper: ReturnType<typeof mountWithPinia>;
  let modelValue: TransactionFormModel;

  const createDefaultModel = (overrides: Partial<TransactionFormModel> = {}): TransactionFormModel => ({
    student_id: null,
    amount: null,
    note: '',
    is_expense: false,
    is_installment: false,
    total_amount: null,
    total_installments: null,
    frequency: null,
    custom_days: null,
    due_date: null,
    ...overrides
  });

  const students = [
    createMockStudent({ uid: 1, name: '张三' }),
    createMockStudent({ uid: 2, name: '李四' })
  ];

  beforeEach(() => {
    modelValue = createDefaultModel();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('1. 基本渲染', () => {
    it('应该渲染表单容器', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: {
          modelValue,
          students
        }
      });

      const container = wrapper.find('.transaction-form-container');
      expect(container.exists()).toBe(true);
    });

    it('应该渲染模式切换按钮', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const modeSwitcher = wrapper.find('.mode-switcher');
      expect(modeSwitcher.exists()).toBe(true);

      const buttons = wrapper.findAll('.mode-btn');
      expect(buttons.length).toBe(2);
      expect(buttons[0].text()).toContain('普通交易');
      expect(buttons[1].text()).toContain('分期付款');
    });

    it('应该默认选中普通交易模式', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const normalBtn = wrapper.find('.mode-btn:not(:last-child)');
      expect(normalBtn.classes()).toContain('active');
    });
  });

  describe('2. 模式切换', () => {
    it('点击分期付款按钮应该切换到分期模式', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const installmentBtn = wrapper.find('.mode-btn:last-child');
      await installmentBtn.trigger('click');

      const emitEvent = wrapper.emitted('update:modelValue');
      expect(emitEvent).toBeTruthy();

      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.is_installment).toBe(true);
      expect(newModel.frequency).toBe(PaymentFrequency.MONTHLY);
    });

    it('切换到分期模式应该初始化分期相关字段', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const installmentBtn = wrapper.find('.mode-btn:last-child');
      await installmentBtn.trigger('click');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;

      expect(newModel.total_amount).toBeNull();
      expect(newModel.total_installments).toBeNull();
      expect(newModel.due_date).toBeDefined();
    });

    it('点击普通交易按钮应该切换回普通模式', async () => {
      const installmentModel = createDefaultModel({ is_installment: true });

      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue: installmentModel, students }
      });

      const normalBtn = wrapper.find('.mode-btn:not(:last-child)');
      await normalBtn.trigger('click');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;

      expect(newModel.is_installment).toBe(false);
      expect(newModel.total_amount).toBeNull();
      expect(newModel.total_installments).toBeNull();
    });

    it('切换到普通模式应该清除分期相关字段', async () => {
      const installmentModel = createDefaultModel({
        is_installment: true,
        total_amount: 12000,
        total_installments: 12,
        frequency: PaymentFrequency.MONTHLY,
        due_date: '2024-03-01'
      });

      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue: installmentModel, students }
      });

      const normalBtn = wrapper.find('.mode-btn:not(:last-child)');
      await normalBtn.trigger('click');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;

      expect(newModel.frequency).toBeNull();
      expect(newModel.due_date).toBeNull();
    });
  });

  describe('3. 收支类型选择（普通交易模式）', () => {
    it('应该显示收入/支出选择器', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const typeSelector = wrapper.find('.type-selector');
      expect(typeSelector.exists()).toBe(true);

      const labels = wrapper.findAll('.radio-label');
      expect(labels.length).toBe(2);
      expect(labels[0].text()).toContain('收入');
      expect(labels[1].text()).toContain('支出');
    });

    it('默认应该选中收入', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const incomeLabel = wrapper.find('.radio-label.income');
      expect(incomeLabel.classes()).toContain('active');
    });

    it('点击支出应该更新为支出类型', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const expenseLabel = wrapper.find('.radio-label.expense');
      await expenseLabel.trigger('click');

      const emitEvent = wrapper.emitted('update:modelValue');
      expect(emitEvent).toBeTruthy();

      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.is_expense).toBe(true);
    });

    it('支出模式下金额输入框应该有红色样式', async () => {
      const expenseModel = createDefaultModel({ is_expense: true });

      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue: expenseModel, students }
      });

      const amountWrapper = wrapper.find('.amount-input-wrapper');
      expect(amountWrapper.classes()).toContain('expense-mode');
    });
  });

  describe('4. 学员关联', () => {
    it('应该渲染学员选择下拉框', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const select = wrapper.find('.student-select');
      expect(select.exists()).toBe(true);
    });

    it('应该显示"不关联学员"选项', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const options = wrapper.findAll('option');
      expect(options[0].text()).toContain('不关联学员');
    });

    it('应该显示学员列表', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const options = wrapper.findAll('option');
      expect(options[1].text()).toContain('张三');
      expect(options[2].text()).toContain('李四');
    });

    it('选择学员应该更新modelValue', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const select = wrapper.find('.student-select');
      await select.setValue('1');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.student_id).toBe(1);
    });

    it('切换到"不关联学员"应该设置student_id为null', async () => {
      const linkedModel = createDefaultModel({ student_id: 1 });

      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue: linkedModel, students }
      });

      const select = wrapper.find('.student-select');
      await select.setValue('null');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.student_id).toBeNull();
    });

    it('分期模式下不应显示"不关联学员"选项', () => {
      const installmentModel = createDefaultModel({ is_installment: true, student_id: null });

      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue: installmentModel, students }
      });

      const options = wrapper.findAll('option');
      expect(options.some(option => option.text().includes('不关联学员'))).toBe(false);
      expect(options[0]?.text()).toContain('请选择学员');
    });
  });

  describe('5. 金额输入（普通交易）', () => {
    it('应该渲染金额输入框', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const amountInput = wrapper.find('.amount-input');
      expect(amountInput.exists()).toBe(true);
    });

    it('应该显示人民币符号', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const currencySymbol = wrapper.find('.currency-symbol');
      expect(currencySymbol.text()).toContain('¥');
    });

    it('输入金额应该更新modelValue', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const amountInput = wrapper.find('.amount-input');
      await amountInput.setValue('100.50');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.amount).toBe(100.50);
    });

    it('应该处理无效输入', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const amountInput = wrapper.find('.amount-input');
      await amountInput.setValue('invalid');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.amount).toBeNull();
    });
  });

  describe('6. 备注输入', () => {
    it('应该渲染备注输入框', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const textarea = wrapper.find('.form-textarea');
      expect(textarea.exists()).toBe(true);
    });

    it('输入备注应该更新modelValue', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const textarea = wrapper.find('.form-textarea');
      await textarea.setValue('测试备注');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.note).toBe('测试备注');
    });
  });

  describe('7. 分期付款表单', () => {
    beforeEach(() => {
      modelValue = createDefaultModel({ is_installment: true });
    });

    it('分期模式下应该显示分期面板', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const installmentPanel = wrapper.find('.installment-panel');
      expect(installmentPanel.exists()).toBe(true);
    });

    it('应该渲染总金额输入', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const totalAmountInput = wrapper.find('input[type="number"]');
      expect(totalAmountInput.exists()).toBe(true);
    });

    it('应该渲染分期数输入', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const installmentsInput = wrapper.findAll('input[type="number"]')[1];
      expect(installmentsInput.exists()).toBe(true);
    });

    it('应该渲染付款频率选择', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const frequencySelect = wrapper.find('.frequency-select');
      expect(frequencySelect.exists()).toBe(true);

      const options = wrapper.findAll('option');
      expect(options.some(o => o.text().includes('每周'))).toBe(true);
      expect(options.some(o => o.text().includes('每月'))).toBe(true);
    });

    it('输入分期数应该更新modelValue', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const installmentsInput = wrapper.findAll('input[type="number"]')[1];
      await installmentsInput.setValue('12');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.total_installments).toBe(12);
    });

    it('分期数应该限制最小值为2', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const installmentsInput = wrapper.findAll('input[type="number"]')[1];
      await installmentsInput.setValue('1');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.total_installments).toBe(2);
    });
  });

  describe('8. 分期计算预览', () => {
    beforeEach(() => {
      modelValue = createDefaultModel({
        is_installment: true,
        total_amount: 12000,
        total_installments: 12
      });
    });

    it('应该显示每期应付金额', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const calcValue = wrapper.find('.calc-value');
      expect(calcValue.text()).toContain('1000.00');
    });

    it('应该显示分期总数', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const calcDesc = wrapper.find('.calc-desc');
      expect(calcDesc.text()).toContain('12');
      expect(calcDesc.text()).toContain('12000');
    });

    it('应该正确计算每期金额', () => {
      const testModel = createDefaultModel({
        is_installment: true,
        total_amount: 1000,
        total_installments: 4
      });

      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue: testModel, students }
      });

      const calcValue = wrapper.find('.calc-value');
      expect(calcValue.text()).toContain('250.00');
    });

    it('应该处理0分期数的情况', () => {
      const testModel = createDefaultModel({
        is_installment: true,
        total_amount: 1000,
        total_installments: 0
      });

      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue: testModel, students }
      });

      const calcValue = wrapper.find('.calc-value');
      expect(calcValue.text()).toContain('0.00');
    });
  });

  describe('9. 自定义付款频率', () => {
    beforeEach(() => {
      modelValue = createDefaultModel({
        is_installment: true,
        frequency: PaymentFrequency.CUSTOM,
        custom_days: 30
      });
    });

    it('选择自定义时应该显示间隔天数输入', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const customDaysInput = wrapper.find('input[placeholder="30"]');
      expect(customDaysInput.exists()).toBe(true);
    });

    it('切换到非自定义频率应该隐藏间隔天数输入', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const frequencySelect = wrapper.find('.frequency-select');
      await frequencySelect.setValue(PaymentFrequency.MONTHLY);

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.custom_days).toBeNull();
    });
  });

  describe('10. 首次到期日', () => {
    beforeEach(() => {
      modelValue = createDefaultModel({ is_installment: true });
    });

    it('应该渲染到期日输入', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const dateInput = wrapper.find('input[type="date"]');
      expect(dateInput.exists()).toBe(true);
    });

    it('输入到期日应该更新modelValue', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const dateInput = wrapper.find('input[type="date"]');
      await dateInput.setValue('2024-03-01');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.due_date).toBe('2024-03-01');
    });

    it('清空到期日应该设置null', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const dateInput = wrapper.find('input[type="date"]');
      await dateInput.setValue('');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.due_date).toBeNull();
    });
  });

  describe('11. 边界条件', () => {
    it('应该处理空学员列表', () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students: [] }
      });

      const select = wrapper.find('.student-select');
      expect(select.exists()).toBe(true);
    });

    it('应该处理负数金额', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const amountInput = wrapper.find('.amount-input');
      await amountInput.setValue('-100');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.amount).toBe(-100);
    });

    it('应该处理非常大的金额', async () => {
      wrapper = mountWithPinia(TransactionForm, {
        props: { modelValue, students }
      });

      const amountInput = wrapper.find('.amount-input');
      await amountInput.setValue('999999999');

      const emitEvent = wrapper.emitted('update:modelValue');
      const newModel = emitEvent[emitEvent.length - 1][0] as TransactionFormModel;
      expect(newModel.amount).toBe(999999999);
    });
  });
});

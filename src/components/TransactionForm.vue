<template>
  <div class="transaction-form-container">
    
    <!-- 顶部分段控制器：交易模式 -->
    <div class="mode-switcher">
      <button
        type="button"
        :class="['mode-btn', { active: !modelValue.is_installment }]"
        @click="setTransactionType(false)"
      >
        <Banknote :size="16" />
        普通交易
      </button>
      <button
        type="button"
        :class="['mode-btn', { active: modelValue.is_installment }]"
        @click="setTransactionType(true)"
      >
        <CreditCard :size="16" />
        分期付款
      </button>
    </div>

    <!-- 普通交易：收支类型 -->
    <div v-if="!modelValue.is_installment" class="form-group-inline mb-4">
      <div class="type-selector">
        <label class="radio-label income" :class="{ active: !modelValue.is_expense }" @click="setIncomeExpense(false)">
          <input 
            type="radio" 
            name="type" 
            :checked="!modelValue.is_expense" 
            @change="setIncomeExpense(false)" 
            class="hidden-radio"
          >
          <TrendingUp :size="16" />
          <span>收入</span>
        </label>
        <label class="radio-label expense" :class="{ active: modelValue.is_expense }" @click="setIncomeExpense(true)">
          <input 
            type="radio" 
            name="type" 
            :checked="modelValue.is_expense" 
            @change="setIncomeExpense(true)" 
            class="hidden-radio"
          >
          <TrendingDown :size="16" />
          <span>支出</span>
        </label>
      </div>
    </div>

    <!-- 关联学员 -->
    <div class="form-group">
      <label :class="['input-label', { required: modelValue.is_installment }]">
        <User :size="14" class="label-icon" /> 关联学员
        <span v-if="!modelValue.is_installment" class="badge-optional">可选</span>
        <span v-else class="badge-required">必选</span>
      </label>
      <div class="input-wrapper">
        <select
          :value="modelValue.student_id"
          @change="onStudentChange"
          class="form-select student-select"
        >
          <option v-if="modelValue.is_installment" :value="null" disabled>-- 请选择学员 --</option>
          <option v-else :value="null">-- 不关联学员 --</option>
          <option
            v-for="student in students"
            :key="student.uid"
            :value="student.uid"
          >
            {{ student.name }} (ID: {{ student.uid }})
          </option>
        </select>
        <ChevronDown :size="14" class="select-arrow" />
      </div>
    </div>

    <!-- ================= 普通交易表单 ================= -->
    <template v-if="!modelValue.is_installment">
      <div class="form-group">
        <label class="input-label required">交易金额</label>
        <div class="amount-input-wrapper" :class="modelValue.is_expense ? 'expense-mode' : 'income-mode'">
          <span class="currency-symbol">¥</span>
          <input
            type="number"
            :value="modelValue.amount ?? ''"
            @input="onAmountInput"
            placeholder="0"
            min="0"
            step="0.01"
            class="amount-input"
            required
          />
        </div>
      </div>

      <div class="form-group">
        <label class="input-label">备注说明</label>
        <div class="input-wrapper">
          <FileText :size="16" class="input-icon" />
          <textarea
            :value="modelValue.note"
            @input="onNoteInput"
            placeholder="填写交易详情..."
            rows="3"
            class="form-textarea"
          ></textarea>
        </div>
      </div>
    </template>

    <!-- ================= 分期付款表单 ================= -->
    <template v-else>
      <div class="installment-panel">
        <div class="form-group">
          <label class="input-label required">总金额</label>
          <div class="amount-input-wrapper income-mode">
            <span class="currency-symbol">¥</span>
            <input
              type="number"
              :value="modelValue.total_amount ?? ''"
              @input="onTotalAmountInput"
              placeholder="0"
              min="0"
              step="0.01"
              class="amount-input"
              required
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label class="input-label required">分期数</label>
            <div class="input-wrapper">
              <Layers :size="16" class="input-icon" />
              <input
                type="number"
                :value="modelValue.total_installments ?? ''"
                @input="onInstallmentsInput"
                placeholder="2"
                min="2"
                max="100"
                class="form-input"
                required
              />
            </div>
          </div>

          <div class="form-group half">
            <label class="input-label required">付款频率</label>
            <div class="input-wrapper">
              <Clock :size="16" class="input-icon" />
              <select
                :value="modelValue.frequency"
                @change="onFrequencyChange"
                class="form-select frequency-select pl-9"
              >
                <option :value="PaymentFrequency.WEEKLY">每周</option>
                <option :value="PaymentFrequency.MONTHLY">每月</option>
                <option :value="PaymentFrequency.QUARTERLY">每季度</option>
                <option :value="PaymentFrequency.CUSTOM">自定义</option>
              </select>
              <ChevronDown :size="14" class="select-arrow" />
            </div>
          </div>
        </div>

        <!-- 预览计算卡片 -->
        <div class="calculation-card">
          <div class="calc-row">
            <span class="calc-label">每期应付</span>
            <span class="calc-value">¥{{ calculateInstallmentAmount() }}</span>
          </div>
          <div class="calc-desc">
            共 {{ modelValue.total_installments ?? '--' }} 期，总计 ¥{{ modelValue.total_amount ?? 0 }}
          </div>
        </div>

        <!-- 自定义天数 -->
        <div v-if="modelValue.frequency === PaymentFrequency.CUSTOM" class="form-group">
          <label class="input-label required">间隔天数</label>
          <div class="input-wrapper">
            <Calendar :size="16" class="input-icon" />
            <input
              type="number"
              :value="modelValue.custom_days"
              @input="onCustomDaysInput"
              placeholder="30"
              min="1"
              max="365"
              class="form-input"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="input-label required">首次到期日</label>
          <div class="input-wrapper">
            <input
              type="date"
              :value="modelValue.due_date"
              @input="onDueDateInput"
              class="form-input date-input"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="input-label">备注说明</label>
          <div class="input-wrapper">
            <FileText :size="16" class="input-icon" />
            <textarea
              :value="modelValue.note"
              @input="onNoteInput"
              placeholder="填写分期详情..."
              rows="2"
              class="form-textarea"
            ></textarea>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Student } from '../types/api';
import { PaymentFrequency } from '../types/api';
import type { TransactionFormModel } from '../types/forms';
import { 
  Banknote, CreditCard, TrendingUp, TrendingDown, 
  User, ChevronDown, FileText, Layers, Clock, Calendar
} from 'lucide-vue-next';

interface Props {
  modelValue: TransactionFormModel;
  students: Student[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: TransactionFormModel): void;
}>();

const updateField = <K extends keyof TransactionFormModel>(
  field: K,
  value: TransactionFormModel[K],
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  });
};

const setTransactionType = (isInstallment: boolean) => {
  const today = new Date().toISOString().split('T')[0];
  const updated: TransactionFormModel = {
    ...props.modelValue,
    is_installment: isInstallment,
  };

  if (isInstallment) {
    const frequency = props.modelValue.frequency ?? PaymentFrequency.MONTHLY;
    updated.total_amount = props.modelValue.total_amount ?? props.modelValue.amount ?? null;
    updated.total_installments = props.modelValue.total_installments ?? null;
    updated.frequency = frequency;
    updated.custom_days =
      frequency === PaymentFrequency.CUSTOM ? props.modelValue.custom_days ?? 30 : null;
    updated.due_date = props.modelValue.due_date ?? today;
  } else {
    updated.total_amount = null;
    updated.total_installments = null;
    updated.frequency = null;
    updated.custom_days = null;
    updated.due_date = null;
  }
  emit('update:modelValue', updated);
};

const setIncomeExpense = (isExpense: boolean) => updateField('is_expense', isExpense);

const onStudentChange = (event: Event) => {
  const target = event.currentTarget as HTMLSelectElement | null;
  if (!target) return;
  const rawValue = target.value;
  if (rawValue === '' || rawValue === 'null') {
    updateField('student_id', null);
  } else {
    updateField('student_id', Number(rawValue));
  }
};

const onAmountInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  if (target.value.trim() === '') {
    updateField('amount', null);
    return;
  }
  const value = Number.parseFloat(target.value);
  updateField('amount', Number.isFinite(value) ? value : 0);
};

const onNoteInput = (event: Event) => {
  const target = event.currentTarget as HTMLTextAreaElement | null;
  if (!target) return;
  updateField('note', target.value);
};

const onTotalAmountInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  if (target.value.trim() === '') {
    updateField('total_amount', null);
    return;
  }
  const value = Number.parseFloat(target.value);
  updateField('total_amount', Number.isFinite(value) ? value : 0);
};

const onInstallmentsInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  if (target.value.trim() === '') {
    updateField('total_installments', null);
    return;
  }
  const value = Number.parseInt(target.value, 10);
  const sanitized = Number.isFinite(value) ? Math.max(2, value) : 2;
  updateField('total_installments', sanitized);
};

const onFrequencyChange = (event: Event) => {
  const target = event.currentTarget as HTMLSelectElement | null;
  if (!target) return;
  const frequency = target.value as PaymentFrequency;
  updateField('frequency', frequency);

  if (frequency !== PaymentFrequency.CUSTOM) {
    updateField('custom_days', null);
    return;
  }
  const currentDays = props.modelValue.custom_days ?? 30;
  updateField('custom_days', currentDays);
};

const onCustomDaysInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  const value = Number.parseInt(target.value, 10);
  const sanitized = Number.isFinite(value) && value > 0 ? value : 30;
  updateField('custom_days', sanitized);
};

const onDueDateInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  updateField('due_date', target.value ? target.value : null);
};

const calculateInstallmentAmount = (): string => {
  const total = props.modelValue.total_amount ?? 0;
  const installments = props.modelValue.total_installments;
  if (!installments) return '0.00';
  const perInstallment = total / installments;
  return Number.isFinite(perInstallment) ? perInstallment.toFixed(2) : '0.00';
};
</script>

<style scoped>
.transaction-form-container {
  padding: 0.5rem;
}

/* Mode Switcher */
.mode-switcher {
  display: flex;
  background-color: var(--bg-app);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  margin-bottom: 1.5rem;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  color: var(--text-primary);
}

.mode-btn.active {
  background-color: var(--bg-surface);
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  font-weight: 600;
}

/* Income/Expense Selector */
.type-selector {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.radio-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  cursor: pointer;
  background-color: var(--bg-app);
  color: var(--text-secondary);
  transition: all 0.2s;
  font-size: 0.9rem;
}

.hidden-radio {
  display: none;
}

.radio-label.income.active {
  background-color: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
  color: #10b981;
  font-weight: 600;
}

.radio-label.expense.active {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
  font-weight: 600;
}

/* Form Groups */
.form-group {
  margin-bottom: 1.25rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}
.half {
  flex: 1;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.4rem;
}

.label-icon {
  color: var(--text-secondary);
}

.required::after {
  content: '*';
  color: #ef4444;
  margin-left: 2px;
}

.badge-optional {
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  font-size: 0.7rem;
  padding: 0 4px;
  border-radius: 4px;
  margin-left: auto;
}

.badge-required {
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  font-size: 0.7rem;
  padding: 0 4px;
  border-radius: 4px;
  margin-left: auto;
}

/* Input Wrappers */
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.8rem;
  top: 0.8rem;
  color: var(--text-secondary);
  pointer-events: none;
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 0.6rem 1rem 0.6rem 2.4rem;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.form-select.pl-9 {
  padding-left: 2.4rem;
}

/* Select specific overrides if no icon */
.form-select:not(.pl-9) {
  padding-left: 1rem;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-textarea {
  padding-left: 2.4rem;
  min-height: 80px;
  resize: vertical;
}

.select-arrow {
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--text-secondary);
}

/* Amount Input Specifics */
.amount-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  background-color: var(--bg-app);
  overflow: hidden;
  transition: border-color 0.2s;
}

.amount-input-wrapper:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.currency-symbol {
  padding: 0 1rem;
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-secondary);
  background-color: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  height: 100%;
  display: flex;
  align-items: center;
}

.amount-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.75rem 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.amount-input:focus {
  outline: none;
}

.expense-mode:focus-within {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
.expense-mode .currency-symbol { color: #ef4444; }

.income-mode:focus-within {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
.income-mode .currency-symbol { color: #10b981; }

/* Installment Panel */
.installment-panel {
  background-color: rgba(255,255,255,0.02);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 1.25rem;
}

.calculation-card {
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.calc-label {
  font-size: 0.9rem;
  color: #f59e0b;
}

.calc-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #f59e0b;
}

.calc-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-align: right;
}

.date-input {
  padding-left: 1rem;
}
</style>

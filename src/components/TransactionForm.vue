<template>
  <div class="transaction-form">
    <!-- 交易类型切换 -->
    <div class="form-section">
      <label class="form-label">交易类型</label>
      <div class="button-group">
        <button
          type="button"
          :class="['btn-type', { active: !modelValue.is_installment }]"
          @click="setTransactionType(false)"
        >
          普通交易
        </button>
        <button
          type="button"
          :class="['btn-type', { active: modelValue.is_installment }]"
          @click="setTransactionType(true)"
        >
          分期付款
        </button>
      </div>
    </div>

    <!-- 收入/支出选择 (仅普通交易) -->
    <div v-if="!modelValue.is_installment" class="form-section">
      <label class="form-label">类型</label>
      <div class="button-group">
        <button
          type="button"
          :class="['btn-type', { active: !modelValue.is_expense }]"
          @click="setIncomeExpense(false)"
        >
          💰 收入
        </button>
        <button
          type="button"
          :class="['btn-type', { active: modelValue.is_expense }]"
          @click="setIncomeExpense(true)"
        >
          💸 支出
        </button>
      </div>
    </div>

    <!-- 学员选择 -->
    <div class="form-section">
      <label class="form-label" for="student-select">
        关联学员 <span class="optional">(可选)</span>
      </label>
      <select
        id="student-select"
        :value="modelValue.student_id"
        @change="onStudentChange"
        class="form-select"
      >
        <option :value="null">无关联学员</option>
        <option
          v-for="student in students"
          :key="student.uid"
          :value="student.uid"
        >
          {{ student.name }} (ID: {{ student.uid }})
        </option>
      </select>
    </div>

    <!-- 普通交易表单 -->
    <template v-if="!modelValue.is_installment">
      <div class="form-section">
        <label class="form-label" for="amount-input">
          金额 <span class="required">*</span>
        </label>
        <div class="input-group">
          <span class="input-prefix">¥</span>
          <input
            id="amount-input"
            type="number"
            :value="modelValue.amount"
            @input="onAmountInput"
            placeholder="请输入金额"
            min="0"
            step="0.01"
            class="form-input"
            required
          />
        </div>
      </div>

      <div class="form-section">
        <label class="form-label" for="note-input">
          备注 <span class="optional">(可选)</span>
        </label>
        <textarea
          id="note-input"
          :value="modelValue.note"
          @input="onNoteInput"
          placeholder="请输入备注信息"
          rows="3"
          class="form-textarea"
        ></textarea>
      </div>
    </template>

    <!-- 分期付款表单 -->
    <template v-else>
      <div class="form-section">
        <label class="form-label" for="total-amount-input">
          总金额 <span class="required">*</span>
        </label>
        <div class="input-group">
          <span class="input-prefix">¥</span>
          <input
            id="total-amount-input"
            type="number"
            :value="modelValue.total_amount"
            @input="onTotalAmountInput"
            placeholder="请输入总金额"
            min="0"
            step="0.01"
            class="form-input"
            required
          />
        </div>
      </div>

      <div class="form-section">
        <label class="form-label" for="installments-input">
          分期数 <span class="required">*</span>
        </label>
        <input
          id="installments-input"
          type="number"
          :value="modelValue.total_installments"
          @input="onInstallmentsInput"
          placeholder="请输入分期数"
          min="2"
          max="100"
          class="form-input"
          required
        />
        <div class="help-text">
          每期金额: ¥{{ calculateInstallmentAmount() }}
        </div>
      </div>

      <div class="form-section">
        <label class="form-label" for="frequency-select">
          付款频率 <span class="required">*</span>
        </label>
        <select
          id="frequency-select"
          :value="modelValue.frequency"
          @change="onFrequencyChange"
          class="form-select"
        >
          <option :value="PaymentFrequency.WEEKLY">每周</option>
          <option :value="PaymentFrequency.MONTHLY">每月</option>
          <option :value="PaymentFrequency.QUARTERLY">每季度</option>
          <option :value="PaymentFrequency.CUSTOM">自定义</option>
        </select>
      </div>

      <!-- 自定义频率 -->
      <div v-if="modelValue.frequency === PaymentFrequency.CUSTOM" class="form-section">
        <label class="form-label" for="custom-days-input">
          自定义天数 <span class="required">*</span>
        </label>
        <input
          id="custom-days-input"
          type="number"
          :value="modelValue.custom_days"
          @input="onCustomDaysInput"
          placeholder="请输入天数"
          min="1"
          max="365"
          class="form-input"
          required
        />
      </div>

      <div class="form-section">
        <label class="form-label" for="due-date-input">
          首次到期日 <span class="required">*</span>
        </label>
        <input
          id="due-date-input"
          type="date"
          :value="modelValue.due_date"
          @input="onDueDateInput"
          class="form-input"
          required
        />
      </div>

      <div class="form-section">
        <label class="form-label" for="installment-note-input">
          备注 <span class="optional">(可选)</span>
        </label>
        <textarea
          id="installment-note-input"
          :value="modelValue.note"
          @input="onNoteInput"
          placeholder="请输入备注信息"
          rows="3"
          class="form-textarea"
        ></textarea>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Student } from '../types/api';
import { PaymentFrequency } from '../types/api';
import type { TransactionFormModel } from '../types/forms';

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
    updated.total_amount = props.modelValue.total_amount ?? props.modelValue.amount;
    updated.total_installments = props.modelValue.total_installments ?? 2;
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

const setIncomeExpense = (isExpense: boolean) => {
  updateField('is_expense', isExpense);
};

const onStudentChange = (event: Event) => {
  const target = event.currentTarget as HTMLSelectElement | null;
  if (!target) return;
  const rawValue = target.value;
  if (rawValue === '' || rawValue === 'null') {
    updateField('student_id', null);
    return;
  }
  updateField('student_id', Number(rawValue));
};

const onAmountInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  const value = Number.parseFloat(target.value);
  updateField('amount', Number.isFinite(value) ? value : 0);
};

const onNoteInput = (event: Event) => {
  const target = event.currentTarget as HTMLTextAreaElement | HTMLInputElement | null;
  if (!target) return;
  updateField('note', target.value);
};

const onTotalAmountInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
  const value = Number.parseFloat(target.value);
  updateField('total_amount', Number.isFinite(value) ? value : 0);
};

const onInstallmentsInput = (event: Event) => {
  const target = event.currentTarget as HTMLInputElement | null;
  if (!target) return;
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
  const installments = props.modelValue.total_installments ?? 2;

  if (!installments) {
    return '0.00';
  }

  const perInstallment = total / installments;
  return Number.isFinite(perInstallment) ? perInstallment.toFixed(2) : '0.00';
};
</script>

<style scoped>
.transaction-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  font-size: 0.9rem;
  color: #333;
}

.required {
  color: #e74c3c;
  font-size: 0.8rem;
}

.optional {
  color: #999;
  font-size: 0.8rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

.btn-type {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #ddd;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.btn-type:hover {
  border-color: #3498db;
  background: #f8f9fa;
}

.btn-type.active {
  border-color: #3498db;
  background: #3498db;
  color: white;
  font-weight: 500;
}

.form-input,
.form-select,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
  font-family: inherit;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.input-group {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.input-group:focus-within {
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.input-prefix {
  padding: 0.75rem;
  background: #f8f9fa;
  border-right: 1px solid #ddd;
  font-weight: 500;
  color: #666;
}

.input-group .form-input {
  flex: 1;
  border: none;
  padding: 0.75rem;
}

.input-group .form-input:focus {
  box-shadow: none;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.help-text {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.25rem;
}

/* 禁用数字输入框的上下箭头 */
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type='number'] {
  -moz-appearance: textfield;
}
</style>

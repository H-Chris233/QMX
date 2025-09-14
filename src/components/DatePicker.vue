<template>
  <div class="date-picker-wrapper">
    <label v-if="label" :for="inputId" class="date-picker-label">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    
    <div class="date-picker-container" :class="{ 'has-error': hasError, 'disabled': disabled }">
      <input
        :id="inputId"
        v-model="internalValue"
        type="date"
        class="date-picker-input"
        :min="minDate"
        :max="maxDate"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-label="ariaLabel || label"
        :aria-describedby="hasError ? `${inputId}-error` : undefined"
        @input="handleInput"
        @change="handleChange"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      
      <div v-if="showCalendarIcon" class="date-picker-icon">
        📅
      </div>
    </div>
    
    <div v-if="hasError && errorMessage" :id="`${inputId}-error`" class="date-picker-error">
      {{ errorMessage }}
    </div>
    
    <div v-if="helpText && !hasError" class="date-picker-help">
      {{ helpText }}
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue';

export default {
  name: 'DatePicker',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    label: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    required: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    minDate: {
      type: String,
      default: '',
    },
    maxDate: {
      type: String,
      default: '',
    },
    errorMessage: {
      type: String,
      default: '',
    },
    helpText: {
      type: String,
      default: '',
    },
    showCalendarIcon: {
      type: Boolean,
      default: true,
    },
    ariaLabel: {
      type: String,
      default: '',
    },
    validateOnBlur: {
      type: Boolean,
      default: true,
    },
    // 预设日期选项
    preset: {
      type: String,
      default: '', // 'today', 'tomorrow', 'nextWeek', 'nextMonth'
    },
  },
  emits: ['update:modelValue', 'change', 'blur', 'focus', 'error'],
  setup(props, { emit }) {
    const inputId = ref(`date-picker-${Math.random().toString(36).substr(2, 9)}`);
    const internalValue = ref(props.modelValue);
    const isFocused = ref(false);
    
    // 计算属性
    const hasError = computed(() => Boolean(props.errorMessage));
    
    // 预设日期计算
    const getPresetDate = (preset) => {
      const today = new Date();
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      switch (preset) {
        case 'today':
          return formatDate(today);
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          return formatDate(tomorrow);
        case 'nextWeek':
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          return formatDate(nextWeek);
        case 'nextMonth':
          const nextMonth = new Date(today);
          nextMonth.setMonth(today.getMonth() + 1);
          return formatDate(nextMonth);
        default:
          return '';
      }
    };
    
    // 日期验证
    const validateDate = (value) => {
      if (!value) {
        return props.required ? '请选择日期' : '';
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return '请输入有效的日期';
      }
      
      if (props.minDate && value < props.minDate) {
        return `日期不能早于 ${formatDateForDisplay(props.minDate)}`;
      }
      
      if (props.maxDate && value > props.maxDate) {
        return `日期不能晚于 ${formatDateForDisplay(props.maxDate)}`;
      }
      
      return '';
    };
    
    // 格式化日期用于显示
    const formatDateForDisplay = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    // 获取今天的日期字符串
    const getTodayDate = () => {
      return new Date().toISOString().split('T')[0];
    };
    
    // 事件处理
    const handleInput = (event) => {
      const value = event.target.value;
      internalValue.value = value;
      emit('update:modelValue', value);
    };
    
    const handleChange = (event) => {
      const value = event.target.value;
      const error = validateDate(value);
      if (error) {
        emit('error', error);
      }
      emit('change', value);
    };
    
    const handleBlur = (event) => {
      isFocused.value = false;
      const value = event.target.value;
      
      if (props.validateOnBlur) {
        const error = validateDate(value);
        if (error) {
          emit('error', error);
        }
      }
      
      emit('blur', value);
    };
    
    const handleFocus = (event) => {
      isFocused.value = true;
      emit('focus', event.target.value);
    };
    
    // 监听外部值变化
    watch(() => props.modelValue, (newValue) => {
      internalValue.value = newValue;
    });
    
    // 监听预设值变化
    watch(() => props.preset, (newPreset) => {
      if (newPreset && !internalValue.value) {
        const presetDate = getPresetDate(newPreset);
        if (presetDate) {
          internalValue.value = presetDate;
          emit('update:modelValue', presetDate);
        }
      }
    }, { immediate: true });
    
    return {
      inputId,
      internalValue,
      isFocused,
      hasError,
      handleInput,
      handleChange,
      handleBlur,
      handleFocus,
      validateDate,
      formatDateForDisplay,
      getTodayDate,
    };
  },
};
</script>

<style scoped>
.date-picker-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.date-picker-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.required-asterisk {
  color: var(--accent-danger);
  margin-left: 0.25rem;
}

.date-picker-container {
  position: relative;
  display: flex;
  align-items: center;
}

.date-picker-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  transition: all 0.2s ease;
  outline: none;
}

.date-picker-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
  outline: none;
}

/* 移动端焦点样式 */
@media (max-width: 768px) {
  .date-picker-input:focus {
    box-shadow: 0 0 0 2px var(--accent-primary);
    transform: scale(1.02);
    transition: all 0.2s ease;
  }
}

.date-picker-input:disabled {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.date-picker-container.has-error .date-picker-input {
  border-color: var(--accent-danger);
}

.date-picker-container.has-error .date-picker-input:focus {
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.1);
}

.date-picker-container.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.date-picker-icon {
  position: absolute;
  right: 0.75rem;
  font-size: 1rem;
  color: var(--text-secondary);
  pointer-events: none;
  z-index: 1;
}

.date-picker-input::-webkit-calendar-picker-indicator {
  opacity: 0;
  position: absolute;
  right: 0;
  width: 2rem;
  height: 100%;
  cursor: pointer;
}

.date-picker-error {
  font-size: 0.75rem;
  color: var(--accent-danger);
  margin-top: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.date-picker-error::before {
  content: '⚠️';
  font-size: 0.875rem;
}

.date-picker-help {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

/* 主题适配 */
.light-theme .date-picker-input {
  background-color: #ffffff;
}

.dark-theme .date-picker-input {
  background-color: var(--bg-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .date-picker-wrapper {
    width: 100%;
  }
  
  .date-picker-input {
    padding: 0.875rem 1rem;
    font-size: 1rem; /* 防止iOS缩放 */
    min-height: 44px; /* iOS推荐的最小触摸目标 */
    border-radius: 8px;
  }
  
  .date-picker-icon {
    right: 0.875rem;
    font-size: 1.25rem;
  }
  
  .date-picker-label {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .date-picker-error,
  .date-picker-help {
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
}

@media (max-width: 480px) {
  .date-picker-input {
    padding: 1rem;
    font-size: 1.125rem;
    min-height: 48px;
    border-radius: 10px;
  }
  
  .date-picker-icon {
    right: 1rem;
    font-size: 1.5rem;
  }
  
  .date-picker-label {
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  .date-picker-error::before {
    font-size: 1rem;
  }
}

/* 自定义日期选择器样式 */
.date-picker-input::-webkit-datetime-edit {
  color: var(--text-primary);
}

.date-picker-input::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
}

.date-picker-input::-webkit-datetime-edit-text {
  color: var(--text-secondary);
  padding: 0 0.25rem;
}

.date-picker-input::-webkit-datetime-edit-month-field,
.date-picker-input::-webkit-datetime-edit-day-field,
.date-picker-input::-webkit-datetime-edit-year-field {
  color: var(--text-primary);
}

.date-picker-input::-webkit-inner-spin-button {
  display: none;
}

.date-picker-input::-webkit-clear-button {
  display: none;
}

/* Firefox 样式 */
.date-picker-input::-moz-focus-inner {
  border: 0;
  padding: 0;
}

/* 占位符样式 */
.date-picker-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.date-picker-input::-webkit-input-placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.date-picker-input::-moz-placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.date-picker-input:-ms-input-placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

/* 动画效果 */
.date-picker-container {
  transition: all 0.2s ease;
}

.date-picker-error,
.date-picker-help {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 触摸反馈 */
@media (hover: none) and (pointer: coarse) {
  .date-picker-input:active {
    background-color: var(--bg-secondary);
    transform: scale(0.98);
  }
  
  .date-picker-container:active {
    transform: scale(0.98);
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .date-picker-input {
    border-width: 2px;
  }
  
  .date-picker-input:focus {
    border-width: 3px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .date-picker-input,
  .date-picker-container,
  .date-picker-error,
  .date-picker-help {
    transition: none;
    animation: none;
  }
}
</style>
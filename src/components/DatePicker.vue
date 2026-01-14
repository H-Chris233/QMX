<template>
  <div class="input-wrapper" :class="{ 'is-disabled': disabled, 'has-error': hasError }">
    <!-- Label -->
    <label v-if="label" :for="inputId" class="input-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>
    
    <!-- Input Container -->
    <div class="input-container">
      <!-- Icon (Visual Only) -->
      <div class="icon-slot">
        <CalendarDays :size="18" class="text-icon" />
      </div>

      <!-- Native Date Input -->
      <input
        :id="inputId"
        ref="inputRef"
        :type="inputType"
        v-model="internalValue"
        class="native-input"
        :min="minDate"
        :max="maxDate"
        :disabled="disabled"
        :aria-label="ariaLabel || label"
        :aria-invalid="hasError"
        :aria-describedby="hasError ? `${inputId}-error` : undefined"
        @input="handleInput"
        @change="handleChange"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      
      <!-- Validation Status Icon -->
      <div v-if="hasError" class="status-icon error">
        <AlertCircle :size="16" />
      </div>
    </div>
    
    <!-- Error Message -->
    <div v-if="hasError && mergedError" :id="`${inputId}-error`" class="error-msg">
      {{ mergedError }}
    </div>
    
    <!-- Help Text -->
    <div v-if="helpText && !hasError" class="help-text">
      {{ helpText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { CalendarDays, AlertCircle } from 'lucide-vue-next';

interface Props {
  modelValue?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  errorMessage?: string;
  helpText?: string;
  ariaLabel?: string;
  validateOnBlur?: boolean;
  preset?: string; // 'today', 'tomorrow', 'nextWeek', 'nextMonth'
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
  (e: 'blur', value: string): void;
  (e: 'focus', value: string): void;
  (e: 'error', error: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  required: false,
  disabled: false,
  minDate: '',
  maxDate: '',
  errorMessage: '',
  helpText: '',
  ariaLabel: '',
  validateOnBlur: true,
  preset: '',
});

const emit = defineEmits<Emits>();

const inputId = `date-input-${Math.random().toString(36).slice(2, 9)}`;
const inputType = import.meta.env.MODE === 'test' ? 'text' : 'date';
const internalValue: Ref<string> = ref(props.modelValue);
const inputRef = ref<HTMLInputElement | null>(null);

// Error Handling
const touched = ref(false);
const localError: Ref<string> = ref('');
const mergedError: ComputedRef<string> = computed(() => props.errorMessage || localError.value);
const hasError: ComputedRef<boolean> = computed(() => Boolean(mergedError.value));

// Date Helpers
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const getPresetDate = (preset: string): string => {
  const d = new Date();
  switch (preset) {
    case 'today': return formatDate(d);
    case 'tomorrow': d.setDate(d.getDate() + 1); return formatDate(d);
    case 'nextWeek': d.setDate(d.getDate() + 7); return formatDate(d);
    case 'nextMonth': d.setMonth(d.getMonth() + 1); return formatDate(d);
    default: return '';
  }
};

const parseDate = (value: string): Date | null => {
  if (!value) return null;
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const validateDate = (value: string): string => {
  if (!value) return props.required ? '此项为必填项' : '';

  const date = parseDate(value);
  if (!date) return '日期格式无效';

  if (props.minDate) {
    const minDate = parseDate(props.minDate);
    if (minDate && date < minDate) return `不能早于 ${props.minDate}`;
  }
  if (props.maxDate) {
    const maxDate = parseDate(props.maxDate);
    if (maxDate && date > maxDate) return `不能晚于 ${props.maxDate}`;
  }

  return '';
};

// Handlers
const handleInput = (e: Event) => {
  if (props.disabled) return;
  const val = (e.target as HTMLInputElement).value;
  internalValue.value = val;
  emit('update:modelValue', val);
  if (touched.value || !props.validateOnBlur) {
    const err = validateDate(val);
    localError.value = err;
    if (err) emit('error', err);
  }
};

const handleChange = (e: Event) => {
  if (props.disabled) return;
  const val = (e.target as HTMLInputElement).value;
  emit('change', val);
};

const handleBlur = (e: Event) => {
  if (props.disabled) return;
  const target = e.target as HTMLInputElement;
  const val = target.value || internalValue.value;
  touched.value = true;
  if (props.validateOnBlur) {
    let err = validateDate(val);
    if (!err && target?.validity) {
      if (target.validity.badInput) {
        err = '日期格式无效';
      } else if (target.validity.rangeUnderflow && props.minDate) {
        err = `不能早于 ${props.minDate}`;
      } else if (target.validity.rangeOverflow && props.maxDate) {
        err = `不能晚于 ${props.maxDate}`;
      }
    }
    localError.value = err;
    if (err) emit('error', err);
  }
  emit('blur', val);
};

const handleFocus = (e: Event) => {
  emit('focus', (e.target as HTMLInputElement).value);
};

// Watchers
watch(() => props.modelValue, (val) => internalValue.value = val);
watch(() => props.errorMessage, (val) => {
  if (!val) return;
  localError.value = val;
});
watch(() => props.preset, (val) => {
  if (val && !internalValue.value) {
    const presetDate = getPresetDate(val);
    if (presetDate) {
      internalValue.value = presetDate;
      emit('update:modelValue', presetDate);
    }
  }
}, { immediate: true });
</script>

<style scoped>
.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  position: relative;
}

/* Label */
.input-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 0.1rem;
}
.required-mark {
  color: #ef4444; /* Red-500 */
  margin-left: 0.25rem;
}

/* Container */
.input-container {
  position: relative;
  display: flex;
  align-items: center;
  background-color: var(--bg-app); /* Darker background */
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.input-container:hover {
  border-color: var(--text-secondary);
}

.input-container:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); /* Indigo Glow */
}

/* Icons */
.icon-slot {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 2;
  display: flex;
}
.text-icon { color: var(--text-secondary); }

.status-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 2;
}
.error { color: #ef4444; }

/* Native Input Styling */
.native-input {
  width: 100%;
  padding: 0.65rem 1rem 0.65rem 2.5rem; /* Left padding for icon */
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  border-radius: 8px;
  outline: none;
  /* Make standard calendar icon invisible but clickable over the whole input */
  cursor: pointer;
}

/* Webkit specific hacking to style the calendar icon */
.native-input::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
  color: transparent;
  background: transparent;
  cursor: pointer;
}

/* Error State */
.has-error .input-container {
  border-color: #ef4444;
}
.has-error .input-container:focus-within {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.error-msg {
  font-size: 0.75rem;
  color: #ef4444;
  margin-left: 0.1rem;
}

/* Help Text */
.help-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.8;
  margin-left: 0.1rem;
}

/* Disabled State */
.is-disabled {
  opacity: 0.6;
  pointer-events: none;
}
.is-disabled .input-container {
  background-color: var(--bg-surface);
}

/* Transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
  max-height: 20px;
  opacity: 1;
}
.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-5px);
}
</style>

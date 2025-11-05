<template>
  <div class="student-form">
    <form @submit.prevent="handleSubmit">
      <!-- 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>
        
        <div class="form-group">
          <label for="name" class="required">姓名</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            required
            placeholder="请输入学员姓名"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="age">年龄</label>
            <input
              id="age"
              v-model.number="formData.age"
              type="number"
              min="0"
              max="150"
              placeholder="请输入年龄"
            />
          </div>

          <div class="form-group">
            <label for="phone">电话</label>
            <input
              id="phone"
              v-model="formData.phone"
              type="tel"
              placeholder="请输入联系电话"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="subject">科目</label>
            <select id="subject" v-model="formData.subject">
              <option value="Shooting">射击</option>
              <option value="Archery">射箭</option>
              <option value="Others">其他</option>
            </select>
          </div>

          <div class="form-group">
            <label for="class">课程类型</label>
            <select id="class" v-model="formData.class">
              <option value="TenTry">体验课</option>
              <option value="Month">月卡</option>
              <option value="Year">年卡</option>
              <option value="Others">其他</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="lesson_left">剩余课时</label>
          <input
            id="lesson_left"
            v-model.number="formData.lesson_left"
            type="number"
            min="0"
            placeholder="请输入剩余课时数"
          />
        </div>

        <div class="form-group">
          <label for="note">备注</label>
          <textarea
            id="note"
            v-model="formData.note"
            rows="3"
            placeholder="请输入备注信息"
          ></textarea>
        </div>
      </div>

      <!-- 会员信息 -->
      <div class="form-section">
        <h3 class="section-title">会员信息</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="membership_start_date">会员开始日期</label>
            <input
              id="membership_start_date"
              v-model="formData.membership_start_date"
              type="date"
              placeholder="选择开始日期"
            />
          </div>

          <div class="form-group">
            <label for="membership_end_date">会员结束日期</label>
            <input
              id="membership_end_date"
              v-model="formData.membership_end_date"
              type="date"
              placeholder="选择结束日期"
            />
          </div>
        </div>

        <div class="form-hint">
          <span class="hint-icon">💡</span>
          <span>留空表示无会员，或清除会员信息</span>
        </div>
      </div>

      <!-- 表单操作按钮 -->
      <div class="form-actions">
        <button type="button" @click="handleCancel" class="btn-cancel">
          取消
        </button>
        <button type="submit" class="btn-submit">
          保存
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Student, CurrentStudentInput } from '../types/api';

// Props
interface Props {
  modelValue?: Student | null;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  save: [data: CurrentStudentInput];
  cancel: [];
}>();

// Form data
interface FormData {
  name: string;
  age: number | null;
  phone: string;
  class: string;
  subject: string;
  note: string;
  lesson_left: number | null;
  membership_start_date: string | null | undefined;
  membership_end_date: string | null | undefined;
}

const formData = ref<FormData>({
  name: '',
  age: null,
  phone: '',
  class: 'Others',
  subject: 'Shooting',
  note: '',
  lesson_left: null,
  membership_start_date: null,
  membership_end_date: null,
});

// Watch for prop changes (edit mode)
watch(() => props.modelValue, (student) => {
  if (student) {
    formData.value = {
      name: student.name,
      age: student.age,
      phone: student.phone,
      class: student.class,
      subject: student.subject,
      note: student.note || '',
      lesson_left: student.lesson_left ?? null,
      membership_start_date: student.membership_start_date 
        ? student.membership_start_date.split('T')[0] 
        : null,
      membership_end_date: student.membership_end_date 
        ? student.membership_end_date.split('T')[0] 
        : null,
    };
  }
}, { immediate: true });

// Handle form submission
const handleSubmit = () => {
  // Convert form data to API format
  const trimmedNote = formData.value.note.trim();
  const apiData: CurrentStudentInput = {
    name: formData.value.name.trim(),
    age: formData.value.age ?? null,
    phone: formData.value.phone.trim(),
    class: formData.value.class,
    subject: formData.value.subject,
    note: trimmedNote || undefined,
    lesson_left: formData.value.lesson_left ?? undefined,
    membership_start_date: (formData.value.membership_start_date === null || formData.value.membership_start_date === undefined) ? undefined : formData.value.membership_start_date,
    membership_end_date: (formData.value.membership_end_date === null || formData.value.membership_end_date === undefined) ? undefined : formData.value.membership_end_date,
  };

  emit('save', apiData);
};

// Handle cancel
const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.student-form {
  padding: 1rem;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.form-group label.required::after {
  content: ' *';
  color: #e53e3e;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: color-mix(in srgb, var(--accent-primary) 10%, var(--bg-secondary));
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 1rem;
}

.hint-icon {
  font-size: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn-cancel,
.btn-submit {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background-color: var(--bg-tertiary);
}

.btn-submit {
  background-color: var(--accent-primary);
  color: white;
}

.btn-submit:hover {
  background-color: #1976d2;
}

/* Dark mode adjustments */
.dark .form-group input,
.dark .form-group select,
.dark .form-group textarea {
  background-color: #2d3748;
  border-color: #4a5568;
}

.dark .form-group input:focus,
.dark .form-group select:focus,
.dark .form-group textarea:focus {
  border-color: var(--accent-primary);
}
</style>

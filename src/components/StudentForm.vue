<template>
  <div class="student-form-container">
    <form @submit.prevent="handleSubmit">
      
      <!-- Section 1: 基本资料 -->
      <section class="form-section">
        <div class="section-header">
          <User :size="18" class="section-icon" />
          <h3 class="section-title">基本资料</h3>
        </div>
        
        <div class="form-grid">
          <!-- 姓名 (全宽) -->
          <div class="form-group full-width">
            <label for="name" class="label-required required">学员姓名</label>
            <div class="input-wrapper">
              <User :size="16" class="input-icon" />
              <input
                id="name"
                v-model="formData.name"
                type="text"
                required
                placeholder="请输入真实姓名"
                class="form-input"
              />
            </div>
          </div>

          <!-- 年龄 -->
          <div class="form-group">
            <label for="age">年龄</label>
            <div class="input-wrapper">
              <Calendar :size="16" class="input-icon" />
              <input
                id="age"
                v-model.number="formData.age"
                type="number"
                min="0"
                max="150"
                placeholder="岁"
                class="form-input"
              />
            </div>
          </div>

          <!-- 电话 -->
          <div class="form-group">
            <label for="phone">联系电话</label>
            <div class="input-wrapper">
              <Phone :size="16" class="input-icon" />
              <input
                id="phone"
                v-model="formData.phone"
                type="tel"
                placeholder="手机号码"
                class="form-input"
              />
            </div>
          </div>

          <!-- 科目 -->
          <div class="form-group">
            <label for="subject">训练科目</label>
            <div class="input-wrapper">
              <Target :size="16" class="input-icon" />
              <select id="subject" v-model="formData.subject" class="form-select">
                <option value="Shooting">🎯 射击</option>
                <option value="Archery">🏹 射箭</option>
                <option value="Others">🧩 其他</option>
              </select>
              <ChevronDown :size="14" class="select-arrow" />
            </div>
          </div>

          <!-- 课程类型 -->
          <div class="form-group">
            <label for="class">课程类型</label>
            <div class="input-wrapper">
              <BookOpen :size="16" class="input-icon" />
              <select id="class" v-model="formData.class" class="form-select">
                <option value="TenTry">🎟️ 体验课</option>
                <option value="Month">📅 月卡</option>
                <option value="Year">🗓️ 年卡</option>
                <option value="Others">📦 其他</option>
              </select>
              <ChevronDown :size="14" class="select-arrow" />
            </div>
          </div>

          <!-- 剩余课时 -->
          <div class="form-group">
            <label for="lesson_left">剩余课时</label>
            <div class="input-wrapper">
              <Hourglass :size="16" class="input-icon" />
              <input
                id="lesson_left"
                v-model.number="formData.lesson_left"
                type="number"
                min="0"
                placeholder="0"
                class="form-input"
              />
            </div>
          </div>
        </div>

        <!-- 备注 (全宽) -->
        <div class="form-group full-width mt-4">
          <label for="note">备注信息</label>
          <div class="input-wrapper textarea-wrapper">
            <FileText :size="16" class="input-icon textarea-icon" />
            <textarea
              id="note"
              v-model="formData.note"
              rows="3"
              placeholder="记录学员的特殊情况或需求..."
              class="form-input form-textarea"
            ></textarea>
          </div>
        </div>
      </section>

      <!-- Section 2: 会员权益 -->
      <section class="form-section">
        <div class="section-header">
          <Crown :size="18" class="section-icon text-warning" />
          <h3 class="section-title">会员权益</h3>
        </div>
        
        <div class="membership-panel">
          <div class="form-grid">
            <div class="form-group">
              <label for="membership_start_date">生效日期</label>
              <input
                id="membership_start_date"
                v-model="formData.membership_start_date"
                type="date"
                class="form-input date-input"
              />
            </div>

            <div class="form-group">
              <label for="membership_end_date">到期日期</label>
              <input
                id="membership_end_date"
                v-model="formData.membership_end_date"
                type="date"
                class="form-input date-input"
              />
            </div>
          </div>

          <div class="info-box">
            <Info :size="16" class="info-icon-small" />
            <p>留空表示非会员状态；填写日期将自动激活会员身份。</p>
          </div>
        </div>
      </section>

      <!-- 底部操作栏 -->
      <div class="form-footer">
        <button type="button" @click="handleCancel" class="btn btn-secondary btn-cancel">
          取消
        </button>
        <button type="submit" class="btn btn-primary btn-submit">
          <Save :size="18" />
          保存信息
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Student, CurrentStudentInput } from '../types/api';
import { 
  User, 
  Calendar, 
  Phone, 
  Target, 
  BookOpen, 
  Hourglass, 
  FileText, 
  Crown, 
  Info, 
  Save,
  ChevronDown 
} from 'lucide-vue-next';

interface Props {
  modelValue?: Student | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  save: [data: CurrentStudentInput];
  cancel: [];
}>();

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
      membership_start_date: student.membership_start_date ? student.membership_start_date.split('T')[0] : null,
      membership_end_date: student.membership_end_date ? student.membership_end_date.split('T')[0] : null,
    };
  }
}, { immediate: true });

const handleSubmit = () => {
  const trimmedNote = formData.value.note.trim();
  const ageValue = formData.value.age;
  const lessonLeftValue = formData.value.lesson_left;
  const membershipStart = formData.value.membership_start_date;
  const membershipEnd = formData.value.membership_end_date;
  const apiData: CurrentStudentInput = {
    name: formData.value.name.trim(),
    age: ageValue === null ? null : ageValue,
    phone: formData.value.phone.trim(),
    class: formData.value.class,
    subject: formData.value.subject,
    note: trimmedNote || undefined,
    lesson_left: lessonLeftValue === null ? undefined : lessonLeftValue,
    membership_start_date: membershipStart === null ? undefined : membershipStart,
    membership_end_date: membershipEnd === null ? undefined : membershipEnd,
  };
  emit('save', apiData);
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.student-form-container {
  padding: 0.5rem;
}

/* Section Styling */
.form-section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.section-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.section-icon {
  color: var(--text-secondary);
}

.text-warning {
  color: var(--accent-warning, #f59e0b);
}

/* Grid Layout */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.full-width {
  grid-column: span 2;
}

.mt-4 {
  margin-top: 1rem;
}

/* Form Group & Input Styling */
.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.label-required::after {
  content: '*';
  color: #ef4444;
  margin-left: 0.25rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--text-secondary);
  pointer-events: none;
  z-index: 10;
}

.form-input, .form-select {
  width: 100%;
  padding: 0.6rem 1rem 0.6rem 2.4rem; /* Left padding for icon */
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.form-input:focus, .form-select:focus {
  border-color: var(--primary-color);
  background-color: var(--bg-surface);
  outline: none;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Select Specifics */
.form-select {
  appearance: none;
  cursor: pointer;
}
.select-arrow {
  position: absolute;
  right: 0.75rem;
  color: var(--text-secondary);
  pointer-events: none;
}

/* Textarea Specifics */
.textarea-wrapper {
  align-items: flex-start;
}
.textarea-icon {
  top: 0.8rem;
}
.form-textarea {
  min-height: 80px;
  resize: vertical;
  line-height: 1.5;
}

/* Membership Panel */
.membership-panel {
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 1.25rem;
}

.date-input {
  /* Date inputs often need less left padding if icon is native or different */
  /* But here we stick to consistency, native calendar icon usually is on right */
  padding-left: 1rem; 
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: rgba(99, 102, 241, 0.1); /* Primary light */
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.85rem;
}

.info-icon-small {
  color: var(--primary-color);
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.info-box p {
  margin: 0;
  line-height: 1.4;
  opacity: 0.9;
}

/* Footer & Buttons */
.form-footer {
  margin-top: 2rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-subtle);
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}
.btn-secondary:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}
.btn-primary:hover {
  background-color: #5558e6;
  transform: translateY(-1px);
}

/* Mobile Responsive */
@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .full-width {
    grid-column: span 1;
  }
}
</style>

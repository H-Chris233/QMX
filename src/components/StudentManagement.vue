<template>
  <div class="student-management" data-testid="student-management">

    <!-- 顶部工具栏 -->
    <header class="management-toolbar" data-testid="student-top-bar">

      <!-- 左侧：搜索与筛选 -->
      <div class="toolbar-left">
        <h2 class="page-title mobile-hidden">学员管理</h2>
        <div class="search-wrapper">
          <Search :size="16" class="search-icon-deco" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索学员 / 电话 / ID..."
            class="search-input"
            data-testid="student-search-input"
            @keyup.enter="performSearch"
          />
          <button
            type="button"
            class="search-submit-btn"
            data-testid="student-search-button"
            @click="performSearch"
          >
            搜索
          </button>
        </div>

        <div class="filters-group">
          <!-- 科目筛选 -->
          <div class="select-wrapper">
            <select v-model="searchFilters.subject" @change="performSearch" data-testid="filter-subject">
              <option value="">📚 所有科目</option>
              <option value="Shooting">🎯 射击</option>
              <option value="Archery">🏹 射箭</option>
              <option value="ShootingArchery">🎯🏹 射击&射箭</option>
              <option value="Others">🧩 其他</option>
            </select>
            <ChevronDown :size="14" class="select-arrow" />
          </div>

          <!-- 课程类型 -->
          <div class="select-wrapper">
            <select v-model="searchFilters.classType" @change="performSearch" data-testid="filter-class-type">
              <option value="">🎓 所有课程</option>
              <option value="TenTry">🎟️ 体验课</option>
              <option value="Month">📅 月卡</option>
              <option value="Year">🗓️ 年卡</option>
              <option value="Others">📦 其他</option>
            </select>
            <ChevronDown :size="14" class="select-arrow" />
          </div>

          <!-- 会员状态 -->
          <div class="select-wrapper">
            <select v-model="searchFilters.hasMembership" @change="performSearch" data-testid="filter-has-membership">
              <option value="">💳 会员筛选</option>
              <option value="true">✅ 仅会员</option>
              <option value="false">🚫 非会员</option>
            </select>
            <ChevronDown :size="14" class="select-arrow" />
          </div>
        </div>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="toolbar-right">
        <button @click="exportStudents" class="btn btn-secondary export-btn" data-testid="export-students-btn" title="导出 CSV">
          <Download :size="18" />
          <span class="btn-text">导出</span>
        </button>
        <button @click="showAddStudentForm = true" class="btn btn-primary add-student-btn" data-testid="add-student-btn">
          <UserPlus :size="18" />
          <span>添加学员</span>
        </button>
      </div>
    </header>

    <!-- 学员列表网格 -->
    <div class="student-grid" data-testid="student-list">
      <div
        v-for="student in students"
        :key="student.uid"
        :class="['student-card', { selected: selectedStudent?.uid === student.uid }]"
        @click="selectStudent(student)"
        :data-testid="`student-card-${student.uid}`"
      >
        <!-- 卡片头部：基本信息 -->
        <div class="card-header">
          <div class="header-main">
            <div class="student-avatar-placeholder">
              {{ student.name.charAt(0) }}
            </div>
            <div class="student-identity">
              <h3 class="student-name">{{ student.name }}</h3>
              <span class="student-uid student-id">UID: {{ student.uid }}</span>
            </div>
          </div>
          <!-- 状态徽章 -->
          <div class="status-badge" :class="getMembershipStatusClass(student)">
            {{ getMembershipStatusText(student) }}
          </div>
        </div>

        <!-- 卡片主体：详细属性 -->
        <div class="card-body">
          <div class="info-row info-item">
            <Target :size="14" class="info-icon" />
            <span class="info-label">科目</span>
            <span class="info-val">{{ getSubjectName(student.subject) }}</span>
          </div>
          <div class="info-row info-item">
            <User :size="14" class="info-icon" />
            <span class="info-label">年龄</span>
            <span class="info-val">{{ student.age ?? '未设置' }}</span>
          </div>
          <div class="info-row info-item">
            <Phone :size="14" class="info-icon" />
            <span class="info-label">电话</span>
            <span class="info-val font-mono">{{ getDisplayPhone(student.phone) }}</span>
          </div>
          <div class="info-row info-item">
            <BookOpen :size="14" class="info-icon" />
            <span class="info-label">课程</span>
            <span class="info-val">{{ getClassTypeName(student.class) }}</span>
          </div>
          <div class="info-row info-item" v-if="student.is_membership_active">
            <Clock :size="14" class="info-icon" />
            <span class="info-label">有效期</span>
            <span class="info-val highlight-val">
              剩余 {{ student.membership_days_remaining }} 天
            </span>
          </div>
          <div class="info-row info-item" v-if="hasMembershipRange(student)">
            <Calendar :size="14" class="info-icon" />
            <span class="info-label">会员期限</span>
            <span class="info-val">{{ getMembershipRangeText(student) }}</span>
          </div>
        </div>

        <!-- 卡片底部：操作栏 -->
        <div class="card-footer">
          <button @click.stop="editStudent(student)" class="card-btn edit edit-btn" :data-testid="`edit-student-${student.uid}`">
            <Edit3 :size="16" />
            编辑
          </button>
          <div class="divider-vertical"></div>
          <button @click.stop="deleteStudent(student.uid)" class="card-btn delete delete-btn" :data-testid="`delete-student-${student.uid}`">
            <Trash2 :size="16" />
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 分页控件 -->
    <div class="pagination-wrapper pagination" v-if="totalPages > 1" data-testid="student-pagination">
      <button
        @click="changePage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="page-nav-btn page-btn"
        data-testid="prev-page-btn"
      >
        <ChevronLeft :size="18" />
        上一页
      </button>

      <span class="page-indicator page-info" data-testid="page-info">
        {{ currentPage }} / {{ totalPages }} (共 {{ totalStudents }} 人)
      </span>

      <button
        @click="changePage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="page-nav-btn page-btn"
        data-testid="next-page-btn"
      >
        下一页
        <ChevronRight :size="18" />
      </button>
    </div>
  </div>

  <!-- 模态框 -->
  <Transition name="modal-fade">
    <div v-if="showAddStudentForm || showEditForm" class="modal-overlay" @click="closeForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ showAddStudentForm ? '添加新学员' : '编辑学员信息' }}</h2>
          <button @click="closeForm" class="modal-close-btn">
            <X :size="24" />
          </button>
        </div>

        <div class="modal-body">
          <StudentForm
            :model-value="currentStudent"
            @save="handleSave"
            @cancel="closeForm"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/app';
import { useStudentStore } from '../stores/student';
import StudentForm from './StudentForm.vue';
import type { Student, CurrentStudentInput } from '../types/api';

// 引入图标
import {
  Search,
  Download,
  User,
  Calendar,
  UserPlus,
  ChevronDown,
  Target,
  Phone,
  BookOpen,
  Clock,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-vue-next';

const appStore = useAppStore();
const studentStore = useStudentStore();
const { students, pagination, currentStudent: currentStudentRef } = storeToRefs(studentStore);

// 响应式数据
const searchQuery = ref('');
const searchFilters = ref({
  subject: '',
  classType: '',
  hasMembership: ''
});

const currentStudent = computed({
  get: () => currentStudentRef.value,
  set: (value) => studentStore.setCurrentStudent(value)
});

// Computed properties for pagination
const currentPage = computed({
  get: () => pagination.value.currentPage,
  set: (value) => {
    pagination.value.currentPage = value;
  }
});
const totalPages = computed(() => pagination.value.totalPages);
const totalStudents = computed(() => pagination.value.totalItems);

const selectedStudent = ref<Student | null>(null);

// 表单状态
const showAddStudentForm = ref(false);
const showEditForm = ref(false);

// 搜索逻辑
const performSearch = async (): Promise<void> => {
  try {
    await fetchStudents(1);
  } catch (error) {
    // 错误已由errorHandler统一处理
    appStore.errorHandler.showError('无法搜索学员，请稍后重试');
  }
};

const fetchStudents = async (page: number = 1): Promise<void> => {
  try {
    const normalizedKeyword = searchQuery.value.trim();
    const hasMembershipFilter = searchFilters.value.hasMembership;
    const params: any = {
      page,
      limit: 20,
      name_contains: normalizedKeyword || null,
      subject: searchFilters.value.subject || null,
      class_type: searchFilters.value.classType || null,
      has_membership: hasMembershipFilter === '' ? null : hasMembershipFilter === 'true',
    };

    await studentStore.fetchStudents(params);
  } catch (error) {
    if (!studentStore.loading) {
      appStore.errorHandler.showError('无法获取学员列表');
    }
  }
};

const selectStudent = (student: Student) => selectedStudent.value = student;

const editStudent = (student: Student) => {
  studentStore.setCurrentStudent(student);
  showEditForm.value = true;
};

const handleSave = async (data: CurrentStudentInput): Promise<void> => {
  try {
    if (showAddStudentForm.value) {
      await studentStore.createStudent(data);
      appStore.errorHandler.showSuccess('学员添加成功');
    } else if (currentStudent.value) {
      await studentStore.updateStudent(currentStudent.value.uid, data);
      appStore.errorHandler.showSuccess('学员信息更新成功');
    }
    closeForm();
  } catch (error) {
    const msg = (error as any)?.message || '操作失败';
    appStore.errorHandler.showError('操作失败：' + msg);
  }
};

const saveStudent = async (data: CurrentStudentInput): Promise<void> => {
  await handleSave(data);
};

const deleteStudent = async (uid: number): Promise<void> => {
  appStore.showConfirm({
    title: '确认删除',
    message: '确定要删除这个学员吗？删除后无法恢复。',
    confirmText: '确认删除',
    confirmType: 'danger',
    onConfirm: async () => {
      try {
        await studentStore.deleteStudent(uid);
        appStore.errorHandler.showSuccess('学员已删除');
        if (students.value.length === 0 && currentPage.value > 1) {
          await fetchStudents(currentPage.value - 1);
        }
      } catch (error) {
        appStore.errorHandler.showError('删除失败');
      }
    }
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${month}-${day}`;
};

const getMembershipRangeText = (student: Student) => {
  const start = formatDate(student.membership_start_date);
  const end = formatDate(student.membership_end_date);

  if (start && end) {
    return `${start} 至 ${end}`;
  }

  if (start) return `${start} 起`;
  if (end) return `截至 ${end}`;
  return '';
};

const exportStudents = async (): Promise<void> => {
  try {
    const headers = ['ID', '姓名', '年龄', '电话', '课程', '科目', '剩余课时', '会员开始', '会员结束', '状态', '备注'];
    const rows = students.value.map(s => {
      const start = formatDate(s.membership_start_date);
      const end = formatDate(s.membership_end_date);
      const status = s.is_membership_active ? '激活' : '未激活';
      return [
        s.uid, `"${s.name}"`, s.age || '', `"${getDisplayPhone(s.phone)}"`, `"${getClassTypeName(s.class)}"`,
        `"${getSubjectName(s.subject)}"`, s.lesson_left || '',
        `"${start}"`, `"${end}"`, `"${status}"`, `"${s.note || ''}"`
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `学员数据-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    appStore.errorHandler.showSuccess('导出成功');
  } catch (error) {
    appStore.errorHandler.showError('导出失败');
  }
};

const changePage = async (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  await fetchStudents(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 辅助函数
const getSubjectName = (subject: string) => {
  const map: Record<string, string> = { 'Shooting': '射击', 'Archery': '射箭', 'ShootingArchery': '射击&射箭', 'Others': '其他' };
  return map[subject] || subject;
};

const getClassTypeName = (classType: string) => {
  const map: Record<string, string> = { TenTry: '体验课', Month: '月卡', Year: '年卡', Others: '其他' };
  return map[classType] || classType;
};

const getDisplayPhone = (phone?: string | null) => {
  const normalized = typeof phone === 'string' ? phone.trim() : '';
  return normalized || '（未提供）';
};

const hasMembershipRange = (student: Student) => Boolean(student.membership_start_date || student.membership_end_date);

const getMembershipStatusClass = (s: Student) => {
  if (s.is_membership_active) return 'badge-active';
  if (s.membership_end_date && new Date(s.membership_end_date) < new Date()) return 'badge-expired';
  return 'badge-none';
};

const getMembershipStatusText = (s: Student) => {
  if (s.is_membership_active) return '会员';
  if (s.membership_end_date && new Date(s.membership_end_date) < new Date()) return '已过期';
  return '非会员';
};

const closeForm = () => {
  showAddStudentForm.value = false;
  showEditForm.value = false;
  studentStore.setCurrentStudent(null);
};

onMounted(() => fetchStudents());
</script>

<style scoped>
.student-management {
  max-width: 1400px;
  margin: 0 auto;
  animation: fade-in 0.4s ease;
}

/* === Toolbar 工具栏 === */
.management-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  background: var(--bg-surface);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
}

.toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  flex: 1;
}

.search-wrapper {
  position: relative;
  min-width: 240px;
}
.search-input {
  width: 100%;
  padding: 0.6rem 1rem 0.6rem 2.4rem;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: var(--primary-color);
  outline: none;
}
.search-icon-deco {
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.filters-group {
  display: flex;
  gap: 0.75rem;
}
.select-wrapper {
  position: relative;
}
.select-wrapper select {
  appearance: none;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  padding: 0.6rem 2rem 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}
.select-wrapper select:hover {
  border-color: var(--text-secondary);
}
.select-arrow {
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.toolbar-right {
  display: flex;
  gap: 0.75rem;
}

/* 按钮样式 */
.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.9rem;
}
.btn-primary {
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}
.btn-primary:hover {
  background-color: #5558e6;
  transform: translateY(-1px);
}
.btn-secondary {
  background-color: var(--bg-hover);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}
.btn-secondary:hover {
  background-color: var(--border-subtle);
}

/* === Grid List 列表 === */
.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  align-items: start;
}

.student-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: auto;
  align-self: start;
}

.student-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -10px rgba(0,0,0,0.3);
  border-color: rgba(255,255,255,0.1);
}

/* Card Header */
.card-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background-color: rgba(255,255,255,0.02);
}

.header-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.student-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--bg-hover), var(--border-subtle));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--text-primary);
  font-size: 1.2rem;
}

.student-identity {
  display: flex;
  flex-direction: column;
}

.student-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.student-uid {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 99px;
  font-weight: 500;
}
.badge-active { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
.badge-expired { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
.badge-none { background: rgba(107, 114, 128, 0.1); color: #9ca3af; }

/* Card Body */
.card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-row {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  gap: 0.75rem;
}

.info-icon {
  color: var(--text-secondary);
  opacity: 0.7;
}

.info-label {
  color: var(--text-secondary);
  width: 3.5rem;
}

.info-val {
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.font-mono { font-family: monospace; }
.highlight-val { color: var(--accent-warning); }

/* Card Footer */
.card-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(0,0,0,0.2);
}

.card-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  transition: all 0.2s;
  flex: 1;
  justify-content: center;
}

.card-btn.edit { color: var(--text-secondary); }
.card-btn.edit:hover { background-color: var(--bg-hover); color: var(--text-primary); }

.card-btn.delete { color: #ef4444; opacity: 0.8; }
.card-btn.delete:hover { background-color: rgba(239, 68, 68, 0.1); opacity: 1; }

.divider-vertical {
  width: 1px;
  height: 1.5rem;
  background-color: var(--border-subtle);
}

/* Pagination */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2rem;
  padding-bottom: 2rem;
}

.page-nav-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.page-nav-btn:hover:not(:disabled) {
  background-color: var(--bg-hover);
}
.page-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-indicator {
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.page-indicator b { color: var(--text-primary); }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  z-index: 1000;
}

.modal-content {
  background-color: var(--bg-surface);
  border-radius: 16px;
  width: min(90vw, 550px);
  max-width: 550px;
  max-height: calc(100vh - 2rem);
  border: 1px solid var(--border-subtle);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h2 { margin: 0; font-size: 1.25rem; color: var(--text-primary); }

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s;
}
.modal-close-btn:hover { background-color: var(--bg-hover); color: var(--text-primary); }

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  min-height: 0;
}

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

@keyframes modal-pop {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .management-toolbar { flex-direction: column; align-items: stretch; }
  .filters-group { flex-wrap: wrap; }
  .select-wrapper { flex: 1; min-width: 120px; }
  .select-wrapper select { width: 100%; }
  .toolbar-right { justify-content: stretch; }
  .btn { flex: 1; justify-content: center; }
  .btn-text { display: none; }
}
</style>

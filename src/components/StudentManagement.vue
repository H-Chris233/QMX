<template>
  <div class="student-management">
    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <div class="search-section">
        <div class="search-input-group">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索学员姓名、电话、科目等..."
            class="search-input"
            @keyup.enter="performSearch"
          />
          <button @click="performSearch" class="search-button">
            <span class="search-icon">🔍</span>
          </button>
        </div>
        
        <div class="search-filters">
          <select v-model="searchFilters.subject" @change="performSearch">
            <option value="">所有科目</option>
            <option value="Shooting">射击</option>
            <option value="Archery">射箭</option>
            <option value="Others">其他</option>
          </select>
          
          <select v-model="searchFilters.classType" @change="performSearch">
            <option value="">所有课程</option>
            <option value="TenTry">体验课</option>
            <option value="Month">月卡</option>
            <option value="Year">年卡</option>
            <option value="Others">其他</option>
          </select>

          <select v-model="searchFilters.hasMembership" @change="performSearch">
            <option value="">所有会员状态</option>
            <option value="true">有会员</option>
            <option value="false">无会员</option>
          </select>

          <select v-model="searchFilters.membershipStatus" @change="performSearch">
            <option value="">会员筛选</option>
            <option value="Active">激活中</option>
            <option value="Expired">已过期</option>
            <option value="Upcoming">即将开始</option>
          </select>
        </div>
      </div>
      
      <div class="action-buttons">
        <button @click="showAddStudentForm = true" class="add-student-btn">
          <span class="btn-icon">➕</span>
          添加学员
        </button>
        <button @click="exportStudents" class="export-btn">
          <span class="btn-icon">📤</span>
          导出数据
        </button>
      </div>
    </div>

    <!-- 学员列表 -->
    <div class="student-list">
      <div 
        v-for="student in students" 
        :key="student.uid" 
        :class="['student-card', { selected: selectedStudent?.uid === student.uid }]"
        @click="selectStudent(student)"
      >
        <div class="student-header">
          <h3>{{ student.name }}</h3>
          <div class="student-id">ID: {{ student.uid }}</div>
        </div>
        
        <div class="student-info">
          <div class="info-item">
            <span class="info-label">科目:</span>
            <span class="info-value">{{ getSubjectName(student.subject) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">年龄:</span>
            <span class="info-value">{{ student.age || '未设置' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">电话:</span>
            <span class="info-value">{{ student.phone }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">课程:</span>
            <span class="info-value">{{ student.class }}</span>
          </div>
          <div class="info-item membership-info" :class="{ 'active': student.is_membership_active }">
            <span class="info-label">会员:</span>
            <span class="info-value">
              <span v-if="student.membership_start_date && student.membership_end_date">
                至 {{ formatDate(student.membership_end_date) }}
                <span v-if="student.membership_days_remaining !== null">
                  (剩余{{ student.membership_days_remaining }}天)
                </span>
              </span>
              <span v-else>无会员</span>
            </span>
          </div>
        </div>
        
        <div class="student-actions">
          <button @click.stop="editStudent(student)" class="edit-btn">
            <span class="btn-icon">✏️</span>
            编辑
          </button>
          <button @click.stop="deleteStudent(student.uid)" class="delete-btn">
            <span class="btn-icon">🗑️</span>
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="totalPages > 1">
      <button 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
        class="page-btn"
      >
        上一页
      </button>
      
      <span class="page-info">
        {{ currentPage }} / {{ totalPages }} (共 {{ totalStudents }} 人)
      </span>
      
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        下一页
      </button>
    </div>
  </div>

  <!-- 添加/编辑学员表单模态框 -->
  <div v-if="showAddStudentForm || showEditForm" class="modal-overlay" @click="closeForm">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ showAddStudentForm ? '添加学员' : '编辑学员' }}</h2>
        <button @click="closeForm" class="close-btn">✕</button>
      </div>
      
      <div class="modal-body">
        <StudentForm 
          :model-value="currentStudent"
          @save="saveStudent"
          @cancel="closeForm"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import StudentForm from './StudentForm.vue';
import { ApiService } from '../api/ApiService';
import type { Student, CurrentStudentInput } from '../types/api';

const appStore = useAppStore();

// 响应式数据
const students = ref<Student[]>([]);
const searchQuery = ref('');
const searchFilters = ref({
  subject: '',
  classType: '',
  hasMembership: '',
  membershipStatus: ''
});
const currentPage = ref(1);
const totalPages = ref(1);
const totalStudents = ref(0);
const selectedStudent = ref<Student | null>(null);

// 表单状态
const showAddStudentForm = ref(false);
const showEditForm = ref(false);
const currentStudent = ref<Student | null>(null);

// 搜索学员
const performSearch = async (): Promise<void> => {
  try {
    // 重置到第一页并执行搜索
    currentPage.value = 1;
    await fetchStudents(1);
  } catch (error) {
    console.error('搜索学员失败:', error);
    appStore.errorHandler.showError('无法搜索学员，请稍后重试');
  }
};

// 获取所有学员
const fetchStudents = async (page: number = 1): Promise<void> => {
  try {
    // 构建查询参数
    const params: any = {
      page,
      limit: 20,
    };

    // 添加搜索条件
    if (searchQuery.value) {
      params.name_contains = searchQuery.value;
    }
    if (searchFilters.value.subject) {
      params.subject = searchFilters.value.subject;
    }
    if (searchFilters.value.classType) {
      params.class_type = searchFilters.value.classType;
    }
    if (searchFilters.value.hasMembership) {
      params.has_membership = searchFilters.value.hasMembership === 'true';
    }
    if (searchFilters.value.membershipStatus) {
      params.membership_status = searchFilters.value.membershipStatus;
    }

    const response = await ApiService.getAllStudents(params);
    
    students.value = response.students;
    currentPage.value = response.pagination.page;
    totalPages.value = response.pagination.total_pages;
    totalStudents.value = response.pagination.total;
  } catch (error) {
    console.error('获取学员列表失败:', error);
    appStore.errorHandler.showError('无法获取学员列表，请稍后重试');
  }
};

// 选择学员
const selectStudent = (student: Student): void => {
  selectedStudent.value = student;
};

// 编辑学员
const editStudent = (student: Student): void => {
  currentStudent.value = student;
  showEditForm.value = true;
};

// 保存学员
const saveStudent = async (data: CurrentStudentInput): Promise<void> => {
  try {
    if (showAddStudentForm.value) {
      // 新增学员
      await ApiService.addStudent(data);
      appStore.errorHandler.showSuccess('学员添加成功');
    } else if (currentStudent.value) {
      // 更新学员
      await ApiService.updateStudentInfo(currentStudent.value.uid, data);
      appStore.errorHandler.showSuccess('学员信息更新成功');
    }
    
    // 关闭表单并刷新数据
    closeForm();
    fetchStudents(currentPage.value);
  } catch (error) {
    console.error('保存学员失败:', error);
    const errorMessage = (error as any)?.response?.data?.error || (error as Error).message;
    appStore.errorHandler.showError('无法保存学员信息：' + errorMessage);
  }
};

// 删除学员
const deleteStudent = async (uid: number): Promise<void> => {
  appStore.showConfirm({
    title: '确认删除',
    message: '您确定要删除这个学员吗？此操作无法撤销。',
    confirmText: '删除',
    confirmType: 'danger',
    onConfirm: async () => {
      try {
        await ApiService.deleteStudent(uid);
        appStore.errorHandler.showSuccess('学员删除成功');
        // 如果当前页没有数据了，回到上一页
        if (students.value.length === 1 && currentPage.value > 1) {
          await fetchStudents(currentPage.value - 1);
        } else {
          await fetchStudents(currentPage.value);
        }
      } catch (error) {
        console.error('删除学员失败:', error);
        const errorMessage = (error as any)?.response?.data?.error ||
                            (error as any)?.response?.data?.message ||
                            (error as Error).message;
        appStore.errorHandler.showError(errorMessage || '无法删除学员，请稍后重试');
      }
    }
  });
};

// 导出学员数据
const exportStudents = async (): Promise<void> => {
  try {
    // 创建CSV表头
    const headers = [
      'ID',
      '姓名',
      '年龄',
      '电话',
      '课程',
      '科目',
      '剩余课时',
      '会员开始日期',
      '会员结束日期',
      '会员状态',
      '备注'
    ];

    // 创建CSV行数据
    const rows = students.value.map(s => {
      const membershipStart = s.membership_start_date 
        ? new Date(s.membership_start_date).toLocaleDateString('zh-CN')
        : '';
      const membershipEnd = s.membership_end_date 
        ? new Date(s.membership_end_date).toLocaleDateString('zh-CN')
        : '';
      const membershipStatus = s.is_membership_active ? '激活' : '未激活';
      
      return [
        s.uid,
        `"${s.name}"`,
        s.age || '',
        `"${s.phone}"`,
        `"${s.class}"`,
        `"${getSubjectName(s.subject)}"`,
        s.lesson_left || '',
        `"${membershipStart}"`,
        `"${membershipEnd}"`,
        `"${membershipStatus}"`,
        `"${s.note || ''}"`
      ].join(',');
    });

    // 合并CSV内容
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      headers.join(',') + '\n' +
      rows.join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `学员数据-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    appStore.errorHandler.showSuccess('学员数据已导出为CSV文件');
  } catch (error) {
    console.error('导出学员数据失败:', error);
    appStore.errorHandler.showError('无法导出学员数据：' + (error as Error).message);
  }
};

// 分页
const changePage = async (page: number): Promise<void> => {
  if (page < 1 || page > totalPages.value) return;
  await fetchStudents(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 工具函数
const getSubjectName = (subject: string): string => {
  const subjectMap: Record<string, string> = {
    'Shooting': '射击',
    'Archery': '射箭',
    'Others': '其他'
  };
  return subjectMap[subject] || subject;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('zh-CN');
};

// 关闭表单
const closeForm = (): void => {
  showAddStudentForm.value = false;
  showEditForm.value = false;
  currentStudent.value = null;
};

// 组件挂载时加载数据
onMounted(async () => {
  await fetchStudents();
});
</script>

<style scoped>
.student-management {
  padding: 1.5rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100%;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.search-section {
  flex: 1;
  min-width: 300px;
}

.search-input-group {
  display: flex;
  margin-bottom: 0.5rem;
}

.search-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px 0 0 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
}

.search-button {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-left: none;
  border-radius: 0 6px 6px 0;
  background-color: var(--accent-primary);
  color: white;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.search-button:hover {
  background-color: #1976d2;
}

.search-filters {
  display: flex;
  gap: 0.5rem;
}

.search-filters select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.add-student-btn, .export-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  background-color: var(--accent-primary);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.add-student-btn:hover, .export-btn:hover {
  background-color: #1976d2;
}

.student-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.student-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  background-color: var(--bg-secondary);
  transition: all 0.3s ease;
  cursor: pointer;
}

.student-card:hover {
  box-shadow: 0 4px 16px var(--shadow-color);
  transform: translateY(-2px);
  border-color: var(--accent-primary);
}

.student-card.selected {
  border-color: var(--accent-primary);
  background-color: color-mix(in srgb, var(--accent-primary) 10%, var(--bg-secondary));
}

.student-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.student-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.student-id {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.student-info {
  margin-bottom: 1.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.info-label {
  color: var(--text-secondary);
  font-weight: 500;
  min-width: 60px;
}

.info-value {
  color: var(--text-primary);
  text-align: right;
  flex: 1;
}

.membership-info.active {
  color: var(--accent-secondary);
  font-weight: 500;
}

.student-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.edit-btn, .delete-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.edit-btn {
  background-color: var(--accent-primary);
  color: white;
}

.edit-btn:hover {
  background-color: #1976d2;
}

.delete-btn {
  background-color: var(--accent-danger);
  color: white;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.page-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.page-btn:hover:not(:disabled) {
  background-color: var(--bg-tertiary);
  border-color: var(--accent-primary);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: var(--text-secondary);
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-tertiary);
}

.modal-body {
  padding: 1.5rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .student-management {
    padding: 1rem;
  }
  
  .top-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-section {
    min-width: 100%;
  }
  
  .action-buttons {
    justify-content: center;
  }
  
  .student-list {
    grid-template-columns: 1fr;
  }
  
  .student-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .info-item {
    justify-content: flex-start;
    gap: 0.5rem;
  }
  
  .student-actions {
    justify-content: center;
  }
}
</style>
<template>
  <div class="student-management">
    <div class="section-header">
      <h2>学员管理</h2>
      <button class="add-btn" @click="showAddModal = true">
        ➕ 添加学员
      </button>
    </div>



    <!-- 搜索和筛选 -->
    <div class="search-filter">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索学员姓名、电话..."
          @input="filterStudents"

          ref="searchInput"
        >
      </div>
      <div class="filter-options">
        <select v-model="subjectFilter" @change="filterStudents">
          <option value="">全部科目</option>
          <option value="Shooting">射击</option>
          <option value="Archery">射箭</option>
          <option value="Others">其他</option>
        </select>
        <select v-model="classFilter" @change="filterStudents">
          <option value="">全部课程</option>
          <option value="TenTry">体验课</option>
          <option value="Month">月卡</option>
          <option value="Year">年卡</option>
          <option value="Others">其他</option>
        </select>
      </div>
    </div>

    <!-- 学员列表 -->
<div class="students-table">
  <table>
    <thead>
      <tr>
        <th>姓名</th>
        <th>年龄</th>
        <th>电话</th>
        <th>科目</th>
        <th>课程</th>
        <th>最高分数</th>
        <th>备注</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="student in filteredStudents" :key="student.uid">
        <td data-label="姓名">{{ student.name }}</td>
        <td data-label="年龄">{{ student.age }}</td>
        <td data-label="电话">{{ student.phone }}</td>
        <td data-label="科目">
          <span :class="['subject-badge', getSubjectType(student.subject)]">
            {{ getSubjectText(student.subject) }}
          </span>
        </td>
        <td data-label="课程">
          <span :class="['class-badge', getClassType(student.class)]">
            {{ getClassText(student.class) }}
          </span>
        </td>
        <td data-label="最高分数">{{ getHighestScore(student) }}</td>
        <td data-label="备注">{{ student.note || '-' }}</td>
        <td class="actions">
          <button class="edit-btn" @click="editStudent(student)">✏️</button>
          <button class="delete-btn" @click="deleteStudent(student.uid)">🗑️</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>

    <!-- 统计信息 -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>总学员数</h3>
        <div class="stat-value">{{ totalStudents }}</div>
      </div>
      <div class="stat-card">
        <h3>体验课学员</h3>
        <div class="stat-value">{{ trialStudents }}</div>
      </div>
      <div class="stat-card">
        <h3>月卡学员</h3>
        <div class="stat-value">{{ monthlyStudents }}</div>
      </div>
      <div class="stat-card">
        <h3>年卡学员</h3>
        <div class="stat-value">{{ yearlyStudents }}</div>
      </div>
    </div>

    <!-- 添加/编辑学员模态框 -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ showAddModal ? '添加学员' : '编辑学员' }}</h3>
          <button class="close-btn" @click="closeModals">✖️</button>
        </div>
        <div class="modal-body">
          <!-- 科目选择切换按钮 -->
          <div class="subject-toggle">
            <button 
              :class="['subject-btn', { active: currentStudent.subject === 'Shooting' }]"
              @click="currentStudent.subject = 'Shooting'"
            >
              射击
            </button>
            <button 
              :class="['subject-btn', { active: currentStudent.subject === 'Archery' }]"
              @click="currentStudent.subject = 'Archery'"
            >
              射箭
            </button>
            <button 
              :class="['subject-btn', { active: currentStudent.subject === 'Others' }]"
              @click="currentStudent.subject = 'Others'"
            >
              其他
            </button>
          </div>
          
          <div class="form-group">
            <label>姓名</label>
            <input v-model="currentStudent.name" type="text" placeholder="请输入学员姓名">
          </div>
          <div class="form-group">
            <label>年龄</label>
            <input v-model.number="currentStudent.age" type="number" placeholder="请输入年龄" min="1" max="120">
          </div>
          <div class="form-group">
            <label>电话</label>
            <input v-model="currentStudent.phone" type="tel" placeholder="请输入电话号码">
          </div>
          <div class="form-group">
            <label>课程类型</label>
            <select v-model="currentStudent.classType">
              <option value="">请选择课程</option>
              <option value="TenTry">体验课 (10次)</option>
              <option value="Month">月卡</option>
              <option value="Year">年卡</option>
              <option value="Others">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="currentStudent.note" rows="3" placeholder="请输入备注信息"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModals">取消</button>
          <button class="save-btn" @click="saveStudent">保存</button>
        </div>
      </div>
    </div>


  </div>
</template>

<script>
import { ref, computed, onMounted, inject } from 'vue'
import { ApiService } from '../api/ApiService'
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default {
  name: 'StudentManagement',
  setup() {
    const students = ref([])
    const searchQuery = ref('')
    const classFilter = ref('')
    const subjectFilter = ref('')
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const currentStudent = ref({
  uid: null,
  name: '',
  age: '',
  phone: '',
  classType: '',
  note: '',
  subject: 'Shooting'
})
    const searchInput = ref(null)
    const { showError } = inject('errorHandler')

    const filteredStudents = computed(() => {
      let filtered = students.value
      
      if (searchQuery.value) {
        filtered = filtered.filter(student => 
          student.name.includes(searchQuery.value) || 
          student.phone.includes(searchQuery.value)
        )
      }
      
      if (subjectFilter.value) {
        filtered = filtered.filter(student => student.subject === subjectFilter.value)
      }
      
      if (classFilter.value) {
        filtered = filtered.filter(student => student.class === classFilter.value)
      }
      
      return filtered
    })

    const totalStudents = computed(() => students.value.length)
    const trialStudents = computed(() => students.value.filter(s => s.class === 'TenTry').length)
    const monthlyStudents = computed(() => students.value.filter(s => s.class === 'Month').length)
    const yearlyStudents = computed(() => students.value.filter(s => s.class === 'Year').length)

    const getClassText = (classType) => {
      const classMap = {
        'TenTry': '体验课',
        'Month': '月卡',
        'Year': '年卡',
        'Others': '其他'
      }
      return classMap[classType] || classType
    }

    const getClassType = (classType) => {
      return classType.toLowerCase()
    }

    const getSubjectText = (subject) => {
      const subjectMap = {
        'Shooting': '射击',
        'Archery': '射箭',
        'Others': '其他'
      }
      return subjectMap[subject] || subject
    }

    const getSubjectType = (subject) => {
      return subject.toLowerCase()
    }

    const filterStudents = () => {
      // 搜索逻辑已通过computed属性实现
    }

    const loadStudents = async () => {
      try {
        const data = await ApiService.getAllStudents()
        students.value = data
      } catch (error) {
        console.error('加载学员数据失败:', error)
        showError('加载失败', '加载学员数据时发生错误', error.message)
      }
    }

    const editStudent = (student) => {
      currentStudent.value = {
  uid: student.uid,
  name: student.name,
  age: student.age,
  phone: student.phone,
  classType: student.class,
  note: student.note || '',
  subject: student.subject || 'Shooting'
}
      showEditModal.value = true
    }

    const deleteStudent = async (uid) => {
      if (confirm('确定要删除这个学员吗？')) {
        try {
          await ApiService.deleteStudent(uid)
          await loadStudents() // 重新加载数据
        } catch (error) {
          console.error('删除学员失败:', error)
          showError('删除失败', '删除学员时发生错误', error.message)
        }
      }
    }
    
    const validatePhone = (phone) => {
  // 短号优先检测
  if (/^\d{3,6}$/.test(phone.replace(/[-\s]/g, ''))) return true; 
  
  // 国际号码校验
  const phoneObj = parsePhoneNumberFromString(phone);
  return !!phoneObj?.isValid(); // 
};

    const saveStudent = async () => {
      if (!currentStudent.value.name || !currentStudent.value.age || !currentStudent.value.phone) {
        showError('输入错误', '请填写学员姓名、年龄和电话等必要信息')
        return
      }
      
      if (!validatePhone(currentStudent.value.phone)) {
    showError('输入错误', '请输入有效的手机号码')
    return
  }

      try {
        if (showAddModal.value) {
          // 添加新学员
          await ApiService.addStudent(
            currentStudent.value.name,
            currentStudent.value.age,
            currentStudent.value.classType || 'Others',
            currentStudent.value.phone,
            currentStudent.value.note,
            currentStudent.value.subject
          )
        } else {
          // 编辑现有学员
          await ApiService.updateStudentInfo(currentStudent.value.uid, {
            name: currentStudent.value.name,
            age: currentStudent.value.age,
            classType: currentStudent.value.classType,
            phone: currentStudent.value.phone,
            note: currentStudent.value.note,
            subject: currentStudent.value.subject
          })
        }

        await loadStudents() // 重新加载数据
        closeModals()
      } catch (error) {
        console.error('保存学员失败:', error)
        showError('保存失败', '保存学员信息时发生错误', error.message)
      }
    }

    const getHighestScore = (student) => {
      if (!student.rings || student.rings.length === 0) {
        return '-'
      }
      const maxScore = Math.max(...student.rings)
      return maxScore.toFixed(1)
    }

    const closeModals = () => {
      showAddModal.value = false
      showEditModal.value = false
      currentStudent.value = {
        uid: null,
        name: '',
        age: '',
        phone: '',
        classType: '',
        note: '',
        subject: 'Shooting'
      }
    }







    onMounted(() => {
      loadStudents()
    })

    return {
      students,
      filteredStudents,
      searchQuery,
      classFilter,
      subjectFilter,
      showAddModal,
      showEditModal,
      currentStudent,
      searchInput,
      totalStudents,
      trialStudents,
      monthlyStudents,
      yearlyStudents,
      getClassText,
      getClassType,
      getSubjectText,
      getSubjectType,
      filterStudents,
      editStudent,
      deleteStudent,
      saveStudent,
      getHighestScore,
      closeModals
    }
  }
}
</script>

<style scoped>
.student-management {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.add-btn {
  background-color: var(--accent-secondary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-btn:hover {
  background-color: #45a049;
  transform: translateY(-1px);
}

.search-filter {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-options {
  display: flex;
  gap: 1.0rem;
  align-items: center;
}

.search-box input {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  width: 300px;
}

.filter-options select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.students-table {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.students-table table {
  width: 100%;
  border-collapse: collapse;
}

.students-table th,
.students-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.students-table td {
  white-space: pre-line; /* 支持换行 */
  word-break: break-all; /* 长单词自动换行 */
  max-width: 300px; /* 限制最大宽度 */
  overflow: hidden;
  text-overflow: ellipsis;
}

.students-table th:nth-child(6),
.students-table td:nth-child(6) {
  width: 200px; /* 设置备注列宽度 */
  min-width: 150px;
}

.students-table th {
  background-color: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-primary);
}

.students-table tr:hover {
  background-color: var(--bg-tertiary);
}

.class-badge, .subject-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.class-badge.tentry {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.class-badge.month {
  background-color: #e3f2fd;
  color: #1976d2;
}

.class-badge.year {
  background-color: #fff3e0;
  color: #f57c00;
}

.class-badge.others {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.subject-badge.shooting {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.subject-badge.archery {
  background-color: #fff3e0;
  color: #f57c00;
}

.subject-badge.others {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn, .delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.edit-btn:hover {
  background-color: var(--accent-primary);
  color: white;
}

.delete-btn:hover {
  background-color: var(--accent-danger);
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.stat-card h3 {
  margin: 0 0 1rem 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--bg-primary);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.form-group input[type="text"][v-model="currentStudent.note"] {
  height: 60px;
  resize: vertical;
  padding: 0.75rem;
}



.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.cancel-btn, .save-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.cancel-btn {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.save-btn {
  background-color: var(--accent-primary);
  color: white;
}

.cancel-btn:hover {
  background-color: var(--border-color);
}

.save-btn:hover {
  background-color: #1976d2;
}

/* 科目选择切换按钮样式 - 参考收支统计页面 */
.subject-toggle {
  display: flex;
  margin-bottom: 1rem;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.subject-btn {
  flex: 1;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary);
}

.subject-btn.active {
  background: var(--accent-primary);
  color: white;
}

.form-group textarea {
  /* 基础布局与尺寸 */
  width: 100%;
  min-height: 80px; /* 增大最小高度，提升输入舒适性 */
  height: auto;
  resize: vertical; /* 仅允许垂直拉伸（更可控）,换成none消除小白点 */
  padding: 0.75rem;  /* 内边距与其他输入框统一 */

  /* 视觉风格（与项目主题变量联动） */
  border: 1px solid var(--border-color);
  border-radius: 8px; /* 更大圆角，和按钮/输入框风格统一 */
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem; /* 字体大小与其他表单元素统一 */
  line-height: 1.5;    /* 行高优化，提升可读性 */
  transition: all 0.3s ease; /* 过渡动画，让交互更丝滑 */
}

/* 占位符（Placeholder）样式优化 */
.form-group textarea::placeholder {
  color: var(--text-secondary); /* 浅色调，降低视觉干扰 */
  opacity: 0.8; /* 透明度弱化，更柔和 */
}

/*  hover 交互：轻量反馈 */
.form-group textarea:hover {
  border-color: var(--accent-primary-light); /* 主题色浅版，暗示可交互 */
}

/*  focus 交互：强反馈引导 */
.form-group textarea:focus {
  outline: none; /* 清除默认聚焦轮廓 */
  border-color: var(--accent-primary); /* 主题色高亮边框 */
  box-shadow: 0 0 0 2px rgba(var(--accent-primary-rgb), 0.2); /* 柔和焦点阴影 */
}

@media (max-width: 768px) {
  .student-management {
    display: flex;
    flex-direction: column;
  }
  
  /* 调整手机端布局顺序 */
  .stats-grid {
    order: 1;
    grid-template-columns: repeat(2, 1fr);
    margin-bottom: 1rem;
  }
  
  .search-filter {
    order: 2;
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 1rem;
  }
  
  .students-table {
    order: 3;
  }
  
  .search-box input {
    width: 100%;
    margin-bottom: 1rem;
  }
  
  .filter-options {
    flex-direction: column;
    gap: 1rem;
  }
  
  .filter-options select {
    width: 100%;
  }
  
  /* 手机端表格优化 - 改为卡片式布局 */
  .students-table table,
  .students-table thead,
  .students-table tbody,
  .students-table th,
  .students-table td,
  .students-table tr {
    display: block;
  }
  
  .students-table thead tr {
    position: absolute;
    top: -9999px;
    left: -9999px;
  }
  
  .students-table tr {
    background-color: var(--bg-secondary);
    border-radius: 8px;
    margin-bottom: 1rem;
    padding: 1rem;
    box-shadow: 0 2px 8px var(--shadow-color);
    border: 1px solid var(--border-color);
  }
  
  .students-table td {
    border: none;
    padding: 0.5rem 0;
    position: relative;
    padding-left: 35%;
    text-align: left;
    white-space: normal;
    word-break: break-word;
    max-width: none;
  }
  
  .students-table td:before {
    content: attr(data-label);
    position: absolute;
    left: 0;
    width: 30%;
    padding-right: 10px;
    white-space: nowrap;
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .students-table .actions {
    padding-left: 0;
    justify-content: flex-start;
    gap: 1rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }
  
  .students-table .actions:before {
    display: none;
  }
}
</style>

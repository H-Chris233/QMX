<template>
  <div class="student-management">
    <div class="section-header">
      <h2>学员管理</h2>
      <button class="add-btn" @click="showAddModal = true" title="快捷键: Ctrl+N">
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
          @keyup.ctrl.f.prevent="focusSearch"
          ref="searchInput"
        >
      </div>
      <div class="filter-options">
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
        <th>课程</th>
        <th>射击记录</th>
        <th>备注</th> <!-- 新增列 -->
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="student in filteredStudents" :key="student.uid">
        <td>{{ student.name }}</td>
        <td>{{ student.age }}</td>
        <td>{{ student.phone }}</td>
        <td>
          <span :class="['class-badge', getClassType(student.class)]">
            {{ getClassText(student.class) }}
          </span>
        </td>
        <td>{{ student.rings.length }} 次记录</td>
        <td>{{ student.note || '-' }}</td> <!-- 新增列 -->
        <td class="actions">
          <button class="score-btn" @click="showScoreModal(student)" title="快捷键: S">🎯</button>
          <button class="edit-btn" @click="editStudent(student)" title="快捷键: E">✏️</button>
          <button class="delete-btn" @click="deleteStudent(student.uid)" title="快捷键: Delete">🗑️</button>
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

    <!-- 添加分数模态框 -->
    <div v-if="showScoreModalFlag" class="modal-overlay" @click="closeScoreModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>添加射击成绩 - {{ currentScoreStudent.name }}</h3>
          <button class="close-btn" @click="closeScoreModal">✖️</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>射击成绩 (环数)</label>
            <input v-model.number="newScore" type="number" placeholder="请输入环数" min="0" max="10.9" step="0.1" @keyup.enter="addScore">
          </div>
          <div class="recent-scores">
            <h4>最近成绩</h4>
            <div class="scores-list">
              <span v-for="(score, index) in recentScores" :key="index" class="score-tag">
                {{ score }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeScoreModal">取消</button>
          <button class="save-btn" @click="addScore">添加成绩</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { ApiService } from '../api/ApiService'
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default {
  name: 'StudentManagement',
  setup() {
    const students = ref([])
    const searchQuery = ref('')
    const classFilter = ref('')
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const showScoreModalFlag = ref(false)
    const currentStudent = ref({
  uid: null,
  name: '',
  age: '',
  phone: '',
  classType: '',
  note: ''
})
    const currentScoreStudent = ref({})
    const newScore = ref('')
    const recentScores = ref([])
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
  note: student.note || ''
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
            currentStudent.value.note
          )
        } else {
          // 编辑现有学员
          await ApiService.updateStudentInfo(currentStudent.value.uid, {
            name: currentStudent.value.name,
            age: currentStudent.value.age,
            classType: currentStudent.value.classType,
            phone: currentStudent.value.phone,
            note: currentStudent.value.note
          })
        }

        await loadStudents() // 重新加载数据
        closeModals()
      } catch (error) {
        console.error('保存学员失败:', error)
        showError('保存失败', '保存学员信息时发生错误', error.message)
      }
    }

    const showScoreModal = async (student) => {
      currentScoreStudent.value = student
      try {
        const scores = await ApiService.getStudentScores(student.uid)
        recentScores.value = scores.slice(-10) // 显示最近10次成绩
        showScoreModalFlag.value = true
      } catch (error) {
        console.error('获取成绩失败:', error)
        showError('获取失败', '获取学员成绩时发生错误', error.message)
        recentScores.value = []
      }
    }

    const addScore = async () => {
      if (!newScore.value || newScore.value < 0 || newScore.value > 10.9) {
        showError('输入错误', '请输入有效的成绩 (0-10.9)')
        return
      }

      try {
        await ApiService.addScore(currentScoreStudent.value.uid, newScore.value)
        await loadStudents() // 重新加载数据
        closeScoreModal()
      } catch (error) {
        console.error('添加成绩失败:', error)
        showError('添加失败', '添加学员成绩时发生错误', error.message)
      }
    }

    const closeModals = () => {
      showAddModal.value = false
      showEditModal.value = false
      currentStudent.value = {
        uid: null,
        name: '',
        age: '',
        phone: '',
        classType: ''
      }
    }

    const closeScoreModal = () => {
      showScoreModalFlag.value = false
      currentScoreStudent.value = {}
      newScore.value = ''
      recentScores.value = []
    }

    const focusSearch = () => {
      if (searchInput.value) {
        searchInput.value.focus()
      }
    }

    // 键盘事件处理
    const handleKeyDown = (event) => {
      // 如果模态框打开，只处理模态框内的快捷键
      if (showAddModal.value || showEditModal.value || showScoreModalFlag.value) {
        if (event.key === 'Escape') {
          if (showScoreModalFlag.value) {
            closeScoreModal()
          } else {
            closeModals()
          }
        }
        return
      }

      // 全局快捷键
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault()
        showAddModal.value = true
      } else if (event.ctrlKey && event.key === 'f') {
        event.preventDefault()
        focusSearch()
      }
    }

    onMounted(() => {
      loadStudents()
      window.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
    })

    return {
      students,
      filteredStudents,
      searchQuery,
      classFilter,
      showAddModal,
      showEditModal,
      showScoreModalFlag,
      currentStudent,
      currentScoreStudent,
      newScore,
      recentScores,
      searchInput,
      totalStudents,
      trialStudents,
      monthlyStudents,
      yearlyStudents,
      getClassText,
      getClassType,
      filterStudents,
      editStudent,
      deleteStudent,
      saveStudent,
      showScoreModal,
      addScore,
      closeModals,
      closeScoreModal,
      focusSearch
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

.class-badge {
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

.actions {
  display: flex;
  gap: 0.5rem;
}

.score-btn, .edit-btn, .delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.score-btn:hover {
  background-color: #4caf50;
  color: white;
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

.recent-scores {
  margin-top: 1rem;
}

.recent-scores h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.scores-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.score-tag {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
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
  .search-filter {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box input {
    width: 100%;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .students-table {
    overflow-x: auto;
  }
  
  .students-table table {
    min-width: 600px;
  }
}
</style>

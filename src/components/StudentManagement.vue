<template>
  <div class="student-management">
    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-progress"></div>
    
    <div class="section-header">
      <h2>学员管理</h2>
      <button class="add-btn" @click="showAddModal = true" :disabled="loading">
        {{ loading ? '加载中...' : '➕ 添加学员' }}
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
        />
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
              <button class="edit-btn" @click="editStudent(student)" :disabled="loading">✏️</button>
              <button class="delete-btn" @click="deleteStudent(student.uid)" :disabled="loading">
                🗑️
              </button>
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
    <div
      v-if="showAddModal || showEditModal"
      class="modal-overlay"
      @click="closeModals"
    >
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ showAddModal ? '添加学员' : '编辑学员' }}</h3>
          <button class="close-btn" @click="closeModals">✖️</button>
        </div>
        <div class="modal-body">
          <!-- 科目选择切换按钮 -->
          <div class="subject-toggle">
            <button
              :class="[
                'subject-btn',
                { active: currentStudent.subject === 'Shooting' },
              ]"
              @click="currentStudent.subject = 'Shooting'"
            >
              射击
            </button>
            <button
              :class="[
                'subject-btn',
                { active: currentStudent.subject === 'Archery' },
              ]"
              @click="currentStudent.subject = 'Archery'"
            >
              射箭
            </button>
            <button
              :class="[
                'subject-btn',
                { active: currentStudent.subject === 'Others' },
              ]"
              @click="currentStudent.subject = 'Others'"
            >
              其他
            </button>
          </div>

          <div class="form-group">
            <label>姓名</label>
            <input
              v-model="currentStudent.name"
              type="text"
              placeholder="请输入学员姓名"
            />
          </div>
          <div class="form-group">
            <label>年龄</label>
            <input
              v-model.number="currentStudent.age"
              type="number"
              placeholder="请输入年龄"
              min="1"
              max="120"
            />
          </div>
          <div class="form-group">
            <label>电话</label>
            <input
              v-model="currentStudent.phone"
              type="tel"
              placeholder="请输入电话号码"
            />
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
            <textarea
              v-model="currentStudent.note"
              rows="3"
              placeholder="请输入备注信息"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModals" :disabled="loading">取消</button>
          <button class="save-btn" @click="saveStudent" :disabled="loading">
            {{ loading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { ApiService } from '../api/ApiService';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default {
  name: 'StudentManagement',
  setup() {
    const loading = ref(false);
    const students = ref([]);
    const searchQuery = ref('');
    const classFilter = ref('');
    const subjectFilter = ref('');
    const showAddModal = ref(false);
    const showEditModal = ref(false);
    const currentStudent = ref({
      uid: null,
      name: '',
      age: '',
      phone: '',
      classType: '',
      note: '',
      subject: 'Shooting',
    });
    const searchInput = ref(null);
    const errorHandler = inject('errorHandler');
    
    // 确保错误处理函数可用
    const showError = errorHandler?.showError || ((title, message, details) => {
      console.error(`${title}: ${message}`, details);
      alert(`${title}\n${message}`);
    });
    
    const showSuccess = errorHandler?.showSuccess || ((title, message) => {
      console.log(`✅ ${title}: ${message}`);
      // 可以使用简单的alert作为降级方案
      // alert(`${title}: ${message}`);
    });
    
    // 调试：检查错误处理函数是否正确注入
    if (!errorHandler) {
      console.warn('⚠️ errorHandler 未正确注入到 StudentManagement 组件');
    } else {
      console.log('✅ errorHandler 已成功注入到 StudentManagement 组件');
    }

    const filteredStudents = computed(() => {
      try {
        let filtered = students.value || [];

        if (searchQuery.value && searchQuery.value.trim()) {
          const query = searchQuery.value.trim().toLowerCase();
          filtered = filtered.filter((student) => {
            if (!student) return false;
            const name = (student.name || '').toLowerCase();
            const phone = (student.phone || '').toLowerCase();
            return name.includes(query) || phone.includes(query);
          });
        }

        if (subjectFilter.value) {
          filtered = filtered.filter(
            (student) => student && student.subject === subjectFilter.value,
          );
        }

        if (classFilter.value) {
          filtered = filtered.filter(
            (student) => student && student.class === classFilter.value,
          );
        }

        return filtered;
      } catch (error) {
        console.error('过滤学员数据失败:', error);
        // 对于计算属性的错误，返回原始数据而不是显示弹窗
        return students.value || [];
      }
    });

    const totalStudents = computed(() => {
      try {
        return (students.value || []).length;
      } catch (error) {
        console.error('计算总学员数失败:', error);
        return 0;
      }
    });

    const trialStudents = computed(() => {
      try {
        return (students.value || []).filter((s) => s && s.class === 'TenTry').length;
      } catch (error) {
        console.error('计算体验课学员数失败:', error);
        return 0;
      }
    });

    const monthlyStudents = computed(() => {
      try {
        return (students.value || []).filter((s) => s && s.class === 'Month').length;
      } catch (error) {
        console.error('计算月卡学员数失败:', error);
        return 0;
      }
    });

    const yearlyStudents = computed(() => {
      try {
        return (students.value || []).filter((s) => s && s.class === 'Year').length;
      } catch (error) {
        console.error('计算年卡学员数失败:', error);
        return 0;
      }
    });

    const getClassText = (classType) => {
      const classMap = {
        TenTry: '体验课',
        Month: '月卡',
        Year: '年卡',
        Others: '其他',
      };
      return classMap[classType] || classType;
    };

    const getClassType = (classType) => {
      return classType.toLowerCase();
    };

    const getSubjectText = (subject) => {
      const subjectMap = {
        Shooting: '射击',
        Archery: '射箭',
        Others: '其他',
      };
      return subjectMap[subject] || subject;
    };

    const getSubjectType = (subject) => {
      return subject.toLowerCase();
    };

    const filterStudents = () => {
      try {
        // 搜索逻辑已通过computed属性实现
        // 这个函数主要用于手动触发过滤
      } catch (error) {
        console.error('过滤学员失败:', error);
        showError('过滤失败', '学员搜索过滤时发生错误', error.message || '未知错误');
      }
    };

    const loadStudents = async () => {
      if (loading.value) {
        console.warn('学员数据正在加载中，跳过重复请求');
        return;
      }

      loading.value = true;
      
      try {
        const data = await ApiService.getAllStudents();
        
        // 验证返回的数据
        if (!Array.isArray(data)) {
          throw new Error('返回的学员数据格式不正确，期望数组格式');
        }
        
        // 验证每个学员数据的完整性
        const validStudents = data.filter(student => {
          if (!student || typeof student !== 'object') return false;
          if (!student.uid || !student.name) return false;
          return true;
        });
        
        if (validStudents.length !== data.length) {
          console.warn(`过滤了 ${data.length - validStudents.length} 个无效学员记录`);
        }
        
        students.value = validStudents;
        console.log(`成功加载 ${validStudents.length} 个学员记录`);
      } catch (error) {
        console.error('加载学员数据失败:', error);
        students.value = []; // 确保有默认值
        showError(
          '加载失败', 
          '加载学员数据时发生错误，请检查网络连接或稍后重试', 
          error.message || '未知错误'
        );
      } finally {
        loading.value = false;
      }
    };

    const editStudent = (student) => {
      try {
        if (!student || !student.uid) {
          showError('编辑失败', '学员数据无效，无法编辑');
          return;
        }

        currentStudent.value = {
          uid: student.uid,
          name: student.name || '',
          age: student.age || '',
          phone: student.phone || '',
          classType: student.class || 'Others',
          note: student.note || '',
          subject: student.subject || 'Shooting',
        };
        showEditModal.value = true;
      } catch (error) {
        console.error('编辑学员失败:', error);
        showError('编辑失败', '准备编辑学员信息时发生错误', error.message || '未知错误');
      }
    };

    const deleteStudent = async (uid) => {
      if (loading.value) {
        console.warn('正在处理其他操作，请稍后再试');
        showError('操作失败', '正在处理其他操作，请稍后再试');
        return;
      }

      if (!uid || isNaN(Number(uid)) || Number(uid) <= 0) {
        showError('删除失败', '无效的学员ID');
        return;
      }

      // 查找要删除的学员信息
      const student = students.value.find(s => s.uid === uid);
      const confirmMessage = student 
        ? `确定要删除学员"${student.name}"吗？\n此操作不可撤销！`
        : '确定要删除这个学员吗？此操作不可撤销！';

      if (!confirm(confirmMessage)) {
        return;
      }

      loading.value = true;
      
      try {
        await ApiService.deleteStudent(Number(uid));
        
        console.log(`成功删除学员 ID: ${uid}`);
        
        // 重新加载数据
        await loadStudents();
        
        // 显示成功消息
        showSuccess('删除成功', student ? `学员"${student.name}"已删除` : '学员已删除');
      } catch (error) {
        console.error('删除学员失败:', error);
        showError(
          '删除失败', 
          '删除学员时发生错误，请稍后重试', 
          error.message || '未知错误'
        );
      } finally {
        loading.value = false;
      }
    };

    // 输入验证函数
    const validateStudentInput = (student) => {
      const errors = [];
      
      if (!student.name || typeof student.name !== 'string' || student.name.trim().length === 0) {
        errors.push('姓名不能为空');
      } else if (student.name.trim().length > 50) {
        errors.push('姓名长度不能超过50个字符');
      }
      
      const age = Number(student.age);
      if (!age || isNaN(age) || age < 1 || age > 120) {
        errors.push('年龄必须是1-120之间的有效数字');
      }
      
      if (!student.phone || typeof student.phone !== 'string') {
        errors.push('电话号码不能为空');
      }
      
      if (student.note && student.note.length > 500) {
        errors.push('备注长度不能超过500个字符');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    };

    const validatePhone = (phone) => {
      try {
        if (!phone || typeof phone !== 'string') return false;
        
        const cleanPhone = phone.replace(/[-\s]/g, '');
        
        // 短号优先检测 (3-6位数字)
        if (/^\d{3,6}$/.test(cleanPhone)) return true;

        // 中国手机号码检测 (11位，1开头)
        if (/^1[3-9]\d{9}$/.test(cleanPhone)) return true;

        // 国际号码校验
        const phoneObj = parsePhoneNumberFromString(phone);
        return !!phoneObj?.isValid();
      } catch (error) {
        console.warn('电话验证失败:', error);
        return false;
      }
    };

    const saveStudent = async () => {
      // 防止重复提交
      if (loading.value) {
        console.warn('正在保存中，请勿重复提交');
        return;
      }

      // 输入验证
      const validation = validateStudentInput(currentStudent.value);
      if (!validation.isValid) {
        showError('输入错误', validation.errors.join('；'));
        return;
      }

      if (!validatePhone(currentStudent.value.phone)) {
        showError('输入错误', '请输入有效的手机号码');
        return;
      }

      loading.value = true;
      
      try {
        const sanitizedStudent = {
          ...currentStudent.value,
          name: currentStudent.value.name.trim(),
          age: Number(currentStudent.value.age),
          classType: currentStudent.value.classType || 'Others',
          phone: currentStudent.value.phone.trim(),
          note: currentStudent.value.note?.trim() || '',
          subject: currentStudent.value.subject || 'Shooting',
        };

        if (showAddModal.value) {
          // 添加新学员
          const result = await ApiService.addStudent(
            sanitizedStudent.name,
            sanitizedStudent.age,
            sanitizedStudent.classType,
            sanitizedStudent.phone,
            sanitizedStudent.note,
            sanitizedStudent.subject,
          );
          
          if (!result || !result.uid) {
            throw new Error('学员添加失败，返回数据无效');
          }
          
          console.log('学员添加成功:', result);
        } else {
          // 编辑现有学员
          if (!sanitizedStudent.uid) {
            throw new Error('学员ID无效，无法更新');
          }
          
          await ApiService.updateStudentInfo(sanitizedStudent.uid, {
            name: sanitizedStudent.name,
            age: sanitizedStudent.age,
            classType: sanitizedStudent.classType,
            phone: sanitizedStudent.phone,
            note: sanitizedStudent.note,
            subject: sanitizedStudent.subject,
          });
          
          console.log('学员更新成功');
        }

        const isAdding = showAddModal.value;
        
        await loadStudents(); // 重新加载数据
        closeModals();
        
        // 显示成功消息
        showSuccess('操作成功', isAdding ? '学员添加成功' : '学员信息更新成功');
      } catch (error) {
        console.error('保存学员失败:', error);
        const errorMessage = error.message || '未知错误';
        showError(
          '保存失败', 
          `保存学员信息时发生错误: ${errorMessage}`,
          error.stack
        );
      } finally {
        loading.value = false;
      }
    };

    const getHighestScore = (student) => {
      try {
        if (!student || !student.rings || !Array.isArray(student.rings) || student.rings.length === 0) {
          return '-';
        }
        
        // 过滤出有效的数字成绩
        const validScores = student.rings.filter(score => 
          typeof score === 'number' && !isNaN(score) && isFinite(score)
        );
        
        if (validScores.length === 0) {
          return '-';
        }
        
        const maxScore = Math.max(...validScores);
        return maxScore.toFixed(1);
      } catch (error) {
        console.warn('获取最高分数失败:', student, error);
        // 对于显示函数的错误，通常不需要弹窗，只记录日志
        return '-';
      }
    };

    const closeModals = () => {
      try {
        showAddModal.value = false;
        showEditModal.value = false;
        currentStudent.value = {
          uid: null,
          name: '',
          age: '',
          phone: '',
          classType: '',
          note: '',
          subject: 'Shooting',
        };
      } catch (error) {
        console.error('关闭模态框失败:', error);
        // 对于UI操作的错误，通常不需要弹窗，但可以记录
        // showError('操作失败', '关闭窗口时发生错误', error.message);
      }
    };

    onMounted(() => {
      try {
        loadStudents();
      } catch (error) {
        console.error('组件初始化失败:', error);
        showError('初始化失败', '组件初始化时发生错误', error.message || '未知错误');
      }
    });

    return {
      loading,
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
      closeModals,
    };
  },
};
</script>

<style scoped>
.student-management {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
}

/* 加载进度条 */
.loading-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: var(--accent-primary);
  transform: scaleX(0);
  transform-origin: left;
  animation: loading 1.5s ease-in-out forwards;
  z-index: 10;
}

@keyframes loading {
  to {
    transform: scaleX(1);
    transform-origin: right;
  }
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

.class-badge,
.subject-badge {
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

.edit-btn,
.delete-btn {
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

.form-group input[type='text'][v-model='currentStudent.note'] {
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

.cancel-btn,
.save-btn {
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
  padding: 0.75rem; /* 内边距与其他输入框统一 */

  /* 视觉风格（与项目主题变量联动） */
  border: 1px solid var(--border-color);
  border-radius: 8px; /* 更大圆角，和按钮/输入框风格统一 */
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem; /* 字体大小与其他表单元素统一 */
  line-height: 1.5; /* 行高优化，提升可读性 */
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

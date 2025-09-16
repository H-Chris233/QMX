<template>
  <div class="grade-management">
    <div class="section-header">
      <h2>成绩管理</h2>
      <div class="header-actions">
        <button class="import-btn" @click="showImportModal = true">
          📥 导入成绩
        </button>
        <button class="add-btn" @click="showAddGrade = true">
          ➕ 添加成绩
        </button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <h3>平均分</h3>
        <div class="stat-value">{{ averageScore }}</div>
        <div class="stat-subtitle">总体平均</div>
      </div>
      <div class="stat-card">
        <h3>最高分</h3>
        <div class="stat-value">{{ highestScore }}</div>
        <div class="stat-subtitle">{{ highestScorer }}</div>
      </div>
      <div class="stat-card">
        <h3>及格率</h3>
        <div class="stat-value">{{ passRate }}%</div>
        <div class="stat-subtitle">{{ passedCount }}/{{ totalCount }} 人</div>
      </div>
      <div class="stat-card">
        <h3>优秀率</h3>
        <div class="stat-value">{{ excellentRate }}%</div>
        <div class="stat-subtitle">{{ excellentCount }} 人</div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <div class="filter-group">
        <label>课程</label>
        <select v-model="selectedCourse" @change="filterGrades">
          <option value="">全部课程</option>
          <option v-for="course in courses" :key="course" :value="course">
            {{ course }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <label>考试类型</label>
        <select v-model="selectedExamType" @change="filterGrades">
          <option value="">全部类型</option>
          <option value="期中考试">期中考试</option>
          <option value="期末考试">期末考试</option>
          <option value="平时测验">平时测验</option>
          <option value="作业">作业</option>
        </select>
      </div>
      <div class="filter-group">
        <label>学员</label>
        <input
          v-model="studentSearch"
          type="text"
          placeholder="搜索学员姓名"
          @input="filterGrades"
        />
      </div>
    </div>

    <!-- 成绩表格 -->
    <div class="grades-table">
      <table>
        <thead>
          <tr>
            <th>学员姓名</th>
            <th>课程</th>
            <th>考试类型</th>
            <th>分数</th>
            <th>等级</th>
            <th>考试日期</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="grade in filteredGrades" :key="grade.id">
            <td>{{ grade.studentName }}</td>
            <td>{{ grade.course }}</td>
            <td>{{ grade.examType }}</td>
            <td>
              <div class="score-display">
                <span :class="['score', getScoreClass(grade.score)]">{{
                  grade.score
                }}</span>
                <div class="score-bar">
                  <div
                    class="score-fill"
                    :style="{
                      width: grade.score + '%',
                      backgroundColor: getScoreColor(grade.score),
                    }"
                  ></div>
                </div>
              </div>
            </td>
            <td>
              <span :class="['grade-level', getScoreClass(grade.score)]">
                {{ getGradeLevel(grade.score) }}
              </span>
            </td>
            <td>{{ grade.examDate || grade.date }}</td>
            <td class="notes">{{ grade.notes || '-' }}</td>
            <td class="actions">
              <button class="edit-btn" @click="editGrade(grade)">✏️</button>
              <button class="delete-btn" @click="deleteGrade(grade.id)">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 成绩分布图表 -->
    <div class="grade-distribution">
      <h3>成绩分布</h3>
      <div class="distribution-chart">
        <div class="distribution-bars">
          <div
            v-for="(range, index) in scoreRanges"
            :key="index"
            class="distribution-item"
          >
            <div class="range-label">{{ range.label }}</div>
            <div class="range-bar">
              <div
                class="range-fill"
                :style="{
                  width: (range.count / range.maxCount) * 100 + '%',
                  backgroundColor: range.color,
                }"
              ></div>
            </div>
            <div class="range-count">{{ range.count }}人</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑成绩模态框 -->
    <div
      v-if="showAddGrade || showEditGrade"
      class="modal-overlay"
      @click="closeModals"
    >
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ showAddGrade ? '添加成绩' : '编辑成绩' }}</h3>
          <button class="close-btn" @click="closeModals">✖️</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>学员姓名</label>
            <select v-model="currentGrade.studentId">
              <option value="">请选择学员</option>
              <option
                v-for="student in students"
                :key="student.id"
                :value="student.id"
              >
                {{ student.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>课程</label>
            <select v-model="currentGrade.course">
              <option value="">请选择课程</option>
              <option v-for="course in courses" :key="course" :value="course">
                {{ course }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>考试类型</label>
            <select v-model="currentGrade.examType">
              <option value="">请选择类型</option>
              <option value="期中考试">期中考试</option>
              <option value="期末考试">期末考试</option>
              <option value="平时测验">平时测验</option>
              <option value="作业">作业</option>
            </select>
          </div>
          <div class="form-group">
            <label>分数 (0-100)</label>
            <input
              v-model.number="currentGrade.score"
              type="number"
              min="0"
              max="100"
              placeholder="0"
            />
          </div>
          <div class="form-group">
            <label>考试日期</label>
            <DatePicker
              v-model="currentGrade.examDate"
              label="考试日期"
              placeholder="选择考试日期"
              required
            />
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea
              v-model="currentGrade.notes"
              rows="3"
              placeholder="可选备注信息"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModals">取消</button>
          <button class="save-btn" @click="saveGrade">保存</button>
        </div>
      </div>
    </div>

    <!-- 导入成绩模态框 -->
    <div v-if="showImportModal" class="modal-overlay" @click="closeImportModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>导入成绩</h3>
          <button class="close-btn" @click="closeImportModal">✖️</button>
        </div>
        <div class="modal-body">
          <div class="import-section">
            <h4>选择文件</h4>
            <div class="file-upload">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                @change="handleFileUpload"
              />
              <div class="upload-placeholder">
                <span>📁</span>
                <p>点击或拖拽文件到此处</p>
                <p>支持 Excel、CSV 格式</p>
              </div>
            </div>
          </div>

          <div class="import-section">
            <h4>导入模板</h4>
            <div class="template-info">
              <p>请确保文件包含以下列：</p>
              <ul>
                <li>学员姓名</li>
                <li>课程</li>
                <li>考试类型</li>
                <li>分数</li>
                <li>考试日期</li>
                <li>备注（可选）</li>
              </ul>
              <button class="download-template-btn">下载模板</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeImportModal">取消</button>
          <button class="import-btn" @click="importGrades">导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import DatePicker from './DatePicker.vue';

// TypeScript类型定义
interface Grade {
  id: number;
  studentName: string;
  course: string;
  examType: string;
  score: number;
  date: string;
  studentId: number;
  examDate?: string;
  notes?: string;
}

interface Student {
  id: number;
  name: string;
}

interface ErrorHandler {
  showError: (title: string, message: string, details?: string) => void;
  showConfirm: (options: any) => void;
}

// 使用script setup提高类型安全
    const grades = ref<Grade[]>([]);
    const students = ref<Student[]>([]);
    const selectedCourse = ref('');
    const selectedExamType = ref('');
    const studentSearch = ref('');
    const showAddGrade = ref(false);
    const showEditGrade = ref(false);
    const showImportModal = ref(false);
    const currentGrade = ref({
      id: null,
      studentId: '',
      studentName: '',
      course: '',
      examType: '',
      score: 0,
      examDate: '',
      notes: '',
    });

    // 注入错误处理函数
    const errorHandler = inject<ErrorHandler>('errorHandler');
    
    const showError = errorHandler?.showError || ((title: string, message: string, details?: string) => {
      console.error(`${title}: ${message}`, details);
      // 统一错误处理：移除alert降级
    });
    
    const showConfirm = errorHandler?.showConfirm || ((options: any) => {
      const confirmed = confirm(options.message);
      if (confirmed && options.onConfirm) {
        options.onConfirm();
      } else if (!confirmed && options.onCancel) {
        options.onCancel();
      }
    });

    // 模拟数据
    const mockStudents = [
      { id: 1, name: '张三' },
      { id: 2, name: '李四' },
      { id: 3, name: '王五' },
      { id: 4, name: '赵六' },
      { id: 5, name: '孙七' },
    ];

    const mockGrades: Grade[] = [
      {
        id: 1,
        studentId: 1,
        studentName: '张三',
        course: 'Python基础',
        examType: '期末考试',
        score: 85,
        date: '2024-01-15',
        examDate: '2024-01-15',
        notes: '表现良好',
      },
      {
        id: 2,
        studentId: 2,
        studentName: '李四',
        course: 'Java进阶',
        examType: '期末考试',
        score: 92,
        date: '2024-01-16',
        examDate: '2024-01-16',
        notes: '优秀',
      },
      {
        id: 3,
        studentId: 3,
        studentName: '王五',
        course: 'Web前端',
        examType: '期中考试',
        score: 78,
        date: '2024-01-20',
        examDate: '2024-01-20',
        notes: '需要加强',
      },
      {
        id: 4,
        studentId: 4,
        studentName: '赵六',
        course: '数据分析',
        examType: '期末考试',
        score: 88,
        date: '2024-01-25',
        examDate: '2024-01-25',
        notes: '稳定发挥',
      },
      {
        id: 5,
        studentId: 5,
        studentName: '孙七',
        course: 'Python基础',
        examType: '平时测验',
        score: 95,
        date: '2024-01-28',
        examDate: '2024-01-28',
        notes: '非常优秀',
      },
    ];

    const courses = ['Python基础', 'Java进阶', 'Web前端', '数据分析'];

    const filteredGrades = computed(() => {
      let filtered = grades.value;

      if (selectedCourse.value) {
        filtered = filtered.filter((g) => g.course === selectedCourse.value);
      }

      if (selectedExamType.value) {
        filtered = filtered.filter(
          (g) => g.examType === selectedExamType.value,
        );
      }

      if (studentSearch.value) {
        filtered = filtered.filter((g) =>
          g.studentName.includes(studentSearch.value),
        );
      }

      return filtered;
    });

    const totalCount = computed(() => filteredGrades.value.length);
    const passedCount = computed(
      () => filteredGrades.value.filter((g) => g.score >= 60).length,
    );
    const excellentCount = computed(
      () => filteredGrades.value.filter((g) => g.score >= 90).length,
    );

    const averageScore = computed(() => {
      if (totalCount.value === 0) return 0;
      const sum = filteredGrades.value.reduce((acc, g) => acc + g.score, 0);
      return Math.round(sum / totalCount.value);
    });

    const highestScore = computed(() => {
      if (totalCount.value === 0) return 0;
      return Math.max(...filteredGrades.value.map((g) => g.score));
    });

    const highestScorer = computed(() => {
      if (totalCount.value === 0) return '';
      const highestGrade = filteredGrades.value.reduce((max, g) =>
        g.score > max.score ? g : max,
      );
      return highestGrade.studentName;
    });

    const passRate = computed(() => {
      if (totalCount.value === 0) return 0;
      return Math.round((passedCount.value / totalCount.value) * 100);
    });

    const excellentRate = computed(() => {
      if (totalCount.value === 0) return 0;
      return Math.round((excellentCount.value / totalCount.value) * 100);
    });

    const scoreRanges = computed(() => {
      const ranges = [
        { label: '90-100', min: 90, max: 100, count: 0, color: '#4caf50' },
        { label: '80-89', min: 80, max: 89, count: 0, color: '#8bc34a' },
        { label: '70-79', min: 70, max: 79, count: 0, color: '#ffc107' },
        { label: '60-69', min: 60, max: 69, count: 0, color: '#ff9800' },
        { label: '0-59', min: 0, max: 59, count: 0, color: '#f44336' },
      ];

      filteredGrades.value.forEach((grade) => {
        const range = ranges.find(
          (r) => grade.score >= r.min && grade.score <= r.max,
        );
        if (range) range.count++;
      });

      const maxCount = Math.max(...ranges.map((r) => r.count), 1);
      return ranges.map((r) => ({ ...r, maxCount }));
    });

    const getScoreClass = (score) => {
      if (score >= 90) return 'excellent';
      if (score >= 80) return 'good';
      if (score >= 70) return 'average';
      if (score >= 60) return 'pass';
      return 'fail';
    };

    const getScoreColor = (score) => {
      const colors = {
        excellent: '#4caf50',
        good: '#8bc34a',
        average: '#ffc107',
        pass: '#ff9800',
        fail: '#f44336',
      };
      return colors[getScoreClass(score)];
    };

    const getGradeLevel = (score) => {
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'F';
    };

    const filterGrades = () => {
      // 筛选逻辑已通过computed属性实现
    };

    const editGrade = (grade) => {
      currentGrade.value = { ...grade };
      showEditGrade.value = true;
    };

    const deleteGrade = (id) => {
      showConfirm({
        title: '删除成绩记录',
        message: '确定要删除这条成绩记录吗？',
        confirmText: '删除',
        cancelText: '取消',
        confirmType: 'danger',
        onConfirm: () => {
          grades.value = grades.value.filter((g) => g.id !== id);
        }
      });
    };

    const saveGrade = () => {
      if (
        !currentGrade.value.studentId ||
        !currentGrade.value.course ||
        !currentGrade.value.score
      ) {
        showError('输入错误', '请填写必要信息：学员、科目、课程和分数');
        return;
      }

      // 获取学员姓名
      const student = students.value.find(
        (s) => s.id === parseInt(currentGrade.value.studentId),
      );
      if (student) {
        currentGrade.value.studentName = student.name;
      }

      if (showAddGrade.value) {
        // 添加新成绩
        const newGrade: Grade = {
          id: Date.now(),
          studentId: parseInt(currentGrade.value.studentId),
          studentName: currentGrade.value.studentName,
          course: currentGrade.value.course,
          examType: currentGrade.value.examType,
          score: currentGrade.value.score,
          date: currentGrade.value.examDate || new Date().toISOString().split('T')[0],
          examDate: currentGrade.value.examDate,
          notes: currentGrade.value.notes,
        };
        grades.value.push(newGrade);
      } else {
        // 编辑现有成绩
        const index = grades.value.findIndex(
          (g) => g.id === currentGrade.value.id,
        );
        if (index !== -1) {
          grades.value[index] = {
            id: currentGrade.value.id || grades.value[index].id,
            studentId: parseInt(currentGrade.value.studentId),
            studentName: currentGrade.value.studentName,
            course: currentGrade.value.course,
            examType: currentGrade.value.examType,
            score: currentGrade.value.score,
            date: currentGrade.value.examDate || new Date().toISOString().split('T')[0],
            examDate: currentGrade.value.examDate,
            notes: currentGrade.value.notes,
          };
        }
      }

      closeModals();
    };

    const closeModals = () => {
      showAddGrade.value = false;
      showEditGrade.value = false;
      currentGrade.value = {
        id: null,
        studentId: '',
        studentName: '',
        course: '',
        examType: '',
        score: 0,
        examDate: '',
        notes: '',
      };
    };

    const closeImportModal = () => {
      showImportModal.value = false;
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        console.log('文件上传:', file.name);
        // 这里可以实现文件上传逻辑
      }
    };

    const importGrades = () => {
      // 实现导入逻辑
      showError('功能提示', '导入功能正在开发中，敬请期待');
      closeImportModal();
    };

    onMounted(() => {
      students.value = mockStudents;
      grades.value = mockGrades;
    });

// script setup格式自动导出所有响应式变量和函数
</script>

<style scoped>
.grade-management {
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

.header-actions {
  display: flex;
  gap: 1rem;
}

.import-btn,
.add-btn {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.import-btn:hover,
.add-btn:hover {
  background-color: #1976d2;
  transform: translateY(-1px);
}

/* 统计概览 */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
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
  margin-bottom: 0.5rem;
}

.stat-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* 筛选区域 */
.filter-section {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.875rem;
}

.filter-group select,
.filter-group input {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  min-width: 150px;
}

/* 成绩表格 */
.grades-table {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.grades-table table {
  width: 100%;
  border-collapse: collapse;
}

.grades-table th,
.grades-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.grades-table th {
  background-color: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-primary);
}

.grades-table tr:hover {
  background-color: var(--bg-tertiary);
}

.score-display {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.score {
  font-weight: 600;
  font-size: 1.1rem;
}

.score.excellent {
  color: #4caf50;
}
.score.good {
  color: #8bc34a;
}
.score.average {
  color: #ffc107;
}
.score.pass {
  color: #ff9800;
}
.score.fail {
  color: #f44336;
}

.score-bar {
  width: 100px;
  height: 8px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.grade-level {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
}

.grade-level.excellent {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.grade-level.good {
  background-color: #f1f8e9;
  color: #558b2f;
}

.grade-level.average {
  background-color: #fffde7;
  color: #f57f17;
}

.grade-level.pass {
  background-color: #fff3e0;
  color: #ef6c00;
}

.grade-level.fail {
  background-color: #ffebee;
  color: #c62828;
}

.notes {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* 成绩分布 */
.grade-distribution {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.grade-distribution h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.distribution-chart {
  height: 200px;
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.range-label {
  width: 80px;
  text-align: right;
  font-weight: 500;
  color: var(--text-primary);
}

.range-bar {
  flex: 1;
  height: 20px;
  background-color: var(--bg-tertiary);
  border-radius: 10px;
  overflow: hidden;
}

.range-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.range-count {
  width: 60px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
}

/* 模态框样式 */
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
  max-width: 600px;
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
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.cancel-btn,
.save-btn,
.import-btn {
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

.save-btn,
.import-btn {
  background-color: var(--accent-primary);
  color: white;
}

.cancel-btn:hover {
  background-color: var(--border-color);
}

.save-btn:hover,
.import-btn:hover {
  background-color: #1976d2;
}

/* 导入区域 */
.import-section {
  margin-bottom: 2rem;
}

.import-section h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.file-upload {
  position: relative;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
}

.file-upload:hover {
  border-color: var(--accent-primary);
}

.file-upload input[type='file'] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
}

.upload-placeholder span {
  font-size: 2rem;
}

.template-info {
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 6px;
}

.template-info ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.template-info li {
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.download-template-btn {
  background-color: var(--accent-secondary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.download-template-btn:hover {
  background-color: #45a049;
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-section {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }

  .filter-group select,
  .filter-group input {
    width: 100%;
  }

  .grades-table {
    overflow-x: auto;
  }

  .grades-table table {
    min-width: 800px;
  }

  .stats-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .distribution-item {
    flex-wrap: wrap;
  }

  .range-label {
    width: 60px;
  }

  .range-count {
    width: 50px;
  }
}
</style>

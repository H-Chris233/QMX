<template>
  <div class="grade-management">
    <!-- 顶部加载条 -->
    <div v-if="loading" class="loading-line"></div>

    <!-- 1. 顶部控制栏：核心操作区 -->
    <header class="control-bar">
      <div class="bar-left">
        <div class="select-wrapper">
          <User :size="16" class="input-icon" />
          <select
            v-model="selectedStudent"
            @change="onStudentChange"
            class="student-select"
            aria-label="选择学员"
          >
            <option value="">👤 选择学员以管理成绩...</option>
            <option
              v-for="student in students"
              :key="student.uid"
              :value="student.uid"
            >
              {{ student.name }} ({{ student.uid }})
            </option>
          </select>
          <ChevronDown :size="14" class="select-arrow" />
        </div>

        <!-- 快速录入 (仅选中学员时显示) -->
        <Transition name="fade-slide">
          <div class="quick-add-group" v-if="selectedStudentData">
            <div class="input-wrapper">
              <Target :size="16" class="input-icon" />
              <input
                v-model.number="quickScore"
                type="number"
                :placeholder="getScorePlaceholder()"
                min="0"
                :max="getMaxScore()"
                step="0.1"
                class="quick-input"
                @keyup.enter="addQuickScore"
              />
            </div>
            <button
              class="btn btn-primary btn-sm"
              @click="addQuickScore"
              :disabled="!quickScore && quickScore !== 0"
            >
              <Plus :size="16" />
              <span>录入</span>
            </button>
          </div>
        </Transition>
      </div>

      <div class="bar-right">
        <button class="btn btn-secondary" @click="loadData" :disabled="loading" title="刷新数据">
          <RefreshCw :size="18" :class="{ 'spin': loading }" />
        </button>
        <button class="btn btn-primary" @click="openAddGradeModal">
          <PlusCircle :size="18" />
          <span>添加记录</span>
        </button>
      </div>
    </header>

    <!-- 2. 主内容区 -->
    <div class="main-content">
      
      <!-- A. 学员详情视图 (选中学员时) -->
      <div v-if="selectedStudentData" class="student-dashboard">
        
        <!-- 左侧：概览与图表 -->
        <div class="dashboard-left">
          <!-- 核心指标卡片 -->
          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-label">平均成绩</div>
              <div class="stat-value">{{ averageScoreApi.toFixed(1) }}</div>
              <div class="stat-trend neutral">
                <Activity :size="14" />
                <span>综合表现</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">最高纪录</div>
              <div class="stat-value highlight">{{ maxScoreApi.toFixed(1) }}</div>
              <div class="stat-trend positive">
                <Trophy :size="14" />
                <span>个人最佳</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">训练场次</div>
              <div class="stat-value">{{ selectedStudentData.rings.length }}</div>
              <div class="stat-trend">
                <Hash :size="14" />
                <span>总记录数</span>
              </div>
            </div>
          </div>

          <!-- 趋势图表 -->
          <div class="chart-panel">
            <div class="panel-header">
              <h3><TrendingUp :size="18" /> 近20次成绩趋势</h3>
            </div>
            <div class="chart-body">
              <div class="chart-bars">
                <div
                  v-for="(score, index) in recentScores"
                  :key="index"
                  class="bar-wrapper"
                  :title="`第${index + 1}次: ${score}`"
                >
                  <div 
                    class="bar-fill" 
                    :style="{ height: `${Math.min((score / getMaxScore()) * 100, 100)}%` }"
                    :class="getScoreLevelClass(score)"
                  ></div>
                  <span class="bar-val">{{ score }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 成绩分布 -->
          <div class="chart-panel">
            <div class="panel-header">
              <h3><PieChart :size="18" /> 成绩分布</h3>
            </div>
            <div class="distribution-list">
              <div v-for="(range, index) in scoreRanges" :key="index" class="dist-row">
                <span class="dist-label">{{ range.label }}</span>
                <div class="dist-track">
                  <div 
                    class="dist-fill" 
                    :style="{ 
                      width: (range.count / range.maxCount) * 100 + '%',
                      backgroundColor: range.color 
                    }"
                  ></div>
                </div>
                <span class="dist-count">{{ range.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：详细记录与操作 -->
        <div class="dashboard-right">
          <div class="panel-header action-header">
            <h3><List :size="18" /> 详细记录</h3>
            <div class="mini-actions">
              <button class="btn-icon" @click="showBatchAddDialog" title="批量导入">
                <Database :size="16" />
              </button>
              <button class="btn-icon" @click="exportScores" title="导出CSV">
                <Download :size="16" />
              </button>
              <button class="btn-icon danger" @click="clearAllScores" title="清空所有">
                <Trash2 :size="16" />
              </button>
            </div>
          </div>

          <div class="scores-grid-container">
            <div class="scores-grid">
              <div
                v-for="(score, index) in selectedStudentData.rings"
                :key="index"
                class="score-capsule"
                :class="getScoreLevelClass(score)"
              >
                <div class="capsule-content">
                  <span class="capsule-idx">#{{ index + 1 }}</span>
                  <span class="capsule-val">{{ score }}</span>
                </div>
                <div class="capsule-overlay">
                  <button @click="editScore(index, score)" title="编辑">
                    <Edit2 :size="14" />
                  </button>
                  <button @click="deleteScore(index, score)" title="删除" class="del">
                    <X :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- B. 空状态 (未选择学员) -->
      <div v-else-if="!selectedStudentData && students.length > 0" class="empty-state">
        <div class="empty-content">
          <div class="empty-icon-bg">
            <MousePointerClick :size="48" />
          </div>
          <h3>准备开始管理成绩</h3>
          <p>请从上方控制栏选择一名学员，以查看详细数据分析与历史记录。</p>
        </div>
      </div>

      <!-- C. 最近更新的成绩 -->
      <div class="global-list-section">
        <div class="section-title">
          <Clock :size="18" />
          <span>最近更新的成绩</span>
        </div>
        <div class="table-container">
          <table class="modern-table">
            <thead>
              <tr>
                <th>学员</th>
                <th>课程</th>
                <th>分数</th>
                <th>等级</th>
                <th>日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="grade in filteredGrades.slice(0, 10)" :key="grade.id">
                <td class="font-medium">{{ getDisplayStudentName(grade) }}</td>
                <td>{{ grade.course }}</td>
                <td>
                  <span class="score-tag" :class="getScoreClass(grade.score)">{{ grade.score }}</span>
                </td>
                <td>{{ getGradeLevel(grade.score) }}</td>
                <td class="text-muted">{{ grade.date }}</td>
                <td>
                  <div class="row-actions">
                    <button @click="editGrade(grade)" class="action-btn"><Edit2 :size="14" /></button>
                    <button @click="deleteGrade(grade.id)" class="action-btn danger"><Trash2 :size="14" /></button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredGrades.length === 0">
                <td colspan="6" class="text-muted">暂无最近更新的成绩</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- 模态框: 添加/编辑成绩 -->
    <Transition name="modal-fade">
      <div v-if="showAddGrade || showEditGrade" class="modal-overlay" @click="closeModals">
        <div class="modal-card" @click.stop>
          <div class="modal-header">
            <h3>{{ showAddGrade ? '添加新成绩' : '编辑成绩' }}</h3>
            <button class="close-btn" @click="closeModals"><X :size="20" /></button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>学员</label>
              <div class="select-wrapper full-width">
                <select v-model="currentGrade.studentId">
                  <option value="">选择学员...</option>
                  <option v-for="s in students" :key="s.uid" :value="s.uid">{{ s.name }}</option>
                </select>
                <ChevronDown :size="14" class="select-arrow" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" v-if="shouldShowCourseSelector">
                <label>课程</label>
                <div class="select-wrapper full-width">
                  <select v-model="currentGrade.course">
                    <option value="射击">射击</option>
                    <option value="射箭">射箭</option>
                  </select>
                  <ChevronDown :size="14" class="select-arrow" />
                </div>
              </div>
              <div class="form-group" :class="{ 'full-width-group': !shouldShowCourseSelector }">
                <label>分数</label>
                <input 
                  type="number" 
                  v-model.number="currentGrade.score" 
                  class="form-input"
                  :placeholder="getScorePlaceholderText(effectiveCourseForGradeForm)"
                />
              </div>
            </div>
            <div class="form-group">
              <DatePicker
                v-model="currentGrade.date"
                label="日期"
                placeholder="选择日期"
                required
              />
            </div>
            <div class="form-group">
              <label>备注</label>
              <textarea v-model="currentGrade.notes" class="form-input" rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeModals">取消</button>
            <button class="btn btn-primary" @click="saveGrade">保存</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 模态框: 批量添加 -->
    <Transition name="modal-fade">
      <div v-if="showBatchAdd" class="modal-overlay" @click="closeBatchAddDialog">
        <div class="modal-card" @click.stop>
          <div class="modal-header">
            <h3>批量导入成绩</h3>
            <button class="close-btn" @click="closeBatchAddDialog"><X :size="20" /></button>
          </div>
          <div class="modal-body">
            <div class="alert-box">
              <Info :size="16" />
              <p>当前正在为 <strong>{{ students.find(s => String(s.uid) === selectedStudent)?.name }}</strong> 导入成绩。</p>
            </div>
            <div class="form-group">
              <label>成绩列表 (每行一个)</label>
              <textarea 
                v-model="batchScoresText" 
                class="form-input code-font" 
                rows="8"
                placeholder="10.9&#10;9.8&#10;10.5"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeBatchAddDialog">取消</button>
            <button class="btn btn-primary" @click="batchAddScores">开始导入</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue';
import type { Student } from '../types/api';
import { ApiService } from '../api/ApiService';
import { handleValidationError } from '../utils/errorHandler';
import { validateScoreInput, safeParseNumber } from '../utils/dataTransformers';
import DatePicker from './DatePicker.vue';
import { logger } from '../utils/logger';

// 引入图标
import { 
  User, 
  ChevronDown, 
  Target, 
  Plus, 
  PlusCircle, 
  RefreshCw, 
  Activity, 
  Trophy, 
  Hash, 
  TrendingUp, 
  PieChart, 
  List, 
  Database, 
  Download, 
  Trash2, 
  Edit2, 
  X, 
  MousePointerClick,
  Clock,
  Info
} from 'lucide-vue-next';

// 保持原有的逻辑代码，未做删减，仅适配新UI
interface Grade {
  id: number;
  studentName: string;
  course: string;
  examType: string;
  score: number;
  date: string;
  studentId: number;
  notes?: string;
}

interface ErrorHandler {
  showError: (title: string, message: string, details?: string) => void;
  showConfirm: (options: any) => void;
  showSuccess: (title: string, message: string) => void;
}

const loading = ref(false);
const grades = ref<Grade[]>([]);
const students = ref<Student[]>([]);

const selectedStudent = ref('');
const selectedStudentData = ref<Student | null>(null);
const quickScore = ref<number | ''>('');
const abortController = ref<AbortController | null>(null);
const selectedCourse = ref('');
const selectedExamType = ref('');
const studentSearch = ref('');
const showAddGrade = ref(false);
const showEditGrade = ref(false);
const showBatchAdd = ref(false);
const batchScoresText = ref('');
const currentGrade = ref<{
  id: number | null;
  studentId: string;
  studentName: string;
  course: string;
  examType: string;
  score: number | null;
  date: string;
  notes: string;
}>({
  id: null,
  studentId: '',
  studentName: '',
  course: '',
  examType: '',
  score: null,
  date: '',
  notes: '',
});

const errorHandler = inject<ErrorHandler>('errorHandler');
interface RefreshSystem { refreshTriggers: { grades: number; }; }
const refreshSystem = inject<RefreshSystem>('refreshSystem');

const showError = errorHandler?.showError || ((title: string, message: string, details?: string) => { logger.error(title, message, details); });
const showConfirm = errorHandler?.showConfirm || ((options: any) => { if (confirm(options.message)) options.onConfirm(); });
const showSuccess = errorHandler?.showSuccess || ((title: string, message: string) => { logger.log(title, message); });

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeSubjectType = (subject?: string) => {
  const compact = (subject || '').trim().toUpperCase().replace(/[\s_-]/g, '');
  if (compact === 'SHOOTING') return 'SHOOTING';
  if (compact === 'ARCHERY') return 'ARCHERY';
  if (['SHOOTINGARCHERY', 'SHOOTINGANDARCHERY', 'SHOOTING&ARCHERY', 'SHOOTING/ARCHERY'].includes(compact)) {
    return 'SHOOTING_ARCHERY';
  }
  return 'OTHERS';
};

const getDefaultCourseBySubject = (subject?: string) => {
  const normalizedSubject = normalizeSubjectType(subject);
  if (normalizedSubject === 'SHOOTING') return '射击';
  if (normalizedSubject === 'ARCHERY') return '射箭';
  if (normalizedSubject === 'SHOOTING_ARCHERY') return '射击';
  return '其他';
};

const gradeFormStudent = computed(() => {
  const studentId = Number(currentGrade.value.studentId);
  if (!studentId) return null;
  return students.value.find((student) => student.uid === studentId) ?? null;
});

const shouldShowCourseSelector = computed(() => {
  if (!gradeFormStudent.value) return false;
  return normalizeSubjectType(gradeFormStudent.value.subject) === 'SHOOTING_ARCHERY';
});

const effectiveCourseForGradeForm = computed(() => {
  if (shouldShowCourseSelector.value) {
    return currentGrade.value.course || '射击';
  }
  return getDefaultCourseBySubject(gradeFormStudent.value?.subject);
});

const syncCurrentGradeCourseBySubject = () => {
  if (!gradeFormStudent.value) {
    currentGrade.value.course = '';
    return;
  }

  if (shouldShowCourseSelector.value) {
    if (!['射击', '射箭'].includes(currentGrade.value.course)) {
      currentGrade.value.course = '射击';
    }
    return;
  }

  currentGrade.value.course = getDefaultCourseBySubject(gradeFormStudent.value.subject);
};

// Computed Props
const recentScores = computed(() => selectedStudentData.value ? selectedStudentData.value.rings.slice(-20) : []);

const averageScoreApi = computed(() => {
  if (!selectedStudentData.value?.rings.length) return 0;
  return selectedStudentData.value.rings.reduce((a, b) => a + b, 0) / selectedStudentData.value.rings.length;
});

const maxScoreApi = computed(() => {
  if (!selectedStudentData.value?.rings.length) return 0;
  return Math.max(...selectedStudentData.value.rings);
});

const filteredGrades = computed(() => {
  let filtered = grades.value;
  if (selectedStudentData.value) filtered = filtered.filter((g) => g.studentName === selectedStudentData.value!.name);
  if (selectedCourse.value) filtered = filtered.filter((g) => g.course === selectedCourse.value);
  if (selectedExamType.value) filtered = filtered.filter((g) => g.examType === selectedExamType.value);
  if (studentSearch.value) filtered = filtered.filter((g) => g.studentName.toLowerCase().includes(studentSearch.value.toLowerCase()));
  return filtered;
});

// Helper Functions
const getScoreLevelClass = (score: number) => {
  if (!selectedStudentData.value) return 'level-normal';
  const max = getMaxScore();
  const ratio = score / max;
  if (ratio >= 0.9) return 'level-excellent';
  if (ratio >= 0.8) return 'level-good';
  if (ratio >= 0.6) return 'level-pass';
  return 'level-fail';
};

const getScoreClass = (score: number) => {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 60) return 'pass';
  return 'fail';
};

const getGradeLevel = (score: number) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

const getMaxScore = () => {
  if (!selectedStudentData.value) return 100;
  const subject = normalizeSubjectType(selectedStudentData.value.subject);
  if (subject === 'SHOOTING') return 654;
  if (subject === 'ARCHERY') return 600;
  if (subject === 'SHOOTING_ARCHERY') return 654;
  return 100;
};

const getScorePlaceholder = () => {
  const max = getMaxScore();
  return `0 - ${max}`;
};

const getMaxScoreForCourse = (course: string) => {
  if (course === '射击') return 654;
  if (course === '射箭') return 600;
  return 100;
};

const getScorePlaceholderText = (course: string) => `请输入 (0-${getMaxScoreForCourse(course)})`;

const getDisplayStudentName = (grade: Grade) => {
  if (grade.studentName && grade.studentName.trim()) return grade.studentName;
  const student = students.value.find((item) => item.uid === Number(grade.studentId));
  return student?.name || '未知学员';
};

const scoreRanges = computed(() => {
  if (!selectedStudentData.value?.rings.length) return [];
  const subject = selectedStudentData.value.subject;
  let ranges;
  
  if (subject === 'Shooting') {
    ranges = [
      { label: '500+', min: 500, max: 654, count: 0, color: '#10b981' },
      { label: '400-499', min: 400, max: 499, count: 0, color: '#8b5cf6' },
      { label: '300-399', min: 300, max: 399, count: 0, color: '#f59e0b' },
      { label: '0-299', min: 0, max: 299, count: 0, color: '#ef4444' },
    ];
  } else {
    // Generic ranges
    ranges = [
      { label: '90%+', min: 90, max: 1000, count: 0, color: '#10b981' },
      { label: '80-89%', min: 80, max: 89, count: 0, color: '#8b5cf6' },
      { label: '60-79%', min: 60, max: 79, count: 0, color: '#f59e0b' },
      { label: '0-59%', min: 0, max: 59, count: 0, color: '#ef4444' },
    ];
  }
  
  selectedStudentData.value.rings.forEach((score) => {
    // 简单适配通用逻辑，实际应根据百分比计算
    const range = ranges.find((r) => score >= r.min && score <= r.max);
    if (range) range.count++;
  });
  
  const maxCount = Math.max(...ranges.map((r) => r.count), 1);
  return ranges.map((r) => ({ ...r, maxCount }));
});

// --- API Actions (Logic preserved) ---
const loadData = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const response = await ApiService.getAllStudents();
    const data = response.students || [];
    students.value = data.filter((s: any) => s && s.uid && s.name);
  } catch (error: any) {
    showError('数据加载失败', error.message);
  } finally {
    loading.value = false;
  }
};

const onStudentChange = async () => {
  if (!selectedStudent.value) {
    selectedStudentData.value = null;
    return;
  }
  loading.value = true;
  try {
    const uid = Number(selectedStudent.value);
    const scores = await ApiService.getStudentScores(uid);
    const student = students.value.find((s: any) => s.uid === uid);
    if (student) {
      selectedStudentData.value = { ...student, rings: Array.isArray(scores) ? scores : [] } as Student;
    }
  } catch (error: any) {
    showError('获取失败', error.message);
  } finally {
    loading.value = false;
  }
};

const addQuickScore = async () => {
  if (!selectedStudent.value || quickScore.value === '') return;
  const score = Number(quickScore.value);
  const validation = validateScoreInput(score);
  if (!validation.valid) {
    showError('无效输入', validation.errors.join(', '));
    return;
  }
  
  loading.value = true;
  try {
    await ApiService.addScore(Number(selectedStudent.value), score);
    showSuccess('添加成功', '成绩已录入');
    await onStudentChange();
    quickScore.value = '';
  } catch (error: any) {
    showError('添加失败', error.message);
  } finally {
    loading.value = false;
  }
};

// Batch Operations
const showBatchAddDialog = () => {
  if (!selectedStudent.value) return showError('操作失败', '请先选择学员');
  showBatchAdd.value = true;
  batchScoresText.value = '';
};

const closeBatchAddDialog = () => showBatchAdd.value = false;

const batchAddScores = async () => {
  const scores = batchScoresText.value.split('\n')
    .map(line => parseFloat(line.trim()))
    .filter(n => !isNaN(n));
    
  if (scores.length === 0) return;
  
  loading.value = true;
  try {
    const uid = Number(selectedStudent.value);
    for (const score of scores) await ApiService.addScore(uid, score);
    showSuccess('导入成功', `已添加 ${scores.length} 条成绩`);
    closeBatchAddDialog();
    onStudentChange();
  } catch (error: any) {
    showError('导入失败', error.message);
  } finally {
    loading.value = false;
  }
};

const exportScores = () => {
  if (!selectedStudentData.value?.rings.length) return showError('导出失败', '无数据');
  try {
    const csv = '序号,成绩\n' + selectedStudentData.value.rings.map((s, i) => `${i+1},${s}`).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedStudentData.value.name}_成绩.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => document.body.removeChild(link), 100);
    showSuccess('导出成功', '文件已下载');
  } catch (e) {
    showError('导出错误', String(e));
  }
};

const clearAllScores = () => {
  showConfirm({
    title: '清空成绩',
    message: '确定要清空该学员所有成绩吗？不可恢复！',
    confirmType: 'danger',
    onConfirm: async () => {
      loading.value = true;
      try {
        await ApiService.updateScoresBatch(Number(selectedStudent.value), []);
        showSuccess('已清空', '所有成绩已移除');
        onStudentChange();
      } catch (e: any) {
        showError('操作失败', e.message);
      } finally {
        loading.value = false;
      }
    }
  });
};

// Single Score Operations
const deleteScore = (index: number, score: number) => {
  showConfirm({
    title: '删除成绩',
    message: `删除第 ${index + 1} 次成绩 (${score})？`,
    confirmType: 'danger',
    onConfirm: async () => {
      loading.value = true;
      try {
        await ApiService.deleteStudentScore(Number(selectedStudent.value), index);
        onStudentChange();
      } catch (e: any) {
        showError('删除失败', e.message);
      } finally {
        loading.value = false;
      }
    }
  });
};

const editScore = async (index: number, currentScore: number) => {
  const newScoreStr = prompt('修改成绩:', String(currentScore));
  if (newScoreStr === null) return;
  const newScore = parseFloat(newScoreStr);
  if (isNaN(newScore)) return;
  
  loading.value = true;
  try {
    await ApiService.updateStudentScore(Number(selectedStudent.value), index, newScore);
    onStudentChange();
  } catch (e: any) {
    showError('更新失败', e.message);
  } finally {
    loading.value = false;
  }
};

// General Grade Operations
const closeModals = () => {
  showAddGrade.value = false;
  showEditGrade.value = false;
};

const openAddGradeModal = () => {
  currentGrade.value = {
    id: null,
    studentId: selectedStudent.value || '',
    studentName: '',
    course: '',
    examType: '',
    score: null,
    date: getTodayDateString(),
    notes: '',
  };
  syncCurrentGradeCourseBySubject();
  showAddGrade.value = true;
};

const saveGrade = () => {
  // 简化的保存逻辑，适配原有功能
  if (currentGrade.value.score === null || currentGrade.value.score === undefined) return;
  if (!currentGrade.value.studentId) {
    showError('保存失败', '请先选择学员');
    return;
  }

  const studentId = Number(currentGrade.value.studentId);
  const student = students.value.find((item) => item.uid === studentId);
  const studentName = student?.name || currentGrade.value.studentName || '未知学员';

  const payload = {
    ...currentGrade.value,
    studentId,
    studentName,
    course: effectiveCourseForGradeForm.value,
  };

  if (showAddGrade.value) {
    grades.value.push({ ...payload, id: Date.now() } as any);
  }
  closeModals();
};

const editGrade = (g: Grade) => {
  currentGrade.value = { ...g, studentId: String(g.studentId), notes: g.notes || '' };
  showEditGrade.value = true;
};

const deleteGrade = (id: number) => {
  grades.value = grades.value.filter(g => g.id !== id);
};

// Watchers & Lifecycle
if (refreshSystem?.refreshTriggers) {
  watch(() => refreshSystem.refreshTriggers.grades, (n, o) => {
    if (n > o) loadData();
  });
}

watch(() => currentGrade.value.studentId, () => {
  syncCurrentGradeCourseBySubject();
});

onMounted(loadData);
onUnmounted(() => abortController.value?.abort());
</script>

<style scoped>
.grade-management {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  animation: fade-in 0.4s ease;
}

/* === Control Bar === */
.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bg-surface);
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  flex-wrap: wrap;
  gap: 1rem;
}

.bar-left {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
}

.select-wrapper, .input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.8rem;
  color: var(--text-secondary);
  pointer-events: none;
}

.student-select {
  padding: 0.6rem 2.5rem 0.6rem 2.2rem;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-primary);
  min-width: 200px;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.student-select:focus {
  border-color: var(--primary-color);
  outline: none;
}

.select-arrow {
  position: absolute;
  right: 0.8rem;
  color: var(--text-secondary);
  pointer-events: none;
}

.quick-add-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background-color: var(--bg-app);
  padding: 0.25rem;
  padding-left: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}

.quick-input {
  background: transparent;
  border: none;
  color: var(--text-primary);
  width: 120px;
  padding: 0.4rem;
  padding-left: 1.8rem; /* icon space */
}
.quick-input:focus { outline: none; }

.bar-right {
  display: flex;
  gap: 0.75rem;
}

/* === Buttons === */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary { background-color: var(--primary-color); color: white; }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-secondary { background-color: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border-subtle); }
.btn-secondary:hover:not(:disabled) { background-color: var(--border-subtle); }

.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.85rem; }

.btn-icon {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.4rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-icon:hover { background-color: var(--bg-hover); color: var(--text-primary); }
.btn-icon.danger:hover { background-color: rgba(239, 68, 68, 0.1); color: #ef4444; }

/* === Main Content Layout === */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 0;
}

.student-dashboard {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  height: 100%;
}

/* Dashboard Left: Charts & Stats */
.dashboard-left {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* Compact grid */
  gap: 0.5rem;
}

.stat-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label { font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem; }
.stat-value { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
.stat-value.highlight { color: var(--primary-color); }

.stat-trend {
  margin-top: 0.25rem;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
}
.stat-trend.positive { color: #10b981; }

.chart-panel {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.panel-header h3 { margin: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); }

.chart-body {
  padding: 1rem;
  height: 180px;
  display: flex;
  align-items: flex-end;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  gap: 2px;
}

.bar-wrapper {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.bar-fill {
  width: 80%;
  border-radius: 3px 3px 0 0;
  transition: height 0.3s ease;
  min-height: 4px;
}
.bar-wrapper:hover .bar-fill { opacity: 0.8; }
.bar-wrapper:hover .bar-val { opacity: 1; transform: translateY(-2px); }

.bar-val {
  position: absolute;
  top: -18px;
  font-size: 0.65rem;
  opacity: 0;
  transition: all 0.2s;
  pointer-events: none;
  white-space: nowrap;
}

/* Bar Colors */
.level-excellent { background: linear-gradient(to top, #10b981, #34d399); }
.level-good { background: linear-gradient(to top, #8b5cf6, #a78bfa); }
.level-pass { background: linear-gradient(to top, #f59e0b, #fbbf24); }
.level-fail { background: linear-gradient(to top, #ef4444, #f87171); }

/* Distribution List */
.distribution-list { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.dist-row { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
.dist-label { width: 50px; text-align: right; color: var(--text-secondary); }
.dist-track { flex: 1; height: 8px; background-color: var(--bg-app); border-radius: 4px; overflow: hidden; }
.dist-fill { height: 100%; border-radius: 4px; }
.dist-count { width: 24px; text-align: right; color: var(--text-primary); font-weight: 500; }

/* Dashboard Right: Score Grid */
.dashboard-right {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  overflow: hidden;
}

.scores-grid-container {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.75rem;
}

.score-capsule {
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 0.6rem 0.4rem;
  text-align: center;
  position: relative;
  transition: all 0.2s;
  cursor: default;
}

.score-capsule:hover {
  transform: translateY(-2px);
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.capsule-content { display: flex; flex-direction: column; gap: 0.25rem; }
.capsule-idx { font-size: 0.7rem; color: var(--text-secondary); }
.capsule-val { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); }

.score-capsule.level-excellent .capsule-val { color: #10b981; }
.score-capsule.level-fail .capsule-val { color: #ef4444; }

.capsule-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0,0,0,0.8);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.score-capsule:hover .capsule-overlay { opacity: 1; }

.capsule-overlay button {
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  padding: 0.3rem;
  border-radius: 4px;
  cursor: pointer;
}
.capsule-overlay button:hover { background: var(--primary-color); }
.capsule-overlay button.del:hover { background: #ef4444; }

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-surface);
  border-radius: 12px;
  border: 1px dashed var(--border-subtle);
}

.empty-content { text-align: center; color: var(--text-secondary); max-width: 400px; }
.empty-icon-bg {
  width: 80px;
  height: 80px;
  background-color: var(--bg-app);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  color: var(--primary-color);
}
.empty-content h3 { color: var(--text-primary); margin-bottom: 0.5rem; }

/* Global List (Fallback) */
.global-list-section {
  background-color: var(--bg-surface);
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  overflow: hidden;
}
.section-title { padding: 1rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
.modern-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.modern-table th { text-align: left; padding: 0.75rem 1rem; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); font-weight: 500; }
.modern-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
.modern-table tr:last-child td { border-bottom: none; }
.score-tag { padding: 0.1rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem; }
.score-tag.excellent { background: rgba(16, 185, 129, 0.1); color: #10b981; }

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal-card {
  background-color: var(--bg-surface);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
.modal-header { padding: 1.25rem; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 1.1rem; }
.close-btn { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; }
.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.full-width-group { flex: 1; }
.form-group label { display: block; margin-bottom: 0.4rem; font-size: 0.9rem; color: var(--text-secondary); }
.form-input, .full-width select { width: 100%; padding: 0.6rem; background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-primary); }
.code-font { font-family: monospace; }
.alert-box { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 0.8rem; border-radius: 8px; display: flex; gap: 0.8rem; margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-primary); }
.modal-footer { padding: 1.25rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; gap: 0.8rem; }

/* Animations & Transitions */
.loading-line { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--primary-color); animation: loading 1.5s infinite; }
@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 1024px) {
  .student-dashboard { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  .dashboard-left { flex-direction: row; flex-wrap: wrap; }
  .stat-card { flex: 1; }
}

@media (max-width: 768px) {
  .control-bar { flex-direction: column; align-items: stretch; }
  .bar-left, .bar-right { justify-content: space-between; }
  .quick-add-group { display: none; } /* Hide quick add on mobile to save space */
  .stats-row { grid-template-columns: 1fr; }
}
</style>

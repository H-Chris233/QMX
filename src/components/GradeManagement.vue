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
            <div v-if="shouldShowManageCourseSelector" class="select-wrapper quick-course-select">
              <select
                v-model="selectedManageCourse"
                class="quick-course-field"
                aria-label="选择训练科目"
              >
                <option value="射击">射击</option>
                <option value="射箭">射箭</option>
              </select>
              <ChevronDown :size="12" class="select-arrow" />
            </div>
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
        <button class="btn btn-secondary" @click="loadData(true)" :disabled="loading" title="刷新数据">
          <RefreshCw :size="18" :class="{ 'spin': loading }" />
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
          <div class="stats-sections">
            <div
              v-for="panel in statsPanels"
              :key="`stats-${panel.key}`"
              class="stats-section"
            >
              <div v-if="isSplitBySubject" class="stats-section-head">
                {{ panel.title }}
              </div>
              <div class="stats-row">
                <div class="stat-card">
                  <div class="stat-label">平均成绩</div>
                  <div class="stat-value">{{ panel.average.toFixed(1) }}</div>
                  <div class="stat-trend neutral">
                    <Activity :size="14" />
                    <span>综合表现</span>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">最高纪录</div>
                  <div class="stat-value highlight">{{ panel.max.toFixed(1) }}</div>
                  <div class="stat-trend positive">
                    <Trophy :size="14" />
                    <span>个人最佳</span>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">训练场次</div>
                  <div class="stat-value">{{ panel.count }}</div>
                  <div class="stat-trend">
                    <Hash :size="14" />
                    <span>总记录数</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 趋势图表 -->
          <div
            v-for="panel in analyticsPanels"
            :key="`trend-${panel.key}`"
            class="chart-panel"
          >
            <div class="panel-header">
              <h3><TrendingUp :size="18" /> {{ panel.trendTitle }}</h3>
            </div>
            <div class="chart-body">
              <div class="chart-bars">
                <div
                  v-for="(score, index) in panel.recentScores"
                  :key="index"
                  class="bar-wrapper"
                  :title="`第${index + 1}次: ${score}`"
                >
                  <div
                    class="bar-fill"
                    :style="{ height: `${Math.min((score / panel.maxScore) * 100, 100)}%` }"
                    :class="getScoreLevelClassByCourse(score, panel.course)"
                  ></div>
                  <span class="bar-val">{{ score }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 成绩分布 -->
          <div
            v-for="panel in analyticsPanels"
            :key="`distribution-${panel.key}`"
            class="chart-panel"
          >
            <div class="panel-header">
              <h3><PieChart :size="18" /> {{ panel.distributionTitle }}</h3>
            </div>
            <div class="distribution-list">
              <div v-for="(range, index) in panel.scoreRanges" :key="index" class="dist-row">
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
            <h3><List :size="18" /> {{ isSplitBySubject ? '详细记录（按科目）' : '详细记录' }}</h3>
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
            <div class="scores-sections">
              <div
                v-for="panel in analyticsPanels"
                :key="`records-${panel.key}`"
                class="scores-section"
              >
                <div v-if="isSplitBySubject" class="scores-section-title">
                  {{ panel.recordTitle }}
                </div>
                <div v-if="panel.records.length > 0" class="scores-grid">
                  <div
                    v-for="record in panel.records"
                    :key="`${panel.key}-${record.index}`"
                    class="score-capsule"
                    :class="getScoreLevelClassByCourse(record.score, panel.course)"
                  >
                    <div class="capsule-content">
                      <span class="capsule-idx">#{{ record.index + 1 }}</span>
                      <span class="capsule-val">{{ record.score }}</span>
                      <span class="capsule-meta">科目：{{ record.subject }}</span>
                      <span class="capsule-time">录入：{{ record.recordedAt }}</span>
                    </div>
                    <div class="capsule-overlay">
                      <button @click="editScore(record.index, record.score)" title="编辑">
                        <Edit2 :size="14" />
                      </button>
                      <button @click="deleteScore(record.index, record.score)" title="删除" class="del">
                        <X :size="14" />
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else class="scores-empty">
                  暂无{{ panel.course }}成绩记录
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
        <div class="section-header">
          <div class="section-title">
            <div class="title-icon">
              <Clock :size="18" />
            </div>
            <div class="title-text">
              <span class="main-title">最近更新的成绩</span>
              <span class="sub-title">共 {{ filteredGrades.length }} 条记录</span>
            </div>
          </div>
          <button class="view-all-btn" v-if="filteredGrades.length > 10">
            查看全部 <ChevronRight :size="14" />
          </button>
        </div>
        
        <div class="grades-list-container">
          <div v-if="filteredGrades.length === 0" class="grades-empty">
            <Target :size="40" />
            <span>暂无最近更新的成绩</span>
          </div>
          
          <div v-else class="grade-cards">
            <div
              v-for="(grade, index) in filteredGrades.slice(0, 10)"
              :key="grade.id"
              class="grade-card"
              :style="{ animationDelay: `${index * 40}ms` }"
            >
              <!-- 左侧：学员头像 -->
              <div class="grade-student-avatar" :class="getScoreClass(grade.score)">
                {{ getDisplayStudentName(grade).charAt(0).toUpperCase() }}
              </div>
              
              <!-- 中间：信息 -->
              <div class="grade-info">
                <div class="grade-header">
                  <span class="student-name">{{ getDisplayStudentName(grade) }}</span>
                  <span class="course-badge">{{ getDisplayCourseName(grade) }}</span>
                </div>
                <div class="grade-meta">
                  <span class="grade-time">
                    <Clock :size="10" />
                    {{ getGradeDateText(grade) }}
                  </span>
                  <span class="grade-level" :class="getScoreClass(grade.score)">
                    等级 {{ getGradeLevel(grade.score) }}
                  </span>
                </div>
              </div>
              
              <!-- 右侧：分数与操作 -->
              <div class="grade-right">
                <div class="score-circle" :class="getScoreClass(grade.score)">
                  <span class="score-value">{{ grade.score }}</span>
                </div>
                <div class="grade-actions">
                  <button @click="editGrade(grade)" class="grade-action-btn edit" title="编辑">
                    <Edit2 :size="13" />
                  </button>
                  <button @click="deleteGrade(grade)" class="grade-action-btn delete" title="删除">
                    <Trash2 :size="13" />
                  </button>
                </div>
              </div>
            </div>
          </div>
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { Student, StudentScoreDetail } from '../types/api';
import { ApiService } from '../api/ApiService';
import { safeParseNumber } from '../utils/dataTransformers';
import DatePicker from './DatePicker.vue';
import { logger } from '../utils/logger';
import { useAppStore } from '../stores/app';

// 引入图标
import { 
  User, 
  ChevronDown,
  ChevronRight,
  Target, 
  Plus, 
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
  scoreIndex: number;
  studentName: string;
  course: string;
  subjectValue?: string;
  examType: string;
  score: number;
  date: string;
  recordedAt?: string;
  studentId: number;
  notes?: string;
}

type NormalizedSubjectType = 'SHOOTING' | 'ARCHERY' | 'SHOOTING_ARCHERY' | 'OTHERS';
type DisplayCourse = '射击' | '射箭' | '射击&射箭' | '其他';

interface DetailedRecordItem {
  index: number;
  score: number;
  subject: DisplayCourse;
  subjectType: NormalizedSubjectType;
  recordedAt: string;
  notes?: string;
}

interface ScoreRangeItem {
  label: string;
  count: number;
  color: string;
  maxCount: number;
}

interface AnalyticsPanel {
  key: string;
  course: DisplayCourse;
  trendTitle: string;
  distributionTitle: string;
  recordTitle: string;
  maxScore: number;
  recentScores: number[];
  scoreRanges: ScoreRangeItem[];
  records: DetailedRecordItem[];
}

interface StatsPanel {
  key: string;
  title: string;
  average: number;
  max: number;
  count: number;
}

const loading = ref(false);
const grades = ref<Grade[]>([]);
const students = ref<Student[]>([]);
const MAX_RECENT_GRADES = 200;

const selectedStudent = ref('');
const selectedStudentData = ref<Student | null>(null);
const quickScore = ref<number | ''>('');
const abortController = ref<AbortController | null>(null);
const selectedManageCourse = ref<'射击' | '射箭'>('射击');
const selectedCourse = ref('');
const selectedExamType = ref('');
const studentSearch = ref('');
const showAddGrade = ref(false);
const showEditGrade = ref(false);
const showBatchAdd = ref(false);
const batchScoresText = ref('');
const currentGrade = ref<{
  id: number | null;
  scoreIndex: number | null;
  studentId: string;
  studentName: string;
  course: string;
  examType: string;
  score: number | null;
  date: string;
  notes: string;
}>({
  id: null,
  scoreIndex: null,
  studentId: '',
  studentName: '',
  course: '',
  examType: '',
  score: null,
  date: '',
  notes: '',
});

const appStore = useAppStore();

const showError = (title: string, message: string, details?: string) => {
  const context = [message, details].filter(Boolean).join(' | ');
  appStore.errorHandler.showError(title, context || undefined);
  logger.error(title, message, details);
};

const showConfirm = (options: {
  title: string;
  message: string;
  confirmType?: 'danger' | 'warning' | 'primary';
  onConfirm?: () => void;
}) => {
  appStore.showConfirm({
    title: options.title,
    message: options.message,
    confirmType: options.confirmType || 'primary',
    onConfirm: options.onConfirm,
  });
};

const showSuccess = (title: string, message: string) => {
  appStore.errorHandler.showSuccess(`${title}：${message}`);
  logger.log(title, message);
};

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeSubjectType = (subject?: string): NormalizedSubjectType => {
  const compact = (subject || '').trim().toUpperCase().replace(/[\s_-]/g, '');
  if (compact === 'SHOOTING') return 'SHOOTING';
  if (compact === 'ARCHERY') return 'ARCHERY';
  if (['SHOOTINGARCHERY', 'SHOOTINGANDARCHERY', 'SHOOTING&ARCHERY', 'SHOOTING/ARCHERY'].includes(compact)) {
    return 'SHOOTING_ARCHERY';
  }
  return 'OTHERS';
};

const getDefaultCourseBySubject = (subject?: string): DisplayCourse => {
  const normalizedSubject = normalizeSubjectType(subject);
  if (normalizedSubject === 'SHOOTING') return '射击';
  if (normalizedSubject === 'ARCHERY') return '射箭';
  if (normalizedSubject === 'SHOOTING_ARCHERY') return '射击';
  return '其他';
};

const getCourseByNormalizedSubject = (subjectType: NormalizedSubjectType): DisplayCourse => {
  if (subjectType === 'SHOOTING') return '射击';
  if (subjectType === 'ARCHERY') return '射箭';
  if (subjectType === 'SHOOTING_ARCHERY') return '射击&射箭';
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

const shouldShowManageCourseSelector = computed(() => {
  if (!selectedStudentData.value) return false;
  return normalizeSubjectType(selectedStudentData.value.subject) === 'SHOOTING_ARCHERY';
});

const effectiveManageCourse = computed(() => {
  if (!selectedStudentData.value) return '';
  const normalizedSubject = normalizeSubjectType(selectedStudentData.value.subject);
  if (normalizedSubject === 'SHOOTING') return '射击';
  if (normalizedSubject === 'ARCHERY') return '射箭';
  if (normalizedSubject === 'SHOOTING_ARCHERY') return selectedManageCourse.value || '射击';
  return '其他';
});

const isSplitBySubject = computed(() => {
  if (!selectedStudentData.value) return false;
  return normalizeSubjectType(selectedStudentData.value.subject) === 'SHOOTING_ARCHERY';
});

const syncManageCourseBySelectedStudent = () => {
  if (!selectedStudentData.value) {
    selectedManageCourse.value = '射击';
    return;
  }

  const normalizedSubject = normalizeSubjectType(selectedStudentData.value.subject);
  if (normalizedSubject === 'ARCHERY') {
    selectedManageCourse.value = '射箭';
    return;
  }

  selectedManageCourse.value = '射击';
};

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

const filteredGrades = computed(() => {
  let filtered = selectedStudentData.value
    ? buildRecentGradesFromStudents([selectedStudentData.value])
    : grades.value;

  if (selectedStudentData.value) {
    filtered = filtered.filter((g) => g.studentId === selectedStudentData.value!.uid);
  }

  if (selectedStudentData.value && shouldShowManageCourseSelector.value) {
    filtered = filtered.filter((g) => {
      const subjectType = normalizeSubjectType(g.subjectValue || g.course);
      if (subjectType === 'SHOOTING_ARCHERY') return true;
      return getCourseByNormalizedSubject(subjectType) === selectedManageCourse.value;
    });
  }
  if (selectedCourse.value) filtered = filtered.filter((g) => g.course === selectedCourse.value);
  if (selectedExamType.value) filtered = filtered.filter((g) => g.examType === selectedExamType.value);
  if (studentSearch.value) filtered = filtered.filter((g) => g.studentName.toLowerCase().includes(studentSearch.value.toLowerCase()));
  return filtered;
});

// Helper Functions
const getScoreLevelClassByCourse = (score: number, course: string) => {
  const max = getMaxScoreForCourse(course);
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
  return getMaxScoreForCourse(effectiveManageCourse.value || '其他');
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

const validateScoreForCourse = (score: unknown, course: string): { valid: boolean; error?: string } => {
  if (typeof score !== 'number' || Number.isNaN(score) || !Number.isFinite(score)) {
    return { valid: false, error: '成绩必须是有效数字' };
  }

  const maxScore = getMaxScoreForCourse(course);
  if (score < 0 || score > maxScore) {
    return { valid: false, error: `成绩必须在 0 到 ${maxScore} 之间（${course}）` };
  }

  return { valid: true };
};

const getDisplayStudentName = (grade: Grade) => {
  if (grade.studentName && grade.studentName.trim()) return grade.studentName;
  const student = students.value.find((item) => item.uid === Number(grade.studentId));
  return student?.name || '未知学员';
};

const normalizeCourseLabel = (course?: string): DisplayCourse => {
  const subjectByText = normalizeSubjectType(course);
  if (subjectByText !== 'OTHERS') return getCourseByNormalizedSubject(subjectByText);

  if (course === '射击') return '射击';
  if (course === '射箭') return '射箭';
  if (course === '射击&射箭') return '射击&射箭';
  return '其他';
};

const getDisplayCourseName = (grade: Grade): DisplayCourse => {
  const fromSubjectValue = normalizeSubjectType(grade.subjectValue);
  if (fromSubjectValue !== 'OTHERS') {
    return getCourseByNormalizedSubject(fromSubjectValue);
  }
  return normalizeCourseLabel(grade.course);
};

const getGradeDateText = (grade: Grade): string => {
  if (grade.recordedAt) return formatDateTime(grade.recordedAt);
  if (grade.date) return grade.date;
  return '--';
};

const getRecentCourseBySubject = (subject?: string): DisplayCourse => {
  return getCourseByNormalizedSubject(normalizeSubjectType(subject));
};

const getSubjectValueByCourse = (course: string): string => {
  if (course === '射击') return 'SHOOTING';
  if (course === '射箭') return 'ARCHERY';
  if (course === '射击&射箭') return 'SHOOTING_ARCHERY';
  return 'OTHERS';
};

const getStudentScoreDetails = (student?: Student | null): StudentScoreDetail[] => {
  if (!student) return [];
  if (Array.isArray(student.score_details) && student.score_details.length > 0) {
    return student.score_details.filter((item) => item && Number.isFinite(Number(item.score)));
  }
  const fallbackTime = student.updated_at || new Date().toISOString();
  const fallbackSubject = normalizeSubjectType(student.subject);
  return (student.rings || []).map((score) => ({
    score: Number(score),
    subject: fallbackSubject,
    recorded_at: fallbackTime,
  }));
};

const toIsoByDateInput = (dateText?: string) => {
  if (!dateText) return new Date().toISOString();
  const parsed = new Date(dateText);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const parsedWithDayStart = new Date(`${dateText}T00:00:00`);
  if (!Number.isNaN(parsedWithDayStart.getTime())) return parsedWithDayStart.toISOString();
  return new Date().toISOString();
};

const formatDateTime = (input?: string) => {
  if (!input) return '--';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '--';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const buildRecentGradesFromStudents = (items: Student[]): Grade[] => {
  const list: Grade[] = [];
  let idSeed = 1;

  for (const student of items) {
    const scoreDetails = getStudentScoreDetails(student);
    for (let scoreIndex = 0; scoreIndex < scoreDetails.length; scoreIndex++) {
      const detail = scoreDetails[scoreIndex];
      const recordedAt = detail.recorded_at || student.updated_at || '';
      list.push({
        id: idSeed++,
        scoreIndex,
        studentId: student.uid,
        studentName: student.name,
        course: getRecentCourseBySubject(detail.subject),
        subjectValue: detail.subject,
        examType: '',
        score: Number(detail.score),
        date: recordedAt ? recordedAt.split('T')[0] : '',
        recordedAt,
        notes: detail.note || '',
      });
    }
  }

  return list
    .sort((a, b) => {
      const aTime = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
      const bTime = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, MAX_RECENT_GRADES);
};

const detailedRecords = computed<DetailedRecordItem[]>(() => {
  if (!selectedStudentData.value) return [];
  return getStudentScoreDetails(selectedStudentData.value).map((detail, index) => ({
    index,
    score: Number(detail.score),
    subject: getRecentCourseBySubject(detail.subject),
    subjectType: normalizeSubjectType(detail.subject),
    recordedAt: formatDateTime(detail.recorded_at),
    notes: detail.note || '',
  }));
});

const buildScoreRanges = (scores: number[], maxScore: number): ScoreRangeItem[] => {
  if (!scores.length) {
    return [
      { label: '90%+', count: 0, color: '#10b981', maxCount: 1 },
      { label: '80-89%', count: 0, color: '#8b5cf6', maxCount: 1 },
      { label: '60-79%', count: 0, color: '#f59e0b', maxCount: 1 },
      { label: '0-59%', count: 0, color: '#ef4444', maxCount: 1 },
    ];
  }

  const ranges = [
    { label: '90%+', count: 0, color: '#10b981' },
    { label: '80-89%', count: 0, color: '#8b5cf6' },
    { label: '60-79%', count: 0, color: '#f59e0b' },
    { label: '0-59%', count: 0, color: '#ef4444' },
  ];

  scores.forEach((score) => {
    const ratio = maxScore > 0 ? score / maxScore : 0;
    if (ratio >= 0.9) ranges[0].count++;
    else if (ratio >= 0.8) ranges[1].count++;
    else if (ratio >= 0.6) ranges[2].count++;
    else ranges[3].count++;
  });

  const maxCount = Math.max(...ranges.map((r) => r.count), 1);
  return ranges.map((r) => ({ ...r, maxCount }));
};

const createAnalyticsPanel = (
  key: string,
  course: DisplayCourse,
  records: DetailedRecordItem[],
  trendTitle: string,
  distributionTitle: string,
  recordTitle: string,
): AnalyticsPanel => {
  const maxScore = getMaxScoreForCourse(course);
  const recentScores = records.slice(-20).map((record) => record.score);

  return {
    key,
    course,
    trendTitle,
    distributionTitle,
    recordTitle,
    maxScore,
    recentScores,
    scoreRanges: buildScoreRanges(records.map((record) => record.score), maxScore),
    records,
  };
};

const analyticsPanels = computed<AnalyticsPanel[]>(() => {
  if (!selectedStudentData.value) return [];

  if (isSplitBySubject.value) {
    const shootingRecords = detailedRecords.value.filter((record) =>
      record.subjectType === 'SHOOTING' || record.subjectType === 'SHOOTING_ARCHERY'
    );
    const archeryRecords = detailedRecords.value.filter((record) =>
      record.subjectType === 'ARCHERY' || record.subjectType === 'SHOOTING_ARCHERY'
    );

    return [
      createAnalyticsPanel(
        'shooting',
        '射击',
        shootingRecords,
        '近20次成绩趋势（射击）',
        '成绩分布（射击）',
        '射击记录',
      ),
      createAnalyticsPanel(
        'archery',
        '射箭',
        archeryRecords,
        '近20次成绩趋势（射箭）',
        '成绩分布（射箭）',
        '射箭记录',
      ),
    ];
  }

  const singleCourse = getDefaultCourseBySubject(selectedStudentData.value.subject);
  return [
    createAnalyticsPanel(
      'default',
      singleCourse,
      detailedRecords.value,
      '近20次成绩趋势',
      '成绩分布',
      '详细记录',
    ),
  ];
});

const statsPanels = computed<StatsPanel[]>(() => {
  return analyticsPanels.value.map((panel) => {
    const count = panel.records.length;
    const total = panel.records.reduce((sum, record) => sum + record.score, 0);
    const max = count > 0 ? Math.max(...panel.records.map((record) => record.score)) : 0;
    return {
      key: panel.key,
      title: `${panel.course}统计`,
      average: count > 0 ? total / count : 0,
      max,
      count,
    };
  });
});

// --- API Actions (Logic preserved) ---
const loadData = async (forceOrEvent: boolean | Event = false) => {
  const force = typeof forceOrEvent === 'boolean' ? forceOrEvent : false;
  if (loading.value && !force) return;
  loading.value = true;
  try {
    const response = await ApiService.getAllStudents(undefined, force);
    const data = response.students || [];
    students.value = data.filter((s: any) => s && s.uid && s.name);
    grades.value = buildRecentGradesFromStudents(students.value);
  } catch (error: any) {
    showError('数据加载失败', error.message);
  } finally {
    loading.value = false;
  }
};

const onStudentChange = async () => {
  if (!selectedStudent.value) {
    selectedStudentData.value = null;
    syncManageCourseBySelectedStudent();
    return;
  }
  loading.value = true;
  try {
    const uid = Number(selectedStudent.value);
    const scoreDetails = await ApiService.getStudentScores(uid);
    const student = students.value.find((s: any) => s.uid === uid);
    if (student) {
      const normalizedScoreDetails = Array.isArray(scoreDetails) ? scoreDetails : [];
      selectedStudentData.value = {
        ...student,
        score_details: normalizedScoreDetails,
        rings: normalizedScoreDetails.map((item) => Number(item.score)),
      } as Student;
      syncManageCourseBySelectedStudent();
    }
  } catch (error: any) {
    showError('获取失败', error.message);
  } finally {
    loading.value = false;
  }
};

const refreshScoreRelatedViews = async (studentId?: number) => {
  await loadData(true);

  if (!selectedStudent.value) return;
  const selectedUid = Number(selectedStudent.value);
  if (studentId && selectedUid !== studentId) return;

  await onStudentChange();
};

const addQuickScore = async () => {
  if (!selectedStudent.value || quickScore.value === '') return;
  const course = effectiveManageCourse.value || getDefaultCourseBySubject(selectedStudentData.value?.subject);
  const score = Number(quickScore.value);
  const validation = validateScoreForCourse(score, course);
  if (!validation.valid) {
    showError('无效输入', validation.error || '成绩格式无效');
    return;
  }
  
  loading.value = true;
  try {
    await ApiService.addScore(Number(selectedStudent.value), {
      score,
      subject: getSubjectValueByCourse(course),
      recorded_at: new Date().toISOString(),
    });
    showSuccess('添加成功', '成绩已录入');
    await refreshScoreRelatedViews(Number(selectedStudent.value));
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
  const rawLines = batchScoresText.value.split('\n').map((line) => line.trim()).filter(Boolean);
  if (rawLines.length === 0) {
    showError('导入失败', '请先输入要导入的成绩');
    return;
  }
  
  loading.value = true;
  try {
    const uid = Number(selectedStudent.value);
    const course = effectiveManageCourse.value || getDefaultCourseBySubject(selectedStudentData.value?.subject);
    const parsedScores: number[] = [];

    for (let i = 0; i < rawLines.length; i += 1) {
      const score = Number(rawLines[i]);
      const validation = validateScoreForCourse(score, course);
      if (!validation.valid) {
        showError('导入失败', `第 ${i + 1} 行无效：${validation.error}`);
        return;
      }
      parsedScores.push(score);
    }

    const subject = getSubjectValueByCourse(course);
    const now = new Date().toISOString();
    await ApiService.updateScoresBatch(
      uid,
      parsedScores.map((score) => ({
        score,
        subject,
        recorded_at: now,
      })),
    );
    showSuccess('导入成功', `已添加 ${parsedScores.length} 条成绩`);
    closeBatchAddDialog();
    await refreshScoreRelatedViews(uid);
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
        const uid = Number(selectedStudent.value);
        await ApiService.clearAllScores(uid);
        showSuccess('已清空', '所有成绩已移除');
        await refreshScoreRelatedViews(uid);
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
        const uid = Number(selectedStudent.value);
        await ApiService.deleteStudentScore(uid, index);
        await refreshScoreRelatedViews(uid);
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
    const uid = Number(selectedStudent.value);
    await ApiService.updateStudentScore(uid, index, {
      newScore,
    });
    await refreshScoreRelatedViews(uid);
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

const saveGrade = async () => {
  if (currentGrade.value.score === null || currentGrade.value.score === undefined) return;
  if (!currentGrade.value.studentId) {
    showError('保存失败', '请先选择学员');
    return;
  }

  const studentId = Number(currentGrade.value.studentId);
  const score = Number(currentGrade.value.score);
  if (!Number.isFinite(score)) {
    showError('保存失败', '成绩格式无效');
    return;
  }

  loading.value = true;
  try {
    const course = effectiveCourseForGradeForm.value;
    const validation = validateScoreForCourse(score, course);
    if (!validation.valid) {
      showError('保存失败', validation.error || '成绩格式无效');
      return;
    }

    const subjectValue = getSubjectValueByCourse(course);
    const recordedAt = toIsoByDateInput(currentGrade.value.date);
    const note = currentGrade.value.notes.trim();

    if (showAddGrade.value) {
      await ApiService.addScore(studentId, {
        score,
        subject: subjectValue,
        recorded_at: recordedAt,
        note: note || undefined,
      });
    } else if (showEditGrade.value && currentGrade.value.id !== null) {
      if (currentGrade.value.scoreIndex === null || currentGrade.value.scoreIndex === undefined) {
        showError('保存失败', '缺少成绩索引，无法更新');
        return;
      }
      await ApiService.updateStudentScore(studentId, currentGrade.value.scoreIndex, {
        newScore: score,
        subject: subjectValue,
        recorded_at: recordedAt,
        note: note || undefined,
      });
    }

    await refreshScoreRelatedViews(studentId);

    showSuccess('保存成功', '成绩已保存');
    closeModals();
  } catch (error: any) {
    showError('保存失败', error?.message || '无法保存成绩');
  } finally {
    loading.value = false;
  }
};

const editGrade = (g: Grade) => {
  currentGrade.value = {
    ...g,
    studentId: String(g.studentId),
    scoreIndex: g.scoreIndex,
    course: g.course || '',
    date: g.date || getTodayDateString(),
    notes: g.notes || '',
  };
  showEditGrade.value = true;
};

const deleteGrade = (grade: Grade) => {
  showConfirm({
    title: '删除成绩',
    message: `确定删除学员 ${getDisplayStudentName(grade)} 的该条成绩吗？`,
    confirmType: 'danger',
    onConfirm: async () => {
      loading.value = true;
      try {
        await ApiService.deleteStudentScore(grade.studentId, grade.scoreIndex);
        await refreshScoreRelatedViews(grade.studentId);
        showSuccess('删除成功', '成绩已删除');
      } catch (error: any) {
        showError('删除失败', error?.message || '无法删除成绩');
      } finally {
        loading.value = false;
      }
    },
  });
};

// Watchers & Lifecycle
watch(() => currentGrade.value.studentId, () => {
  syncCurrentGradeCourseBySubject();
});

onMounted(() => {
  loadData(true);
});
onUnmounted(() => abortController.value?.abort());
</script>

<style scoped>
.grade-management {
  display: flex;
  flex-direction: column;
  min-height: 100%;
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

.quick-course-select {
  min-width: 104px;
}

.quick-course-field {
  min-width: 104px;
  padding: 0.4rem 1.6rem 0.4rem 0.6rem;
  background: transparent;
  border: none;
  color: var(--text-primary);
  appearance: none;
  cursor: pointer;
}

.quick-course-field:focus {
  outline: none;
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
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 100%;
}

.student-dashboard {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.5rem;
  min-height: 520px;
}

/* Dashboard Left: Charts & Stats */
.dashboard-left {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.stats-sections {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stats-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stats-section-head {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding-left: 0.2rem;
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

.scores-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.scores-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.scores-section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding-bottom: 0.35rem;
  border-bottom: 1px dashed var(--border-subtle);
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.score-capsule {
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 0.65rem 0.55rem;
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
.capsule-meta { font-size: 0.72rem; color: var(--text-secondary); line-height: 1.2; }
.capsule-time { font-size: 0.7rem; color: var(--text-secondary); line-height: 1.2; }

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

.scores-empty {
  border: 1px dashed var(--border-subtle);
  border-radius: 8px;
  padding: 1rem;
  color: var(--text-secondary);
  text-align: center;
  background-color: var(--bg-app);
}

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

/* Global List - Grade Cards */
.global-list-section {
  background: linear-gradient(180deg, var(--bg-surface) 0%, rgba(25, 30, 40, 0.6) 100%);
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  flex-shrink: 0;
  position: relative;
}

.global-list-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.15), transparent);
}

.section-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05));
  border: 1px solid rgba(99, 102, 241, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #818cf8;
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.title-text .main-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.title-text .sub-title {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.view-all-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: rgba(0,0,0,0.2);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-all-btn:hover {
  border-color: rgba(99, 102, 241, 0.4);
  color: var(--primary-color);
}

.grades-list-container {
  padding: 0.75rem;
  max-height: 480px;
  overflow-y: auto;
}

.grades-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-secondary);
  gap: 0.75rem;
}

.grades-empty svg {
  opacity: 0.3;
}

.grade-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.grade-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideIn 0.4s ease backwards;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.grade-card:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  transform: translateX(4px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

/* Student Avatar */
.grade-student-avatar {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
  text-transform: uppercase;
}

.grade-student-avatar.excellent {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(16, 185, 129, 0.08));
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #34d399;
}

.grade-student-avatar.good {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.35);
  color: #a78bfa;
}

.grade-student-avatar.pass {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.08));
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
}

.grade-student-avatar.fail {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.08));
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
}

/* Grade Info */
.grade-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.grade-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.student-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.course-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  background: rgba(255,255,255,0.06);
  color: var(--text-secondary);
  font-weight: 500;
}

.grade-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.grade-time {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.grade-level {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.grade-level.excellent {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
}

.grade-level.good {
  background: rgba(139, 92, 246, 0.12);
  color: #a78bfa;
}

.grade-level.pass {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
}

.grade-level.fail {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
}

/* Grade Right */
.grade-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.score-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.score-circle::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  padding: 2px;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.score-circle.excellent::before {
  background: conic-gradient(#10b981 var(--score-percent, 90%), transparent 0);
}

.score-circle.good::before {
  background: conic-gradient(#8b5cf6 var(--score-percent, 80%), transparent 0);
}

.score-circle.pass::before {
  background: conic-gradient(#f59e0b var(--score-percent, 60%), transparent 0);
}

.score-circle.fail::before {
  background: conic-gradient(#ef4444 var(--score-percent, 50%), transparent 0);
}

.score-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  z-index: 1;
}

.grade-actions {
  display: flex;
  gap: 0.3rem;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.grade-card:hover .grade-actions {
  opacity: 1;
}

.grade-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.grade-action-btn:hover {
  background: rgba(255,255,255,0.06);
}

.grade-action-btn.edit { color: #60a5fa; }
.grade-action-btn.edit:hover {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.3);
}

.grade-action-btn.delete { color: #f87171; }
.grade-action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

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
  
  .grade-card {
    padding: 0.75rem;
    gap: 0.625rem;
  }
  
  .grade-student-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.875rem;
  }
  
  .score-circle {
    width: 40px;
    height: 40px;
  }
  
  .score-value {
    font-size: 0.8rem;
  }
  
  .grade-actions {
    opacity: 1;
  }
  
  .section-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .grade-card {
    position: relative;
    padding-bottom: 2.25rem;
  }
  
  .grade-actions {
    position: absolute;
    bottom: 0.4rem;
    right: 0.75rem;
  }
  
  .grade-meta {
    gap: 0.4rem;
  }
  
  .student-name {
    font-size: 0.875rem;
  }
}
</style>

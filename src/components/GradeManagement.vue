<template>
  <div class="grade-management">
    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-progress"></div>

    <div class="section-header">
      <h2>成绩管理</h2>
      <div class="header-actions">
        <button class="add-btn" @click="showAddGrade = true">
          ➕ 添加成绩
        </button>
        <button class="refresh-btn" @click="loadData" :disabled="loading">
          {{ loading ? '加载中...' : '🔄 刷新' }}
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

    <!-- 学员选择和快速添加 -->
    <div class="quick-add-section">
      <div class="student-selector">
        <label for="student-select" class="visually-hidden">选择学员</label>
        <select
          id="student-select"
          v-model="selectedStudent"
          @change="onStudentChange"
          ref="studentSelect"
          aria-label="学员选择"
        >
          <option value="">选择学员</option>
          <option
            v-for="student in students"
            :key="student.uid"
            :value="student.uid"
          >
            {{ student.name }} ({{ getStudentAge() }}岁)
          </option>
        </select>
      </div>

      <div class="quick-score-input" v-if="selectedStudentData">
        <label for="quick-score" class="visually-hidden">输入成绩</label>
        <input
          id="quick-score"
          v-model.number="quickScore"
          type="number"
          :placeholder="getScorePlaceholder()"
          min="0"
          :max="getMaxScore()"
          step="0.1"
          aria-label="快速添加成绩"
        />
        <button
          class="add-score-btn"
          @click="addQuickScore"
          :disabled="!selectedStudent || quickScore === '' || quickScore === null || loading"
          :title="loading ? '请稍候...' : '添加成绩'"
          aria-label="添加成绩"
        >
          🎯 添加成绩
        </button>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section" v-if="selectedStudentData">
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

    <!-- 学员成绩详情 -->
    <div v-if="selectedStudentData" class="student-detail">
      <div class="student-info">
        <h3>{{ selectedStudentData.name }}</h3>
        <div class="info-tags">
          <span class="tag">{{ selectedStudentData.age }}岁</span>
          <span class="tag">{{ getClassText(selectedStudentData.class) }}</span>
          <span class="tag"
            >总记录: {{ selectedStudentData.rings.length }}次</span
          >
        </div>
      </div>

      <!-- 成绩统计 -->
      <div class="score-stats">
        <div class="stat-card">
          <h4>平均成绩</h4>
          <div class="stat-value">{{ averageScoreApi.toFixed(1) }}</div>
        </div>
        <div class="stat-card">
          <h4>最高成绩</h4>
          <div class="stat-value">{{ maxScoreApi.toFixed(1) }}</div>
        </div>
        <div class="stat-card">
          <h4>最低成绩</h4>
          <div class="stat-value">{{ minScoreApi.toFixed(1) }}</div>
        </div>
        <div class="stat-card">
          <h4>总射击次数</h4>
          <div class="stat-value">{{ selectedStudentData.rings.length }}</div>
        </div>
      </div>

      <!-- 成绩图表 -->
      <div class="score-chart">
        <h4>成绩趋势</h4>
        <div class="chart-container">
          <div class="chart-bars">
            <div
              v-for="(score, index) in recentScores"
              :key="index"
              class="chart-bar"
              :style="{ height: `${(score / getMaxScore()) * 100}%` }"
              :title="`第${index + 1}次: ${score}环`"
            >
              <span class="bar-label">{{ score }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 成绩列表 -->
      <div class="scores-list">
        <h4>详细成绩记录</h4>
        <div class="scores-grid">
          <div
            v-for="(score, index) in selectedStudentData.rings"
            :key="index"
            class="score-item"
            :class="getScoreClass(score)"
          >
            <div class="score-content">
              <div class="score-number">{{ score }}</div>
              <div class="score-index">第{{ index + 1 }}次</div>
            </div>
            <div class="score-actions">
              <button 
                class="edit-score-btn"
                @click="editScore(index, score)"
                :disabled="loading"
                title="编辑成绩"
              >
                ✏️
              </button>
              <button 
                class="delete-score-btn"
                @click="deleteScore(index, score)"
                :disabled="loading"
                title="删除成绩"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 批量操作 -->
      <div class="batch-operations">
        <h4>批量操作</h4>
        <div class="batch-buttons">
          <button
            class="batch-btn"
            @click="showBatchAddDialog"
            :disabled="loading"
            aria-label="批量添加成绩"
          >
            ➕ 批量添加
          </button>
          <button
            class="batch-btn"
            @click="exportScores"
            :disabled="loading"
            aria-label="导出成绩数据"
          >
            📊 导出成绩
          </button>
          <button
            class="batch-btn danger"
            @click="clearAllScores"
            :disabled="loading"
            aria-label="清空所有成绩"
          >
            🗑️ 清空成绩
          </button>
        </div>
      </div>
    </div>

    <!-- 无学员选择时的提示 -->
    <div v-else-if="!selectedStudentData && students.length > 0" class="no-selection">
      <div class="prompt-content">
        <div class="prompt-icon">🎯</div>
        <h3>选择学员查看成绩</h3>
        <p>请从上方下拉菜单中选择一个学员来查看和管理其射击成绩</p>
      </div>
    </div>

    <!-- 成绩表格 -->
    <div class="grades-table" v-if="filteredGrades.length > 0">
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
            <td>{{ grade.date }}</td>
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
                :key="student.uid"
                :value="student.uid"
              >
                {{ student.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>课程类型</label>
            <select v-model="currentGrade.course">
              <option value="">请选择课程类型</option>
              <option value="射击">射击</option>
              <option value="射箭">射箭</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>考试类型</label>
            <select v-model="currentGrade.examType">
              <option value="">请选择类型</option>
              <option value="期末考试">期末考试</option>
              <option value="平时测验">平时测验</option>
              <option value="作业">作业</option>
            </select>
          </div>
          <div class="form-group">
            <label>分数 {{ getScoreRangeText(currentGrade.course) }}</label>
            <input
              v-model.number="currentGrade.score"
              type="number"
              min="0"
              :max="getMaxScoreForCourse(currentGrade.course)"
              :placeholder="getScorePlaceholderText(currentGrade.course)"
            />
          </div>
          <div class="form-group">
            <DatePicker
              v-model="currentGrade.date"
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

    <!-- 批量添加成绩模态框 -->
    <div
      v-if="showBatchAdd"
      class="modal-overlay"
      @click="closeBatchAddDialog"
    >
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>批量添加成绩</h3>
          <button class="close-btn" @click="closeBatchAddDialog">✖️</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>成绩列表（每行一个成绩）</label>
            <textarea
              v-model="batchScoresText"
              rows="10"
              placeholder="输入成绩，每行一个&#10;例如：&#10;8.5&#10;9.0&#10;7.8"
            ></textarea>
            <div class="help-text">
              每行输入一个成绩，支持小数（保留一位）
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeBatchAddDialog">取消</button>
          <button class="save-btn" @click="batchAddScores">添加</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue';
import type { Student } from '../types/api';
import { ApiService } from '../api/ApiService';
import { handleValidationError } from '../utils/errorHandler';
import { validateScoreInput, safeParseNumber } from '../utils/dataTransformers';
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
  notes?: string;
}



interface ErrorHandler {
  showError: (title: string, message: string, details?: string) => void;
  showConfirm: (options: any) => void;
  showSuccess: (title: string, message: string) => void;
}

// 使用script setup提高类型安全
    const loading = ref(false);
    const grades = ref<Grade[]>([]);
    const students = ref<Student[]>([]);

    const selectedStudent = ref('');
    const selectedStudentData = ref<Student | null>(null);
    const quickScore = ref('');
    const studentSelect = ref<HTMLElement | null>(null);
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

    // 注入错误处理函数
    const errorHandler = inject<ErrorHandler>('errorHandler');
    interface RefreshSystem {
      refreshTriggers: {
        grades: number;
      };
    }
    
    const refreshSystem = inject<RefreshSystem>('refreshSystem');
    
    const showError = errorHandler?.showError || ((title: string, message: string, details?: string) => {
      console.error(title + ': ' + message, details);
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
    
    const showSuccess = errorHandler?.showSuccess || ((title: string, message: string) => {
      console.log('✅ ' + title + ': ' + message);
    });
    
    if (!errorHandler) {
      console.warn('⚠️ errorHandler 未正确注入到 GradeManagement 组件');
    }

    // 课程列表
    const courses = ['射击', '射箭', '其他'];

    // 计算属性
    const recentScores = computed(() => {
      if (!selectedStudentData.value) return [];
      return selectedStudentData.value.rings.slice(-20); // 最近20次成绩
    });

    const averageScoreApi = computed(() => {
      if (
        !selectedStudentData.value ||
        selectedStudentData.value.rings.length === 0
      )
        return 0;
      const sum = selectedStudentData.value.rings.reduce(
        (acc, score) => acc + score,
        0,
      );
      return sum / selectedStudentData.value.rings.length;
    });

    const maxScoreApi = computed(() => {
      if (
        !selectedStudentData.value ||
        selectedStudentData.value.rings.length === 0
      )
        return 0;
      let max = -Infinity;
      for (const s of selectedStudentData.value.rings) if (s > max) max = s;
      return max === -Infinity ? 0 : max;
    });

    const minScoreApi = computed(() => {
      if (
        !selectedStudentData.value ||
        selectedStudentData.value.rings.length === 0
      )
        return 0;
      let min = Infinity;
      for (const s of selectedStudentData.value.rings) if (s < min) min = s;
      return min === Infinity ? 0 : min;
    });

    const filteredGrades = computed(() => {
      let filtered = grades.value;

      // 如果选中了学员，只显示该学员的成绩
      if (selectedStudentData.value) {
        filtered = filtered.filter((g) => g.studentName === selectedStudentData.value!.name);
      }

      if (selectedCourse.value) {
        filtered = filtered.filter((g) => g.course === selectedCourse.value);
      }

      if (selectedExamType.value) {
        filtered = filtered.filter(
          (g) => g.examType === selectedExamType.value,
        );
      }

      if (studentSearch.value) {
        const q = studentSearch.value.toLowerCase();
        filtered = filtered.filter((g) =>
          g.studentName.toLowerCase().includes(q),
        );
      }

      return filtered;
    });

    const totalCount = computed(() => {
      // 如果选中了学员，返回 API 数据的数量
      if (selectedStudentData.value) {
        return selectedStudentData.value.rings.length;
      }
      // 否则返回所有成绩的数量
      return filteredGrades.value.length;
    });
    
    const passedCount = computed(() => {
      // 如果选中了学员，计算 API 数据的及格数
      if (selectedStudentData.value) {
        return selectedStudentData.value.rings.filter(score => {
          const subject = selectedStudentData.value!.subject;
          if (subject === 'Shooting') return score >= 300;
          if (subject === 'Archery') return score >= 300;
          return score >= 60;
        }).length;
      }
      // 否则计算所有成绩的及格数
      return filteredGrades.value.filter((g) => g.score >= 60).length;
    });
    
    const excellentCount = computed(() => {
      // 如果选中了学员，计算 API 数据的优秀数
      if (selectedStudentData.value) {
        return selectedStudentData.value.rings.filter(score => {
          const subject = selectedStudentData.value!.subject;
          if (subject === 'Shooting') return score >= 500;
          if (subject === 'Archery') return score >= 450;
          return score >= 90;
        }).length;
      }
      // 否则计算所有成绩的优秀数
      return filteredGrades.value.filter((g) => g.score >= 90).length;
    });

    const averageScore = computed(() => {
      // 如果选中了学员，显示 API 数据的平均分
      if (selectedStudentData.value) {
        return averageScoreApi.value.toFixed(1);
      }
      // 否则显示模拟数据的平均分
      if (totalCount.value === 0) return 0;
      const sum = filteredGrades.value.reduce((acc, g) => acc + g.score, 0);
      return Math.round(sum / totalCount.value);
    });

    const highestScore = computed(() => {
      // 如果选中了学员，显示 API 数据的最高分
      if (selectedStudentData.value) {
        return maxScoreApi.value.toFixed(1);
      }
      // 否则显示模拟数据的最高分
      if (totalCount.value === 0) return 0;
      return Math.max(...filteredGrades.value.map((g) => g.score));
    });

    const highestScorer = computed(() => {
      // 如果选中了学员，显示学员名字
      if (selectedStudentData.value) {
        return selectedStudentData.value.name;
      }
      // 否则显示模拟数据的最高分获得者
      if (totalCount.value === 0) return '';
      const highestGrade = filteredGrades.value.reduce((max, g) =>
        g.score > max.score ? g : max,
      );
      return highestGrade.studentName;
    });

    const passRate = computed(() => {
      // 如果选中了学员，计算 API 数据的及格率
      if (selectedStudentData.value && selectedStudentData.value.rings.length > 0) {
        const passedApiCount = selectedStudentData.value.rings.filter(score => {
          // 根据运动项目设置不同的及格线
          const subject = selectedStudentData.value!.subject;
          if (subject === 'Shooting') return score >= 300; // 射击及格线
          if (subject === 'Archery') return score >= 300; // 射箭及格线
          return score >= 60; // 其他项目及格线
        }).length;
        return Math.round((passedApiCount / selectedStudentData.value.rings.length) * 100);
      }
      // 否则计算模拟数据的及格率
      if (totalCount.value === 0) return 0;
      return Math.round((passedCount.value / totalCount.value) * 100);
    });

    const excellentRate = computed(() => {
      // 如果选中了学员，计算 API 数据的优秀率
      if (selectedStudentData.value && selectedStudentData.value.rings.length > 0) {
        const excellentApiCount = selectedStudentData.value.rings.filter(score => {
          // 根据运动项目设置不同的优秀线
          const subject = selectedStudentData.value!.subject;
          if (subject === 'Shooting') return score >= 500; // 射击优秀线
          if (subject === 'Archery') return score >= 450; // 射箭优秀线
          return score >= 90; // 其他项目优秀线
        }).length;
        return Math.round((excellentApiCount / selectedStudentData.value.rings.length) * 100);
      }
      // 否则计算模拟数据的优秀率
      if (totalCount.value === 0) return 0;
      return Math.round((excellentCount.value / totalCount.value) * 100);
    });

    const scoreRanges = computed(() => {
      // 如果选中了学员，使用 API 数据的分布
      if (selectedStudentData.value && selectedStudentData.value.rings.length > 0) {
        const subject = selectedStudentData.value.subject;
        let ranges;
        
        if (subject === 'Shooting') {
          ranges = [
            { label: '500+', min: 500, max: 654, count: 0, color: '#4caf50' },
            { label: '400-499', min: 400, max: 499, count: 0, color: '#8bc34a' },
            { label: '300-399', min: 300, max: 399, count: 0, color: '#ffc107' },
            { label: '200-299', min: 200, max: 299, count: 0, color: '#ff9800' },
            { label: '0-199', min: 0, max: 199, count: 0, color: '#f44336' },
          ];
        } else if (subject === 'Archery') {
          ranges = [
            { label: '450+', min: 450, max: 600, count: 0, color: '#4caf50' },
            { label: '350-449', min: 350, max: 449, count: 0, color: '#8bc34a' },
            { label: '250-349', min: 250, max: 349, count: 0, color: '#ffc107' },
            { label: '150-249', min: 150, max: 249, count: 0, color: '#ff9800' },
            { label: '0-149', min: 0, max: 149, count: 0, color: '#f44336' },
          ];
        } else {
          ranges = [
            { label: '90-100', min: 90, max: 100, count: 0, color: '#4caf50' },
            { label: '80-89', min: 80, max: 89, count: 0, color: '#8bc34a' },
            { label: '70-79', min: 70, max: 79, count: 0, color: '#ffc107' },
            { label: '60-69', min: 60, max: 69, count: 0, color: '#ff9800' },
            { label: '0-59', min: 0, max: 59, count: 0, color: '#f44336' },
          ];
        }
        
        selectedStudentData.value.rings.forEach((score) => {
          const range = ranges.find(
            (r) => score >= r.min && score <= r.max,
          );
          if (range) range.count++;
        });
        
        const maxCount = Math.max(...ranges.map((r) => r.count), 1);
        return ranges.map((r) => ({ ...r, maxCount }));
      }
      
      // 否则使用模拟数据的分布
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

    const getScoreClass = (score: number): 'excellent' | 'good' | 'average' | 'pass' | 'fail' => {
      // 如果选中了学员，根据运动项目设置不同的等级
      if (selectedStudentData.value) {
        const subject = selectedStudentData.value.subject;
        if (subject === 'Shooting') {
          if (score >= 500) return 'excellent';
          if (score >= 400) return 'good';
          if (score >= 300) return 'average';
          if (score >= 200) return 'pass';
          return 'fail';
        } else if (subject === 'Archery') {
          if (score >= 450) return 'excellent';
          if (score >= 350) return 'good';
          if (score >= 250) return 'average';
          if (score >= 150) return 'pass';
          return 'fail';
        }
      }
      
      // 默认的学术成绩等级
      if (score >= 90) return 'excellent';
      if (score >= 80) return 'good';
      if (score >= 70) return 'average';
      if (score >= 60) return 'pass';
      return 'fail';
    };

    const getScoreColor = (score: number): string => {
      const colors: Record<'excellent' | 'good' | 'average' | 'pass' | 'fail', string> = {
        excellent: '#4caf50',
        good: '#8bc34a',
        average: '#ffc107',
        pass: '#ff9800',
        fail: '#f44336',
      };
      return colors[getScoreClass(score)];
    };

    const getGradeLevel = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
      // 如果选中了学员，根据运动项目设置不同的等级
      if (selectedStudentData.value) {
        const subject = selectedStudentData.value.subject;
        if (subject === 'Shooting') {
          if (score >= 500) return 'A';
          if (score >= 400) return 'B';
          if (score >= 300) return 'C';
          if (score >= 200) return 'D';
          return 'F';
        } else if (subject === 'Archery') {
          if (score >= 450) return 'A';
          if (score >= 350) return 'B';
          if (score >= 250) return 'C';
          if (score >= 150) return 'D';
          return 'F';
        }
      }
      
      // 默认的学术成绩等级
      if (score >= 90) return 'A';
      if (score >= 80) return 'B';
      if (score >= 70) return 'C';
      if (score >= 60) return 'D';
      return 'F';
    };

    // 格式化方法
    const getStudentAge = (): string => {
      // 这里需要从API或其他地方获取学生的实际年龄
      // 暂时返回默认值
      return '未知';
    };
    const getClassText = (classType: 'TenTry' | 'Month' | 'Year' | 'Others' | string): string => {
      const classMap: { TenTry: string; Month: string; Year: string; Others: string } = {
        TenTry: '体验课',
        Month: '月卡',
        Year: '年卡',
        Others: '其他',
      };
      return (classMap as Record<string, string>)[classType] || classType;
    };

    // 根据学员的运动项目获取最高分数
    const getMaxScore = (): number => {
      if (!selectedStudentData.value) return 100; // 默认值

      const subject = selectedStudentData.value.subject;
      switch (subject) {
        case 'Shooting':
          return 654;
        case 'Archery':
          return 600;
        case 'Others':
        default:
          return 100;
      }
    };

    // 获取输入框的占位符文本
    const getScorePlaceholder = (): string => {
      if (!selectedStudentData.value) return '输入成绩';

      const subject = selectedStudentData.value.subject;
      switch (subject) {
        case 'Shooting':
          return '输入成绩 (0-654)';
        case 'Archery':
          return '输入成绩 (0-600)';
        case 'Others':
        default:
          return '输入成绩 (0-100)';
      }
    };

    // 根据课程类型获取分数上限
    const getMaxScoreForCourse = (course: string): number => {
      switch (course) {
        case '射击':
          return 645;
        case '射箭':
          return 600;
        case '其他':
        default:
          return 1000; // 设置一个较大的上限值
      }
    };

    // 根据课程类型获取分数范围文本
    const getScoreRangeText = (course: string): string => {
      switch (course) {
        case '射击':
          return '(0-645)';
        case '射箭':
          return '(0-600)';
        case '其他':
          return '(无限制)';
        default:
          return '';
      }
    };

    // 根据课程类型获取占位符文本
    const getScorePlaceholderText = (course: string): string => {
      switch (course) {
        case '射击':
          return '请输入射击成绩 (0-645)';
        case '射箭':
          return '请输入射箭成绩 (0-600)';
        case '其他':
          return '请输入成绩';
        default:
          return '请选择课程类型后输入成绩';
      }
    };

    // 输入验证函数


    const filterGrades = (): void => {
      // 筛选逻辑已通过computed属性实现
    };

    const editGrade = (grade: Grade): void => {
      currentGrade.value = {
        id: grade.id,
        studentId: String(grade.studentId),
        studentName: grade.studentName || '',
        course: grade.course || '',
        examType: grade.examType || '',
        score: grade.score ?? 0,
        date: grade.date || '',
        notes: grade.notes || '',
      };
      showEditGrade.value = true;
    };

    const deleteGrade = (id: number): void => {
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

    const saveGrade = (): void => {
      if (
        !currentGrade.value.studentId ||
        !currentGrade.value.course ||
        currentGrade.value.score === null || currentGrade.value.score === undefined
      ) {
        handleValidationError('missing_fields', '请填写必要信息：学员、课程类型和分数');
        return;
      }

      // 验证分数范围
      const maxScore = getMaxScoreForCourse(currentGrade.value.course);
      if (maxScore && currentGrade.value.score > maxScore) {
        handleValidationError('score_range', `${currentGrade.value.course}课程的分数不能超过${maxScore}`);
        return;
      }

      if (currentGrade.value.score < 0) {
        handleValidationError('negative_score', '分数不能为负数');
        return;
      }

      // 获取学员姓名 - 改进学员ID转换
      const studentId = Number(currentGrade.value.studentId);
      if (isNaN(studentId) || studentId <= 0) {
        handleValidationError('invalid_student_id', '学员ID无效');
        return;
      }
      
      const student = students.value.find(
        (s: any) => s.uid === studentId,
      );
      if (student) {
        currentGrade.value.studentName = student.name;
      }

      if (showAddGrade.value) {
        // 添加新成绩
        const newGrade: Grade = {
          id: Date.now(),
          studentId: currentGrade.value.studentId ? Number(currentGrade.value.studentId) : 0,
          studentName: currentGrade.value.studentName,
          course: currentGrade.value.course,
          examType: currentGrade.value.examType,
          score: currentGrade.value.score,
          date: currentGrade.value.date ? currentGrade.value.date : new Date().toISOString().split('T')[0] as string,
          notes: currentGrade.value.notes,
        };
        grades.value.push(newGrade);
      } else {
        // 编辑现有成绩
        const index = grades.value.findIndex(
          (g) => g.id === currentGrade.value.id,
        );
        if (index === -1) {
          return;
        }
        if (index !== -1) {
          const fallback = grades.value[index]!;
          grades.value[index] = {
            id: (currentGrade.value.id ?? fallback.id) as number,
            studentId: currentGrade.value.studentId ? Number(currentGrade.value.studentId) : (fallback.studentId ? Number(fallback.studentId) : 0),
            studentName: currentGrade.value.studentName || fallback.studentName,
            course: currentGrade.value.course || fallback.course,
            examType: currentGrade.value.examType || fallback.examType,
            score: currentGrade.value.score ?? fallback.score,
            date: currentGrade.value.date || fallback.date || new Date().toISOString().split('T')[0],
            notes: currentGrade.value.notes ?? fallback.notes,
          } as Grade;
        }
      }

      closeModals();
    };

    const closeModals = (): void => {
      showAddGrade.value = false;
      showEditGrade.value = false;
      currentGrade.value = {
        id: null,
        studentId: '',
        studentName: '',
        course: '',
        examType: '',
        score: null,
        date: '',
        notes: '',
      };
    };

    // 批量添加成绩
    const showBatchAddDialog = (): void => {
      if (!selectedStudent.value) {
        showError('操作失败', '请先选择学员');
        return;
      }
      showBatchAdd.value = true;
      batchScoresText.value = '';
    };

    const closeBatchAddDialog = (): void => {
      showBatchAdd.value = false;
      batchScoresText.value = '';
    };

    const batchAddScores = async (): Promise<void> => {
      if (loading.value) {
        if (import.meta.env?.MODE !== 'production') console.warn('正在处理中，请勿重复操作');
        return;
      }

      if (!selectedStudent.value) {
        showError('操作失败', '请先选择学员');
        return;
      }

      if (!batchScoresText.value.trim()) {
        handleValidationError('empty_scores', '请输入至少一个成绩');
        return;
      }

      // 解析成绩文本
      const lines = batchScoresText.value.split('\n').map(line => line.trim()).filter(line => line !== '');
      const scores: number[] = [];
      const errors: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const score = Number(line);
        const validation = validateScoreInput(score);
        
        if (!validation.valid) {
          errors.push(`第 ${i + 1} 行: ${validation.errors.join(', ')}`);
        } else {
          // 保留一位小数
          scores.push(parseFloat(score.toFixed(1)));
        }
      }

      if (errors.length > 0) {
        handleValidationError('batch_score_validation', '部分成绩无效:\n' + errors.join('\n'));
        return;
      }

      if (scores.length === 0) {
        handleValidationError('no_valid_scores', '没有有效的成绩');
        return;
      }

      loading.value = true;
      try {
        const studentUid = Number(selectedStudent.value);
        const studentName = students.value.find((s: any) => s.uid === studentUid)?.name || '未知学员';
        
        // 批量添加成绩：逐个调用 addScore API
        for (const score of scores) {
          await ApiService.addScore(studentUid, score);
        }
        
        if (import.meta.env?.MODE !== 'production') console.log(`成功为学员 ${studentUid} 批量添加 ${scores.length} 个成绩`);
        
        // 保存当前页面状态
        try {
          localStorage.setItem('qmx_active_tab', 'grades');
          localStorage.setItem('qmx_last_operation', `已为${studentName}批量添加${scores.length}个成绩`);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error: any) {
          if (import.meta.env?.MODE !== 'production') console.warn('保存页面状态失败:', error);
        }
        
        if (import.meta.env?.MODE !== 'production') console.log(`✅ 已为${studentName}批量添加${scores.length}个成绩，刷新当前学员数据`);
        
        showSuccess('批量添加成功', `已为${studentName}添加${scores.length}个成绩`);
        closeBatchAddDialog();
        await onStudentChange();
      } catch (error: any) {
        if (import.meta.env?.MODE !== 'production') console.error('批量添加成绩失败:', error);
        showError(
          '批量添加失败', 
          '批量添加学员成绩时发生错误，请稍后重试', 
          error.message || '未知错误'
        );
      } finally {
        loading.value = false;
      }
    };

    // 清空所有成绩
    const clearAllScores = (): void => {
      if (loading.value) {
        if (import.meta.env?.MODE !== 'production') console.warn('正在处理中，请勿重复操作');
        return;
      }

      if (!selectedStudent.value) {
        showError('操作失败', '请先选择学员');
        return;
      }

      if (!selectedStudentData.value || selectedStudentData.value.rings.length === 0) {
        showError('操作失败', '该学员暂无成绩记录');
        return;
      }

      const studentName = students.value.find((s: any) => s.uid === Number(selectedStudent.value))?.name || '未知学员';
      const scoreCount = selectedStudentData.value.rings.length;

      showConfirm({
        title: '清空成绩',
        message: `确定要清空${studentName}的所有${scoreCount}条成绩记录吗？此操作不可恢复！`,
        confirmText: '清空',
        cancelText: '取消',
        confirmType: 'danger',
        onConfirm: async () => {
          loading.value = true;
          try {
            const studentUid = Number(selectedStudent.value);
            
            // 清空成绩：使用批量更新API设置为空数组
            await ApiService.updateScoresBatch(studentUid, []);
            
            if (import.meta.env?.MODE !== 'production') console.log(`成功清空学员 ${studentUid} 的所有成绩`);
            
            // 保存当前页面状态
            try {
              localStorage.setItem('qmx_active_tab', 'grades');
              localStorage.setItem('qmx_last_operation', `已清空${studentName}的${scoreCount}条成绩记录`);
              localStorage.setItem('qmx_last_operation_time', Date.now().toString());
            } catch (error: any) {
              if (import.meta.env?.MODE !== 'production') console.warn('保存页面状态失败:', error);
            }
            
            if (import.meta.env?.MODE !== 'production') console.log(`✅ 已清空${studentName}的所有成绩，刷新当前学员数据`);
            
            showSuccess('清空成功', `已清空${studentName}的所有成绩`);
            await onStudentChange();
          } catch (error: any) {
            if (import.meta.env?.MODE !== 'production') console.error('清空成绩失败:', error);
            showError(
              '清空失败', 
              '清空学员成绩时发生错误，请稍后重试', 
              error.message || '未知错误'
            );
          } finally {
            loading.value = false;
          }
        }
      });
    };

    // 删除成绩
    const deleteScore = async (scoreIndex: number, score: number): Promise<void> => {
      if (loading.value) {
        if (import.meta.env?.MODE !== 'production') console.warn('正在处理中，请勿重复操作');
        return;
      }

      if (!selectedStudent.value) {
        showError('操作失败', '请先选择学员');
        return;
      }

      const studentName = students.value.find((s: any) => s.uid === Number(selectedStudent.value))?.name || '未知学员';
      showConfirm({
        title: '删除成绩',
        message: `确定要删除${studentName}的第${scoreIndex + 1}次成绩 ${score} 吗？`,
        confirmText: '删除',
        cancelText: '取消',
        confirmType: 'danger',
        onConfirm: async () => {
          loading.value = true;
      try {
        const studentUid = Number(selectedStudent.value);
        await ApiService.deleteStudentScore(studentUid, scoreIndex);
        
        if (import.meta.env?.MODE !== 'production') console.log('成功删除学员 ' + studentUid + ' 的第 ' + scoreIndex + ' 个成绩');
        
        // 保存当前页面状态
        try {
          localStorage.setItem('qmx_active_tab', 'grades');
          localStorage.setItem('qmx_last_operation', '已删除' + studentName + '的第' + (scoreIndex + 1) + '次成绩' + score);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error: any) {
          if (import.meta.env?.MODE !== 'production') console.warn('保存页面状态失败:', error);
        }
        
        if (import.meta.env?.MODE !== 'production') console.log(`✅ 已删除${studentName}的第${scoreIndex + 1}次成绩${score}，刷新当前学员数据`);
        
        await onStudentChange();
      } catch (error: any) {
        if (import.meta.env?.MODE !== 'production') console.error('删除成绩失败:', error);
        showError(
          '删除失败', 
          '删除学员成绩时发生错误，请稍后重试', 
          error.message || '未知错误'
        );
          } finally {
            loading.value = false;
          }
        }
      });
    };

    // 编辑成绩
    const editScore = (scoreIndex: number, currentScore: number): void => {
      if (loading.value) {
        if (import.meta.env?.MODE !== 'production') console.warn('正在处理中，请勿重复操作');
        return;
      }

      if (!selectedStudent.value) {
        showError('操作失败', '请先选择学员');
        return;
      }

      const newScoreInput = prompt(`请输入新的成绩 (0-${getMaxScore()}):`, String(currentScore));
      if (newScoreInput === null) return; // 用户取消
      
      // 安全解析数字并保留一位小数
      const parsedScore = safeParseNumber(newScoreInput, 0, { min: 0, max: 1000, decimals: 1 });
      
      const validation = validateScoreInput(parsedScore);
      if (!validation.valid) {
        handleValidationError('score_input', validation.errors.join('；'));
        return;
      }
      
      const score = parsedScore;
      if (score === currentScore) {
        return; // 没有变化
      }
      
      updateScore(scoreIndex, score, currentScore);
    };

    const updateScore = async (scoreIndex: number, newScore: number, currentScore: number): Promise<void> => {
      loading.value = true;
      
      try {
        const studentUid = Number(selectedStudent.value);
        const studentName = students.value.find((s: any) => s.uid === studentUid)?.name || '未知学员';
        
        await ApiService.updateStudentScore(studentUid, scoreIndex, newScore);
        
        console.log('成功更新学员 ' + studentUid + ' 的第 ' + scoreIndex + ' 个成绩为 ' + newScore);
        
        // 保存当前页面状态
        try {
          localStorage.setItem('qmx_active_tab', 'grades');
          localStorage.setItem('qmx_last_operation', '已将' + studentName + '的第' + (scoreIndex + 1) + '次成绩从' + currentScore + '修改为' + newScore);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error: any) {
          if (import.meta.env?.MODE !== 'production') console.warn('保存页面状态失败:', error);
        }
        
        console.log('✅ 已将' + studentName + '的第' + (scoreIndex + 1) + '次成绩从' + currentScore + '修改为' + newScore + '，刷新当前学员数据');
        
        await onStudentChange();
      } catch (error: any) {
        console.error('更新成绩失败:', error);
        showError(
          '更新失败', 
          '更新学员成绩时发生错误，请稍后重试', 
          error.message || '未知错误'
        );
      } finally {
        loading.value = false;
      }
    };

    // 数据加载
    const loadData = async (): Promise<void> => {
      if (loading.value) {
        if (import.meta.env?.MODE !== 'production') console.warn('学员数据正在加载中，跳过重复请求');
        return;
      }

      loading.value = true;
      abortController.value = new AbortController();

      try {
        const response = await ApiService.getAllStudents();
        
        // 解析响应包装：{ students, pagination }
        const data = response.students || [];
        
        // 验证返回的数据
        if (!Array.isArray(data)) {
          throw new Error('返回的学员数据格式不正确，期望数组格式');
        }
        
        // 验证并清理学员数据
        const validStudents = data.filter(student => {
          if (!student || typeof student !== 'object') return false;
          if (!student.uid || !student.name) return false;
          
          // 确保 rings 是数组
          if (!Array.isArray(student.rings)) {
            student.rings = [];
          }
          
          // 过滤无效成绩
          student.rings = student.rings.filter((score: number) => 
            typeof score === 'number' && !isNaN(score) && isFinite(score)
          );
          
          return true;
        });
        
        if (validStudents.length !== data.length) {
          if (import.meta.env?.MODE !== 'production') console.warn('过滤了 ' + (data.length - validStudents.length) + ' 个无效学员记录');
        }
        
        students.value = validStudents;
        if (import.meta.env?.MODE !== 'production') console.log('成功加载 ' + validStudents.length + ' 个学员记录');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          if (import.meta.env?.MODE !== 'production') console.error('加载学员数据失败:', error);
          students.value = []; // 确保有默认值
          showError(
            '数据加载失败',
            '无法获取学员列表，请检查网络连接或稍后重试',
            error.message || '未知错误',
          );
        }
      } finally {
        loading.value = false;
        abortController.value = null;
      }
    };

    const onStudentChange = async (): Promise<void> => {
      if (!selectedStudent.value) {
        selectedStudentData.value = null;
        quickScore.value = '';
        return;
      }

      if (loading.value) {
        if (import.meta.env?.MODE !== 'production') console.warn('正在加载学员成绩，跳过重复请求');
        return;
      }

      loading.value = true;
      abortController.value = new AbortController();

      try {
        const studentUid = Number(selectedStudent.value);
        if (typeof studentUid !== 'number' || !Number.isInteger(studentUid) || studentUid <= 0) {
          throw new Error('无效的学员ID');
        }

        const scores = await ApiService.getStudentScores(studentUid);
                 const student = students.value.find((s: any) => s.uid === studentUid);
        
        if (!student) {
          throw new Error('找不到对应的学员信息');
        }

        // 验证成绩数据
        let validScores: number[] = [];
        if (Array.isArray(scores)) {
          validScores = scores.filter(score => 
            typeof score === 'number' && !isNaN(score) && isFinite(score)
          );
          
          if (validScores.length !== scores.length) {
            if (import.meta.env?.MODE !== 'production') console.warn('过滤了 ' + (scores.length - validScores.length) + ' 个无效成绩');
          }
        } else {
          if (import.meta.env?.MODE !== 'production') console.warn('返回的成绩数据不是数组格式，使用空数组');
        }

        selectedStudentData.value = {
          ...student,
          rings: validScores,
        } as Student;
        
        if (import.meta.env?.MODE !== 'production') console.log('加载学员 ' + student.name + ' 的 ' + validScores.length + ' 条成绩记录');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          if (import.meta.env?.MODE !== 'production') console.error('加载学员成绩失败:', error);
          selectedStudentData.value = null;
          showError(
            '获取失败',
            '加载学员成绩时发生错误，请稍后重试',
            error.message || '未知错误',
          );
        }
      } finally {
        loading.value = false;
        abortController.value = null;
      }
    };

    // 成绩操作
    const addQuickScore = async (): Promise<void> => {
      if (loading.value) {
        if (import.meta.env?.MODE !== 'production') console.warn('正在处理成绩添加，请勿重复提交');
        return;
      }

      if (!selectedStudent.value) {
        showError('选择错误', '请先选择一个学员');
        return;
      }

      // 安全解析数字并保留一位小数
      const parsedScore = safeParseNumber(quickScore.value, 0, { min: 0, max: 1000, decimals: 1 });
      
      // 验证成绩输入
      const validation = validateScoreInput(parsedScore);
      if (!validation.valid) {
        handleValidationError('quick_score_validation', validation.errors.join('；'));
        return;
      }

      const score = parsedScore;
      const studentUid = Number(selectedStudent.value);

      loading.value = true;
      try {
        const studentName = students.value.find((s: any) => s.uid == studentUid)?.name || '未知学员';
        await ApiService.addScore(studentUid, score);
        
        if (import.meta.env?.MODE !== 'production') console.log('成功为学员 ' + studentUid + ' 添加成绩 ' + score);
        
        // 保存当前页面状态
        try {
          localStorage.setItem('qmx_active_tab', 'grades');
          localStorage.setItem('qmx_last_operation', '已为' + studentName + '添加成绩' + score);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error: any) {
          if (import.meta.env?.MODE !== 'production') console.warn('保存页面状态失败:', error);
        }
        
        if (import.meta.env?.MODE !== 'production') console.log('✅ 已为' + studentName + '添加成绩' + score + '，刷新当前学员数据');
        
        await onStudentChange();
        quickScore.value = '';
      } catch (error: any) {
        if (import.meta.env?.MODE !== 'production') console.error('添加成绩失败:', error);
        showError(
          '添加失败', 
          '添加学员成绩时发生错误，请稍后重试', 
          error.message || '未知错误'
        );
      } finally {
        loading.value = false;
      }
    };

    // 导出功能
    const exportScores = (): void => {
      try {
        if (!selectedStudentData.value) {
          showError('导出失败', '请先选择一个学员');
          return;
        }

        if (!selectedStudentData.value.rings || selectedStudentData.value.rings.length === 0) {
          showError('导出失败', '该学员暂无成绩记录');
          return;
        }

        // 数据量检查，防止导出过大文件
        if (selectedStudentData.value.rings.length > 50000) {
          showError('导出失败', '成绩记录过多，请联系管理员处理');
          return;
        }

        // 安全的CSV内容生成
        const headers = '序号,成绩,等级,日期\n';
        const rows = selectedStudentData.value.rings
          .slice(0, 10000) // 限制最大导出数量
          .map((score, index) => {
            // 数据清理和验证
            const safeScore = typeof score === 'number' && isFinite(score) ? score.toFixed(2) : '0.00';
            const scoreClass = getScoreClass(Number(safeScore));
            const date = new Date().toLocaleDateString('zh-CN');
            
            // CSV注入防护 - 转义特殊字符
            const safeIndex = String(index + 1).replace(/[,"\r\n]/g, '');
            const safeScoreClass = String(scoreClass).replace(/[,"\r\n]/g, '');
            const safeDate = String(date).replace(/[,"\r\n]/g, '');
            
            return `"${safeIndex}","${safeScore}","${safeScoreClass}","${safeDate}"`;
          })
          .join('\n');

        // 添加BOM以支持中文
        const csvContent = '\uFEFF' + headers + rows;
        
        // 创建安全的Blob对象
        const blob = new Blob([csvContent], { 
          type: 'text/csv;charset=utf-8' 
        });
        
        // 安全的文件名处理 - 更严格的过滤
        const safeName = selectedStudentData.value.name
          .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // 移除文件系统不安全字符
          .replace(/\s+/g, '_') // 空格替换为下划线
          .substring(0, 50); // 限制长度
        
        const timestamp = new Date().toISOString().slice(0, 10);
        const fileName = `${safeName}_成绩表_${timestamp}.csv`;
        
        // 使用现代API创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // 安全属性设置
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        link.rel = 'noopener noreferrer'; // 安全属性
        
        // 执行下载
        document.body.appendChild(link);
        link.click();
        
        // 清理资源
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
        if (import.meta.env?.MODE !== 'production') console.log(`成功导出 ${selectedStudentData.value.name} 的成绩表 (${selectedStudentData.value.rings.length} 条记录)`);
        
        if (showSuccess) {
          showSuccess('导出成功', `${selectedStudentData.value.name} 的成绩表已导出`);
        }
      } catch (error: any) {
        if (import.meta.env?.MODE !== 'production') console.error('导出成绩失败:', error);
        showError('导出失败', '导出成绩表时发生错误', error.message || '未知错误');
      }
    };

    // 生命周期钩子
    // 监听刷新触发器
    if (refreshSystem?.refreshTriggers) {
      watch(
        () => refreshSystem.refreshTriggers.grades,
        (newValue, oldValue) => {
          if (newValue > oldValue) {
            if (import.meta.env?.MODE !== 'production') console.log('GradeManagement 收到刷新信号，重新加载数据');
            loadData();
          }
        }
      );
    }

    onMounted(() => {
      loadData(); // 加载 API 数据
    });

    onUnmounted(() => {
      if (abortController.value) {
        abortController.value.abort();
      }
    });

// script setup格式自动导出所有响应式变量和函数
</script>

<style scoped>
.grade-management {
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

.refresh-btn {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #1976d2;
  transform: translateY(-1px);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

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

/* 快速添加区域 */
.quick-add-section {
  display: flex;
  gap: 1rem;
  align-items: center;
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
}

.student-selector select {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  min-width: 200px;
  width: 100%;
}

.quick-score-input {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex: 1;
}

.quick-score-input input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.add-score-btn {
  background-color: var(--accent-secondary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-score-btn:hover:not(:disabled) {
  background-color: #45a049;
  transform: translateY(-1px);
}

.add-score-btn:disabled {
  background-color: var(--border-color);
  cursor: not-allowed;
}

/* 学员详情 */
.student-detail {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.student-info {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
}

.student-info h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.info-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
}

.score-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.score-stats .stat-card {
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.score-stats .stat-card h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.score-stats .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-primary);
}

.score-chart {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
}

.score-chart h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.chart-container {
  height: 200px;
  position: relative;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  height: 100%;
  gap: 2px;
  padding: 0 1rem;
  overflow-x: auto;
}

.chart-bar {
  flex: 1;
  background: linear-gradient(
    to top,
    var(--accent-primary),
    var(--accent-secondary)
  );
  border-radius: 2px 2px 0 0;
  position: relative;
  min-height: 4px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.chart-bar:hover {
  background: linear-gradient(to top, #1976d2, #4caf50);
  transform: scaleY(1.05);
}

.bar-label {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: var(--text-primary);
  white-space: nowrap;
}

.scores-list {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
}

.scores-list h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.5rem;
}

.score-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
  padding: 0.75rem;
  border-radius: 6px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
}

.score-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.score-content {
  flex: 1;
}

.score-actions {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.score-item:hover .score-actions {
  opacity: 1;
}

.edit-score-btn,
.delete-score-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
}

.edit-score-btn:hover {
  background-color: rgba(33, 150, 243, 0.1);
  transform: scale(1.1);
}

.delete-score-btn:hover {
  background-color: rgba(244, 67, 54, 0.1);
  transform: scale(1.1);
}

.edit-score-btn:disabled,
.delete-score-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.score-number {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.score-index {
  font-size: 0.75rem;
  opacity: 0.8;
}

.batch-operations {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
}

.batch-operations h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.batch-buttons {
  display: flex;
  gap: 1rem;
}

.batch-btn {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.batch-btn:hover:not(:disabled) {
  background-color: #1976d2;
  transform: translateY(-1px);
}

.batch-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.batch-btn.danger {
  background-color: #f44336;
}

.batch-btn.danger:hover:not(:disabled) {
  background-color: #d32f2f;
}

.no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  border-radius: 8px;
}

.prompt-content {
  text-align: center;
  color: var(--text-secondary);
}

.prompt-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.prompt-content h3 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

.prompt-content p {
  margin: 0;
  font-size: 1.1rem;
}

/* 隐藏的可访问性元素 */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
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

.help-text {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
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

  .quick-add-section {
    flex-direction: column;
    align-items: stretch;
  }

  .student-selector select {
    width: 100%;
  }

  .score-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-bars {
    padding: 0 0.5rem;
  }

  .scores-grid {
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  }

  .batch-buttons {
    flex-direction: column;
  }
}
</style>

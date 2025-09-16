<template>
  <div class="score-management">
    <!-- 加载进度条 -->
    <div v-if="loading" class="loading-progress"></div>

    <div class="section-header">
      <h2>分数管理</h2>
      <button
        class="refresh-btn"
        @click="loadData"
        :disabled="loading"
        aria-label="刷新学员数据"
      >
        {{ loading ? '加载中...' : '🔄 刷新' }}
      </button>
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
            {{ student.name }} ({{ student.age }}岁)
          </option>
        </select>
      </div>

      <div class="quick-score-input">
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
          :disabled="!selectedStudent || !quickScore || loading"
          :title="loading ? '请稍候...' : '添加成绩'"
          aria-label="添加成绩"
        >
          🎯 添加成绩
        </button>
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
          <div class="stat-value">{{ averageScore.toFixed(1) }}</div>
        </div>
        <div class="stat-card">
          <h4>最高成绩</h4>
          <div class="stat-value">{{ maxScore.toFixed(1) }}</div>
        </div>
        <div class="stat-card">
          <h4>最低成绩</h4>
          <div class="stat-value">{{ minScore.toFixed(1) }}</div>
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
            @click="exportScores"
            :disabled="loading"
            aria-label="导出成绩数据"
          >
            📊 导出成绩
          </button>
        </div>
      </div>
    </div>

    <!-- 无学员选择时的提示 -->
    <div v-else class="no-selection">
      <div class="prompt-content">
        <div class="prompt-icon">🎯</div>
        <h3>选择学员查看成绩</h3>
        <p>请从上方下拉菜单中选择一个学员来查看和管理其射击成绩</p>
      </div>
    </div>

    <!-- 分数编辑模态框 -->
    <div v-if="showScoreEditModal" class="score-edit-modal-overlay" @click="closeScoreEditModal">
      <div class="score-edit-modal" @click.stop>
        <div class="modal-header">
          <h3>编辑成绩</h3>
          <button class="close-btn" @click="closeScoreEditModal">×</button>
        </div>
        
        <div class="modal-content">
          <p>修改 <strong>{{ editingStudentName }}</strong> 的第 {{ editingScoreIndex + 1 }} 次成绩：</p>
          
          <div class="score-input-group">
            <label for="edit-score-input">新成绩：</label>
            <input
              id="edit-score-input"
              ref="scoreEditInput"
              v-model.number="editingScoreValue"
              type="number"
              :min="0"
              :max="getMaxScore()"
              step="0.1"
              :placeholder="`0-${getMaxScore()}`"
              @keyup.enter="confirmScoreEdit"
              @keyup.escape="closeScoreEditModal"
            />
            <span class="score-range">范围: 0-{{ getMaxScore() }}</span>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn-cancel" @click="closeScoreEditModal">取消</button>
          <button class="btn-confirm" @click="confirmScoreEdit" :disabled="!isValidScore">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue';
import { ApiService } from '../api/ApiService';
import type { Student } from '../types/api';

// TypeScript类型定义
interface ErrorHandler {
  showError: (title: string, message: string, details?: string) => void;
  showConfirm: (options: any) => void;
  showSuccess: (title: string, message: string) => void;
}

interface StudentData {
  rings: number[];
  uid: number;
  name: string;
  age: number;
  class: string;
  phone: string;
  note: string;
  cash: string;
  subject: string;
  lesson_left?: number;
  membership_start_date?: string | null;
  membership_end_date?: string | null;
  is_membership_active: boolean;
  membership_days?: number;
}

// 使用script setup提高类型安全
    const loading = ref(false);
    const students = ref<Student[]>([]);
    const selectedStudent = ref('');
    const selectedStudentData = ref<StudentData | null>(null);
    const quickScore = ref('');
    const studentSelect = ref<HTMLElement | null>(null);
    const abortController = ref<AbortController | null>(null);
    
    // 分数编辑模态框相关数据
    const showScoreEditModal = ref(false);
    const editingStudentName = ref('');
    const editingScoreIndex = ref(-1);
    const editingScoreValue = ref(0);
    const editingOriginalScore = ref(0);
    const scoreEditInput = ref<HTMLInputElement | null>(null);
    const errorHandler = inject<ErrorHandler>('errorHandler');
    const refreshSystem = inject<any>('refreshSystem');
    
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
    
    const showSuccess = errorHandler?.showSuccess || ((title: string, message: string) => {
      console.log(`✅ ${title}: ${message}`);
    });
    
    if (!errorHandler) {
      console.warn('⚠️ errorHandler 未正确注入到 ScoreManagement 组件');
    }

    // 计算属性
    const recentScores = computed(() => {
      if (!selectedStudentData.value) return [];
      return selectedStudentData.value.rings.slice(-20); // 最近20次成绩
    });

    const averageScore = computed(() => {
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

    const maxScore = computed(() => {
      if (
        !selectedStudentData.value ||
        selectedStudentData.value.rings.length === 0
      )
        return 0;
      return Math.max(...selectedStudentData.value.rings);
    });

    const minScore = computed(() => {
      if (
        !selectedStudentData.value ||
        selectedStudentData.value.rings.length === 0
      )
        return 0;
      return Math.min(...selectedStudentData.value.rings);
    });

    // 格式化方法
    const getClassText = (classType: 'TenTry' | 'Month' | 'Year' | 'Others' | string): string => {
      const classMap: { TenTry: string; Month: string; Year: string; Others: string } = {
        TenTry: '体验课',
        Month: '月卡',
        Year: '年卡',
        Others: '其他',
      };
      return (classMap as Record<string, string>)[classType] || classType;
    };

    const getScoreClass = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
      if (score >= 9.0) return 'excellent';
      if (score >= 7.0) return 'good';
      if (score >= 5.0) return 'average';
      return 'poor';
    };

    // 根据学员的运动项目获取最高分数
    const getMaxScore = (): number => {
      if (!selectedStudentData.value) return 10.9; // 默认值

      const subject = selectedStudentData.value.subject;
      switch (subject) {
        case 'Shooting':
          return 654;
        case 'Archery':
          return 600;
        case 'Others':
        default:
          return 999999; // 其他项目无限制，设置一个很大的数
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
          return '输入成绩 (无限制)';
      }
    };

    // 输入验证函数
    const validateScoreInput = (score: any, _studentData?: StudentData | null): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      if (score === null || score === undefined || score === '') {
        errors.push('成绩不能为空');
        return { isValid: false, errors };
      }
      
      const numScore = Number(score);
      if (isNaN(numScore) || !isFinite(numScore)) {
        errors.push('成绩必须是有效数字');
        return { isValid: false, errors };
      }
      
      if (numScore < 0) {
        errors.push('成绩不能为负数');
      }
      
      const maxScore = getMaxScore();
      if (numScore > maxScore) {
        errors.push(`成绩不能超过 ${maxScore}`);
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    };

    // 数据加载
    const loadData = async (): Promise<void> => {
      if (loading.value) {
        console.warn('学员数据正在加载中，跳过重复请求');
        return;
      }

      loading.value = true;
      abortController.value = new AbortController();

      try {
        const data = await ApiService.getAllStudents();
        
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
          student.rings = student.rings.filter(score => 
            typeof score === 'number' && !isNaN(score) && isFinite(score)
          );
          
          return true;
        });
        
        if (validStudents.length !== data.length) {
          console.warn(`过滤了 ${data.length - validStudents.length} 个无效学员记录`);
        }
        
        students.value = validStudents;
        console.log(`成功加载 ${validStudents.length} 个学员记录`);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('加载学员数据失败:', error);
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
        console.warn('正在加载学员成绩，跳过重复请求');
        return;
      }

      loading.value = true;
      abortController.value = new AbortController();

      try {
        const studentUid = Number(selectedStudent.value);
        if (isNaN(studentUid) || studentUid <= 0) {
          throw new Error('无效的学员ID');
        }

        const scores = await ApiService.getStudentScores(studentUid);
        const student = students.value.find(s => s.uid === studentUid);
        
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
            console.warn(`过滤了 ${scores.length - validScores.length} 个无效成绩`);
          }
        } else {
          console.warn('返回的成绩数据不是数组格式，使用空数组');
        }

        selectedStudentData.value = {
          ...student,
          rings: validScores,
        } as StudentData;
        
        console.log(`加载学员 ${student.name} 的 ${validScores.length} 条成绩记录`);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('加载学员成绩失败:', error);
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
        console.warn('正在处理成绩添加，请勿重复提交');
        return;
      }

      if (!selectedStudent.value) {
        showError('选择错误', '请先选择一个学员');
        return;
      }

      // 验证成绩输入
      const validation = validateScoreInput(quickScore.value, selectedStudentData.value);
      if (!validation.isValid) {
        showError('输入错误', validation.errors.join('；'));
        return;
      }

      const score = Number(quickScore.value);
      const studentUid = Number(selectedStudent.value);

      loading.value = true;
      try {
        const studentName = students.value.find(s => s.uid == studentUid)?.name || '未知学员';
        await ApiService.addScore(studentUid, score);
        
        console.log(`成功为学员 ${studentUid} 添加成绩 ${score}`);
        
        // 保存当前页面状态
        try {
          localStorage.setItem('qmx_active_tab', 'scores');
          localStorage.setItem('qmx_last_operation', `已为${studentName}添加成绩${score}`);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error: any) {
          console.warn('保存页面状态失败:', error);
        }
        
        console.log(`✅ 已为${studentName}添加成绩${score}，即将刷新页面`);
        
        // 直接刷新整个页面
        window.location.reload();
      } catch (error: any) {
        console.error('添加成绩失败:', error);
        showError(
          '添加失败', 
          '添加学员成绩时发生错误，请稍后重试', 
          error.message || '未知错误'
        );
      } finally {
        loading.value = false;
      }
    };

    // 删除成绩
    const deleteScore = async (scoreIndex: number, score: number): Promise<void> => {
      if (loading.value) {
        console.warn('正在处理中，请勿重复操作');
        return;
      }

      if (!selectedStudent.value) {
        showError('操作失败', '请先选择学员');
        return;
      }

      const studentName = students.value.find(s => s.uid === Number(selectedStudent.value))?.name || '未知学员';
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
        
        console.log(`成功删除学员 ${studentUid} 的第 ${scoreIndex} 个成绩`);
        
        // 保存当前页面状态
        try {
          localStorage.setItem('qmx_active_tab', 'scores');
          localStorage.setItem('qmx_last_operation', `已删除${studentName}的第${scoreIndex + 1}次成绩${score}`);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error: any) {
          console.warn('保存页面状态失败:', error);
        }
        
        console.log(`✅ 已删除${studentName}的第${scoreIndex + 1}次成绩${score}，即将刷新页面`);
        
        // 直接刷新整个页面
        window.location.reload();
      } catch (error: any) {
        console.error('删除成绩失败:', error);
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

    // 编辑成绩 - 使用自定义模态框替代原生prompt
    const editScore = (scoreIndex: number, currentScore: number): void => {
      if (loading.value) {
        console.warn('正在处理中，请勿重复操作');
        return;
      }

      if (!selectedStudent.value) {
        showError('操作失败', '请先选择学员');
        return;
      }

      const studentName = students.value.find(s => s.uid === Number(selectedStudent.value))?.name || '未知学员';
      
      // 设置模态框数据
      editingStudentName.value = studentName;
      editingScoreIndex.value = scoreIndex;
      editingScoreValue.value = currentScore;
      editingOriginalScore.value = currentScore;
      showScoreEditModal.value = true;
      
      // 聚焦输入框
      setTimeout(() => {
        if (scoreEditInput.value) {
          scoreEditInput.value.focus();
          scoreEditInput.value.select();
        }
      }, 100);
    };

    // 关闭分数编辑模态框
    const closeScoreEditModal = (): void => {
      showScoreEditModal.value = false;
      editingStudentName.value = '';
      editingScoreIndex.value = -1;
      editingScoreValue.value = 0;
      editingOriginalScore.value = 0;
    };

    // 验证分数是否有效
    const isValidScore = computed(() => {
      const score = Number(editingScoreValue.value);
      return !isNaN(score) && score >= 0 && score <= getMaxScore() && score !== editingOriginalScore.value;
    });

    // 确认分数编辑
    const confirmScoreEdit = async (): Promise<void> => {
      if (!isValidScore.value) {
        return;
      }

      const newScore = Number(editingScoreValue.value);
      const scoreIndex = editingScoreIndex.value;
      const currentScore = editingOriginalScore.value;
      const studentName = editingStudentName.value;
      
      closeScoreEditModal();
      loading.value = true;
      
      try {
        const studentUid = Number(selectedStudent.value);
        await ApiService.updateStudentScore(studentUid, scoreIndex, newScore);
        
        console.log(`成功更新学员 ${studentUid} 的第 ${scoreIndex} 个成绩为 ${newScore}`);
        
        // 保存当前页面状态
        try {
          localStorage.setItem('qmx_active_tab', 'scores');
          localStorage.setItem('qmx_last_operation', `已将${studentName}的第${scoreIndex + 1}次成绩从${currentScore}修改为${newScore}`);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error: any) {
          console.warn('保存页面状态失败:', error);
        }
        
        console.log(`✅ 已将${studentName}的第${scoreIndex + 1}次成绩从${currentScore}修改为${newScore}，即将刷新页面`);
        
        // 直接刷新整个页面
        window.location.reload();
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
        
        console.log(`成功导出 ${selectedStudentData.value.name} 的成绩表 (${selectedStudentData.value.rings.length} 条记录)`);
        
        if (showSuccess) {
          showSuccess('导出成功', `${selectedStudentData.value.name} 的成绩表已导出`);
        }
      } catch (error: any) {
        console.error('导出成绩失败:', error);
        showError('导出失败', '导出成绩表时发生错误', error.message || '未知错误');
      }
    };

    // 生命周期钩子
    // 监听刷新触发器
    if (refreshSystem?.refreshTriggers) {
      watch(
        () => refreshSystem.refreshTriggers.scores,
        (newValue, oldValue) => {
          if (newValue > oldValue) {
            console.log('ScoreManagement 收到刷新信号，重新加载数据');
            loadData();
          }
        }
      );
    }

    onMounted(() => {
      loadData();
    });

    onUnmounted(() => {
      if (abortController.value) {
        abortController.value.abort();
      }
    });

// script setup格式自动导出所有响应式变量和函数
</script>

<style scoped>
.score-management {
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

.stat-card {
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.stat-card h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.stat-value {
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

.score-item.excellent {
  background-color: #e8f5e8;
  border-color: #4caf50;
  color: #2e7d32;
}

.score-item.good {
  background-color: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.score-item.average {
  background-color: #fff3e0;
  border-color: #ff9800;
  color: #f57c00;
}

.score-item.poor {
  background-color: #ffebee;
  border-color: #f44336;
  color: #d32f2f;
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

/* 响应式设计 */
@media (max-width: 768px) {
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

/* 分数编辑模态框样式 */
.score-edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.score-edit-modal {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  animation: modalSlideIn 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-content {
  margin-bottom: 1.5rem;
}

.modal-content p {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  line-height: 1.5;
}

.score-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.score-input-group label {
  font-weight: 500;
  color: var(--text-primary);
}

.score-input-group input {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.score-input-group input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}

.score-range {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-cancel,
.btn-confirm {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.btn-cancel {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background-color: var(--border-color);
  transform: translateY(-1px);
}

.btn-confirm {
  background-color: var(--accent-primary);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background-color: #1976d2;
  transform: translateY(-1px);
}

.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .score-edit-modal {
    padding: 1rem;
    margin: 1rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-confirm {
    width: 100%;
  }
}
</style>

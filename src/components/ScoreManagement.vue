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
            <div class="score-number">{{ score }}</div>
            <div class="score-index">第{{ index + 1 }}次</div>
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
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { ApiService } from '../api/ApiService';

export default {
  name: 'ScoreManagement',
  setup() {
    const loading = ref(false);
    const students = ref([]);
    const selectedStudent = ref('');
    const selectedStudentData = ref(null);
    const quickScore = ref('');
    const studentSelect = ref(null);
    const abortController = ref(null);
    const errorHandler = inject('errorHandler');
    
    const showError = errorHandler?.showError || ((title, message, details) => {
      console.error(`${title}: ${message}`, details);
      alert(`${title}\n${message}`);
    });
    
    const showSuccess = errorHandler?.showSuccess || ((title, message) => {
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
    const getClassText = (classType) => {
      const classMap = {
        TenTry: '体验课',
        Month: '月卡',
        Year: '年卡',
        Others: '其他',
      };
      return classMap[classType] || classType;
    };

    const getScoreClass = (score) => {
      if (score >= 9.0) return 'excellent';
      if (score >= 7.0) return 'good';
      if (score >= 5.0) return 'average';
      return 'poor';
    };

    // 根据学员的运动项目获取最高分数
    const getMaxScore = () => {
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
    const getScorePlaceholder = () => {
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
    const validateScoreInput = (score, studentData) => {
      const errors = [];
      
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
    const loadData = async () => {
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
      } catch (error) {
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

    const onStudentChange = async () => {
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
        const student = students.value.find(s => s.uid == studentUid);
        
        if (!student) {
          throw new Error('找不到对应的学员信息');
        }

        // 验证成绩数据
        let validScores = [];
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
        };
        
        console.log(`加载学员 ${student.name} 的 ${validScores.length} 条成绩记录`);
      } catch (error) {
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
    const addQuickScore = async () => {
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
        await ApiService.addScore(studentUid, score);
        
        console.log(`成功为学员 ${studentUid} 添加成绩 ${score}`);
        quickScore.value = '';
        
        // 重新加载成绩
        await onStudentChange();
        
        // 显示成功消息
        if (showSuccess) {
          showSuccess('添加成功', `成绩 ${score} 已成功添加`);
        }
      } catch (error) {
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

    const exportScores = () => {
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
      } catch (error) {
        console.error('导出成绩失败:', error);
        showError('导出失败', '导出成绩表时发生错误', error.message || '未知错误');
      }
    };

    // 生命周期钩子
    onMounted(() => {
      loadData();
    });

    onUnmounted(() => {
      if (abortController.value) {
        abortController.value.abort();
      }
    });

    return {
      loading,
      students,
      selectedStudent,
      selectedStudentData,
      quickScore,
      studentSelect,
      recentScores,
      averageScore,
      maxScore,
      minScore,
      getClassText,
      getScoreClass,
      getMaxScore,
      getScorePlaceholder,
      loadData,
      onStudentChange,
      addQuickScore,
      exportScores,
    };
  },
};
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
  text-align: center;
  padding: 0.75rem;
  border-radius: 6px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
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
</style>

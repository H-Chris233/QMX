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

    <!-- 搜索和筛选 - 增强版 -->
    <div class="search-filter">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索学员姓名、电话..."
          @input="performSearch"
          ref="searchInput"
        />
        <button 
          class="search-btn" 
          @click="performAdvancedSearch"
          :disabled="loading"
          title="高级搜索"
        >
          🔍
        </button>
      </div>
      <div class="filter-options">
        <select v-model="subjectFilter" @change="performSearch">
          <option value="">全部科目</option>
          <option value="Shooting">射击</option>
          <option value="Archery">射箭</option>
          <option value="Others">其他</option>
        </select>
        <select v-model="classFilter" @change="performSearch">
          <option value="">全部课程</option>
          <option value="TenTry">体验课</option>
          <option value="Month">月卡</option>
          <option value="Year">年卡</option>
          <option value="Others">其他</option>
        </select>
        <select v-model="membershipFilter" @change="performSearch">
          <option value="">全部会员状态</option>
          <option value="active">活跃会员</option>
          <option value="expired">已过期</option>
          <option value="expiring_soon">即将过期</option>
        </select>
      </div>
      <div class="advanced-search-container">
        <div class="advanced-search-toggle">
          <button 
            class="toggle-btn" 
            @click="showAdvancedSearch = !showAdvancedSearch"
            :class="{ 'active': showAdvancedSearch }"
          >
            {{ showAdvancedSearch ? '隐藏高级搜索' : '显示高级搜索' }}
          </button>
        </div>
        
        <!-- 高级搜索面板 -->
        <div v-if="showAdvancedSearch" class="advanced-search-panel">
      <div class="advanced-search-row">
        <div class="search-field">
          <label>年龄范围</label>
          <div class="age-range">
            <input 
              v-model.number="advancedSearch.minAge" 
              type="number" 
              placeholder="最小" 
              min="0" 
              max="120"
            />
            <span>-</span>
            <input 
              v-model.number="advancedSearch.maxAge" 
              type="number" 
              placeholder="最大" 
              min="0" 
              max="120"
            />
          </div>
        </div>
        <div class="search-field">
          <label>分数范围</label>
          <div class="score-range">
            <input 
              v-model.number="advancedSearch.minScore" 
              type="number" 
              placeholder="最低分" 
              min="0"
            />
            <span>-</span>
            <input 
              v-model.number="advancedSearch.maxScore" 
              type="number" 
              placeholder="最高分" 
              min="0"
            />
          </div>
        </div>
      </div>
      <div class="advanced-search-actions">
        <button class="apply-btn" @click="performAdvancedSearch" :disabled="loading">
          应用筛选
        </button>
        <button class="clear-btn" @click="clearAdvancedSearch">
          清除筛选
        </button>
      </div>
        </div>
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
            <th>会员状态</th>
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
            <td data-label="会员状态">
              <div class="membership-info">
                <span :class="['membership-badge', getMembershipStatusClass(student)]">
                  {{ getMembershipStatusText(student) }}
                </span>
                <div v-if="student.is_membership_active && student.membership_days_remaining !== null" class="membership-days">
                  剩余{{ student.membership_days_remaining }}天
                </div>
              </div>
            </td>
            <td data-label="最高分数">{{ getHighestScore(student) }}</td>
            <td data-label="备注">{{ student.note || '-' }}</td>
            <td class="actions">
              <button class="edit-btn" @click="editStudent(student)" :disabled="loading">✏️</button>
              <button class="membership-btn" @click="manageMembership(student)" :disabled="loading">👑</button>
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
        <StudentForm v-model="currentStudent" />
      </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeModals" :disabled="loading">取消</button>
          <button class="save-btn" @click="saveStudent" :disabled="loading">
            {{ loading ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 会员管理模态框 -->
    <div
      v-if="showMembershipModal"
      class="modal-overlay"
      @click="closeMembershipModal"
    >
      <div class="modal membership-modal" @click.stop>
        <div class="modal-header">
          <h3>会员管理 - {{ membershipStudent?.name }}</h3>
          <button class="close-btn" @click="closeMembershipModal">✖️</button>
        </div>
        <div class="modal-body">
          <!-- 当前会员状态 -->
          <div class="membership-status">
            <h4>当前会员状态</h4>
            <div class="status-info">
              <span :class="['membership-badge', getMembershipStatusClass(membershipStudent)]">
                {{ getMembershipStatusText(membershipStudent) }}
              </span>
              <div v-if="membershipStudent?.is_membership_active && membershipStudent?.membership_days_remaining !== null" class="days-remaining">
                剩余 {{ membershipStudent.membership_days_remaining }} 天
              </div>
            </div>
            <div v-if="membershipStudent?.membership_start_date || membershipStudent?.membership_end_date" class="membership-dates">
              <div v-if="membershipStudent.membership_start_date">
                开始时间: {{ formatDate(membershipStudent.membership_start_date) }}
              </div>
              <div v-if="membershipStudent.membership_end_date">
                结束时间: {{ formatDate(membershipStudent.membership_end_date) }}
              </div>
            </div>
          </div>

          <!-- 快捷设置 -->
          <div class="quick-actions">
            <h4>快捷设置</h4>
            <div class="quick-buttons">
              <button class="membership-action-btn month-btn" @click="setMembershipByType('month')" :disabled="loading">
                设置月卡 (30天)
              </button>
              <button class="membership-action-btn year-btn" @click="setMembershipByType('year')" :disabled="loading">
                设置年卡 (365天)
              </button>
              <button class="membership-action-btn clear-btn" @click="clearMembership" :disabled="loading">
                清除会员
              </button>
            </div>
          </div>

          <!-- 自定义设置 -->
          <div class="custom-membership">
            <h4>自定义设置</h4>
            <div class="form-group">
              <DatePicker
                v-model="membershipForm.startDate"
                label="开始时间"
                :min-date="getTodayDate()"
                required
              />
            </div>
            <div class="form-group">
              <DatePicker
                v-model="membershipForm.endDate"
                label="结束时间"
                :min-date="membershipForm.startDate || getTodayDate()"
                required
              />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeMembershipModal" :disabled="loading">取消</button>
          <button class="save-btn" @click="saveCustomMembership" :disabled="loading">
            {{ loading ? '设置中...' : '设置自定义会员' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, watch, type Ref, type ComputedRef } from 'vue';
import { ApiService } from '../api/ApiService';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { handleValidationError } from '../utils/errorHandler';
import DatePicker from './DatePicker.vue';
import StudentForm from './StudentForm.vue';
import type { Student } from '../types/api';

// 定义类型接口
import type { Student as ApiStudent } from '../types/api';

interface Student extends ApiStudent {
  // 继承所有属性，可添加组件特有的属性
}

interface CurrentStudent {
  uid: number | null;
  name: string;
  age: number | null; // 改为可空数字类型
  phone: string;
  classType: string;
  note: string;
  subject: string;
  customMembershipStart: string;
  enableCustomMembership: boolean;
}

interface AdvancedSearch {
  minAge: number | null;
  maxAge: number | null;
  minScore: number | null;
  maxScore: number | null;
}

interface MembershipForm {
  startDate: string;
  endDate: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  confirmType?: string;
  onConfirm?: (() => void) | null;
  onCancel?: (() => void) | null;
}

interface ErrorHandler {
  showError: (title: string, message: string, details?: string) => void;
  showSuccess: (title: string, message: string) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

interface RefreshSystem {
  refreshTriggers: {
    students: number;
  };
}
const loading: Ref<boolean> = ref(false);
const students: Ref<Student[]> = ref([]);
const searchQuery: Ref<string> = ref('');
const classFilter: Ref<string> = ref('');
const subjectFilter: Ref<string> = ref('');
const membershipFilter: Ref<string> = ref('');
const showAdvancedSearch: Ref<boolean> = ref(false);
const advancedSearch: Ref<AdvancedSearch> = ref({
  minAge: null,
  maxAge: null,
  minScore: null,
  maxScore: null,
});
const showAddModal: Ref<boolean> = ref(false);
const showEditModal: Ref<boolean> = ref(false);
const showMembershipModal: Ref<boolean> = ref(false);
const currentStudent: Ref<CurrentStudent> = ref({
  uid: null,
  name: '',
  age: null, // 改为null
  phone: '',
  classType: '',
  note: '',
  subject: 'Shooting',
  customMembershipStart: '', // 自定义会员开始时间
  enableCustomMembership: false, // 是否启用自定义会员时间
});
const membershipStudent: Ref<Student | null> = ref(null);
const membershipForm: Ref<MembershipForm> = ref({
  startDate: '',
  endDate: '',
});
const searchInput: Ref<HTMLInputElement | null> = ref(null);
const errorHandler = inject<ErrorHandler>('errorHandler');
const refreshSystem = inject<RefreshSystem>('refreshSystem');

// 统一错误处理 - 提供完整的降级方案
const showError = errorHandler?.showError || ((title: string, message: string, details?: string) => {
  console.error(`${title}: ${message}`, details);
  // 降级方案：使用原生alert
  alert(`${title}: ${message}${details ? '\n\n详情: ' + details : ''}`);
});

const showConfirm = errorHandler?.showConfirm || ((options: ConfirmOptions) => {
  const confirmed = confirm(`${options.title || '确认操作'}: ${options.message || '请确认是否继续该操作'}${options.details ? '\n\n' + options.details : ''}`);
  if (confirmed && options.onConfirm) {
    options.onConfirm();
  } else if (!confirmed && options.onCancel) {
    options.onCancel();
  }
  return confirmed;
});

const showSuccess = errorHandler?.showSuccess || ((title: string, message: string) => {
  console.log(`✅ ${title}: ${message}`);
  // 降级方案：使用alert显示成功消息
  alert(`${title}: ${message}`);
});
    
    // 调试：检查错误处理函数是否正确注入
    if (!errorHandler) {
      console.warn('⚠️ errorHandler 未正确注入到 StudentManagement 组件');
    } else {
      console.log('✅ errorHandler 已成功注入到 StudentManagement 组件');
    }

const filteredStudents: ComputedRef<Student[]> = computed(() => {
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

        // 新增：会员状态筛选
        if (membershipFilter.value) {
          filtered = filtered.filter((student) => {
            if (!student) return false;
            
            switch (membershipFilter.value) {
              case 'active':
                return student.is_membership_active === true;
              case 'expired':
                return student.is_membership_active === false && student.membership_end_date;
              case 'expiring_soon':
                return student.is_membership_active === true && 
                       student.membership_days_remaining !== null && 
                       student.membership_days_remaining !== undefined &&
                       student.membership_days_remaining <= 7;
              default:
                return true;
            }
          });
        }

        return filtered;
      } catch (error) {
        console.error('过滤学员数据失败:', error);
        // 对于计算属性的错误，返回原始数据而不是显示弹窗
        return students.value || [];
      }
    });

const totalStudents: ComputedRef<number> = computed(() => {
      try {
        return (students.value || []).length;
      } catch (error) {
        console.error('计算总学员数失败:', error);
        return 0;
      }
    });

const trialStudents: ComputedRef<number> = computed(() => {
      try {
        return (students.value || []).filter((s) => s && s.class === 'TenTry').length;
      } catch (error) {
        console.error('计算体验课学员数失败:', error);
        return 0;
      }
    });

const monthlyStudents: ComputedRef<number> = computed(() => {
      try {
        return (students.value || []).filter((s) => s && s.class === 'Month').length;
      } catch (error) {
        console.error('计算月卡学员数失败:', error);
        return 0;
      }
    });

const yearlyStudents: ComputedRef<number> = computed(() => {
      try {
        return (students.value || []).filter((s) => s && s.class === 'Year').length;
      } catch (error) {
        console.error('计算年卡学员数失败:', error);
        return 0;
      }
    });

const getClassText = (classType: string): string => {
      const classMap: Record<string, string> = {
        TenTry: '体验课',
        Month: '月卡',
        Year: '年卡',
        Others: '其他',
      };
      return classMap[classType] || classType;
    };

const getClassType = (classType: string): string => {
      return classType.toLowerCase();
    };

const getSubjectText = (subject: string): string => {
      const subjectMap: Record<string, string> = {
        Shooting: '射击',
        Archery: '射箭',
        Others: '其他',
      };
      return subjectMap[subject] || subject;
    };

const getSubjectType = (subject: string): string => {
      return subject.toLowerCase();
    };

// 执行搜索（基础搜索）
const performSearch = (): void => {
      try {
        // 基础搜索逻辑已通过computed属性实现
        console.log('执行基础搜索:', { searchQuery: searchQuery.value, classFilter: classFilter.value, subjectFilter: subjectFilter.value });
      } catch (error) {
        console.error('搜索失败:', error);
        showError('搜索失败', '执行搜索时发生错误', (error as Error).message || '未知错误');
      }
    };

// 执行高级搜索
const performAdvancedSearch = async (): Promise<void> => {
      if (loading.value) {
        console.warn('正在加载中，跳过搜索请求');
        return;
      }

      loading.value = true;
      try {
        // 构建搜索选项 - 改进参数构建
        const searchOptions = {
          name_contains: searchQuery.value?.trim() || null,
          subject: subjectFilter.value || null,
          class_type: classFilter.value || null,
          min_age: advancedSearch.value.minAge && advancedSearch.value.minAge > 0 ? advancedSearch.value.minAge : null,
          max_age: advancedSearch.value.maxAge && advancedSearch.value.maxAge > 0 ? advancedSearch.value.maxAge : null,
          min_score: advancedSearch.value.minScore && advancedSearch.value.minScore > 0 ? advancedSearch.value.minScore : null,
          max_score: advancedSearch.value.maxScore && advancedSearch.value.maxScore > 0 ? advancedSearch.value.maxScore : null,
        };

        console.log('执行高级搜索:', searchOptions);
        
        // 使用新的v2 API搜索方法
        const searchResults = await ApiService.searchStudents(searchOptions);
        
        if (!Array.isArray(searchResults)) {
          throw new Error('搜索结果格式不正确，期望数组格式');
        }

        students.value = searchResults as Student[];
        console.log(`高级搜索完成，找到 ${searchResults.length} 个学员`);
        
      } catch (error) {
        console.error('高级搜索失败:', error);
        showError('搜索失败', '高级搜索时发生错误', (error as Error).message || '未知错误');
      } finally {
        loading.value = false;
      }
    };

// 清除高级搜索条件
const clearAdvancedSearch = (): void => {
      advancedSearch.value = {
        minAge: null,
        maxAge: null,
        minScore: null,
        maxScore: null,
      };
      searchQuery.value = '';
      classFilter.value = '';
      subjectFilter.value = '';
      membershipFilter.value = '';
      
      // 重新加载所有学员数据
      loadStudents();
    };


const loadStudents = async (): Promise<void> => {
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
        
        students.value = validStudents as Student[];
        console.log(`成功加载 ${validStudents.length} 个学员记录`);
      } catch (error) {
        console.error('加载学员数据失败:', error);
        students.value = []; // 确保有默认值
        showError(
          '加载失败', 
          '加载学员数据时发生错误，请检查网络连接或稍后重试', 
          (error as Error).message || '未知错误'
        );
      } finally {
        loading.value = false;
      }
    };

const editStudent = (student: Student): void => {
      try {
        if (!student || !student.uid) {
          showError('编辑失败', '学员数据无效，无法编辑');
          return;
        }

        currentStudent.value = {
          uid: student.uid,
          name: student.name || '',
          age: student.age || null, // 改为null
          phone: student.phone || '',
          classType: student.class || 'Others',
          note: student.note || '',
          subject: student.subject || 'Shooting',
          customMembershipStart: '',
          enableCustomMembership: false,
        };
        showEditModal.value = true;
      } catch (error) {
        console.error('编辑学员失败:', error);
        showError('编辑失败', '准备编辑学员信息时发生错误', (error as Error).message || '未知错误');
      }
    };

const deleteStudent = async (uid: number): Promise<void> => {
      if (loading.value) {
        console.warn('正在处理其他操作，请稍后再试');
        showError('操作失败', '正在处理其他操作，请稍后再试');
        return;
      }

      if (typeof uid !== 'number' || !Number.isInteger(uid) || uid <= 0) {
        showError('删除失败', '无效的学员ID');
        return;
      }

      // 查找要删除的学员信息
      const student = students.value.find(s => s.uid === uid);
      const confirmMessage = student 
        ? `确定要删除学员"${student.name}"吗？此操作不可撤销！`
        : '确定要删除这个学员吗？此操作不可撤销！';

      showConfirm({
        title: '删除学员',
        message: confirmMessage,
        confirmText: '删除',
        cancelText: '取消',
        confirmType: 'danger',
        onConfirm: async () => {
          loading.value = true;
      
      try {
        await ApiService.deleteStudent(Number(uid));
        
        console.log(`成功删除学员 ID: ${uid}`);
        
        // 保存当前页面状态
        const studentName = student ? student.name : '学员';
        try {
          localStorage.setItem('qmx_active_tab', 'students');
          localStorage.setItem('qmx_last_operation', `学员"${studentName}"删除成功`);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error) {
          console.warn('保存页面状态失败:', error);
        }
        
        console.log(`✅ 学员"${studentName}"删除成功，触发局部刷新`);
        
        if (refreshSystem && 'refreshTriggers' in refreshSystem) {
          try {
            refreshSystem.refreshTriggers.students++;
          } catch (e) {
            console.warn('触发局部刷新失败，回退为重新加载数据:', e);
            loadStudents();
          }
        } else {
          loadStudents();
        }
      } catch (error) {
        console.error('删除学员失败:', error);
        showError(
          '删除失败', 
          '删除学员时发生错误，请稍后重试', 
          (error as Error).message || '未知错误'
        );
          } finally {
            loading.value = false;
          }
        }
      });
    };

// 简化的输入验证函数 - 只做最基本的类型检查
const validateStudentInput = (student: CurrentStudent): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      // 基础对象验证
      if (!student || typeof student !== 'object') {
        errors.push('学员数据格式无效');
        return { isValid: false, errors };
      }
      
      // 姓名验证 - 只做基本检查
      if (!student.name || typeof student.name !== 'string') {
        errors.push('姓名不能为空');
      }
        const trimmedName = student.name.trim();
        if (trimmedName.length > 50) {
          errors.push('姓名长度不能超过50个字符');
        }
        // 检查特殊字符和潜在的注入攻击
        if (/<script|javascript:|data:|vbscript:|on\w+=/i.test(trimmedName)) {
          errors.push('姓名包含非法字符');
        }
        // 检查SQL注入模式
        if (/('|(\\x27)|(\\x2D\\x2D)|(\;)|(\|)|(\*)|(\%))/.test(trimmedName)) {
          errors.push('姓名包含不安全字符');
        }
        // 年龄验证 - 只做基本类型检查
      if (student.age !== null && student.age !== undefined) {
        const age = typeof student.age === 'number' ? student.age : Number(student.age);
        if (isNaN(age) || age < 3 || age > 120) {
          errors.push('年龄必须是3-120之间的数字');
        }
      }
      
      // 电话验证 - 只做基本检查
      if (!student.phone || typeof student.phone !== 'string') {
        errors.push('电话号码不能为空');
      }
      
      // 备注验证 - 只做基本检查
      if (student.note && typeof student.note !== 'string') {
        errors.push('备注格式无效');
      }
      
      // 科目验证 - 只做基本检查
      if (typeof student.subject !== 'string') {
        errors.push('科目选择无效');
      }
      
      // 课程类型验证 - 只做基本检查
      if (typeof student.classType !== 'string') {
        errors.push('课程类型选择无效');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    };

const validatePhone = (phone: string): boolean => {
      try {
        if (!phone || typeof phone !== 'string') return false;
        
        // 安全的字符串清理，防止异常输入
        const cleanPhone = String(phone).replace(/[-\s]/g, '').trim();
        
        // 长度检查，防止过长输入
        if (cleanPhone.length > 20) return false;
        
        // 短号优先检测 (3-6位数字)
        if (/^\d{3,6}$/.test(cleanPhone)) return true;

        // 中国手机号码检测 (11位，1开头)
        if (/^1[3-9]\d{9}$/.test(cleanPhone)) return true;

        // 国际号码校验 - 增强异常处理
        try {
          const phoneObj = parsePhoneNumberFromString(phone, 'CN');
          return phoneObj?.isValid() === true;
        } catch (parseError) {
          console.warn('国际号码解析失败:', parseError);
          return false;
        }
      } catch (error) {
        console.warn('电话验证失败:', error);
        return false;
      }
    };

const saveStudent = async (): Promise<void> => {
      // 防止重复提交
      if (loading.value) {
        console.warn('正在保存中，请勿重复提交');
        return;
      }

      // 输入验证
      const validation = validateStudentInput(currentStudent.value);
      if (!validation.isValid) {
        handleValidationError('student_form', validation.errors.join('；'));
        return;
      }

      if (!validatePhone(currentStudent.value.phone)) {
        handleValidationError('phone', '请输入有效的手机号码');
        return;
      }

      loading.value = true;
      
      try {
        

        const sanitizedStudent = {
          ...currentStudent.value,
          name: currentStudent.value.name.trim().substring(0, 50),
          age: currentStudent.value.age !== null ? Math.max(3, Math.min(120, Number(currentStudent.value.age) || 0)) : null,
          classType: ['TenTry', 'Month', 'Year', 'Others'].includes(currentStudent.value.classType) 
            ? currentStudent.value.classType : 'Others',
          phone: currentStudent.value.phone.trim().replace(/[^\d\-\+\s\(\)]/g, '').substring(0, 20),
          note: (currentStudent.value.note || '').trim().substring(0, 500),
          subject: ['Shooting', 'Archery', 'Others'].includes(currentStudent.value.subject) 
            ? currentStudent.value.subject : 'Shooting',
        };

        if (showAddModal.value) {
          // 添加新学员
          const result = await ApiService.addStudent(
            sanitizedStudent.name,
            sanitizedStudent.age !== null ? sanitizedStudent.age : undefined,
            sanitizedStudent.classType,
            sanitizedStudent.phone,
            sanitizedStudent.note,
            sanitizedStudent.subject,
          );
          
          if (!result || !result.uid) {
            throw new Error('学员添加失败，返回数据无效');
          }
          
          console.log('学员添加成功:', result);

          // 根据课程类型设置会员（支持自定义开始时间）
          if (sanitizedStudent.classType === 'Month' || sanitizedStudent.classType === 'Year') {
            if (currentStudent.value.enableCustomMembership && currentStudent.value.customMembershipStart) {
              // 使用自定义开始时间
              console.log(`为新学员设置${sanitizedStudent.classType === 'Month' ? '月卡' : '年卡'}会员，自定义开始时间: ${currentStudent.value.customMembershipStart}`);
              
              const startDate = new Date(currentStudent.value.customMembershipStart);
              const endDate = new Date(startDate);
              
              if (sanitizedStudent.classType === 'Month') {
                // 正确处理月份计算，避免跨月问题
                endDate.setMonth(endDate.getMonth() + 1);
                // 如果日期超过目标月份的天数，调整到最后一天
                if (endDate.getDate() !== startDate.getDate()) {
                  endDate.setDate(0); // 设置为上个月的最后一天
                }
              } else {
                // 正确处理年份计算，考虑闰年
                endDate.setFullYear(endDate.getFullYear() + 1);
                // 如果日期超过目标年份的2月29日（闰年），调整到2月28日
                if (endDate.getMonth() === 1 && endDate.getDate() > 28) {
                  endDate.setDate(28);
                }
              }
              
              await ApiService.setStudentMembership(
                result.uid, 
                startDate.toISOString(), 
                endDate.toISOString()
              );
              
              showSuccess('添加成功', `学员"${sanitizedStudent.name}"已添加，会员从${formatDateForDisplay(currentStudent.value.customMembershipStart)}开始`);
            } else {
              // 使用默认的当前时间
              console.log(`为新学员设置${sanitizedStudent.classType === 'Month' ? '月卡' : '年卡'}会员`);
              const membershipType = sanitizedStudent.classType === 'Month' ? 'month' : 'year';
              await ApiService.setMembershipByType(result.uid, membershipType, true);
              
              showSuccess('添加成功', `学员"${sanitizedStudent.name}"已添加并自动设置${sanitizedStudent.classType === 'Month' ? '30天' : '365天'}会员`);
            }
          } else {
            showSuccess('添加成功', `学员"${sanitizedStudent.name}"已添加`);
          }
        } else {
          // 编辑现有学员
          if (!sanitizedStudent.uid) {
            throw new Error('学员ID无效，无法更新');
          }
          
          // 获取原始学员信息以比较课程类型是否变更
          const originalStudent = students.value.find(s => s.uid === sanitizedStudent.uid);
          const classTypeChanged = originalStudent && originalStudent.class !== sanitizedStudent.classType;
          
          await ApiService.updateStudentInfo(sanitizedStudent.uid, {
            name: sanitizedStudent.name,
            age: sanitizedStudent.age !== null ? Number(sanitizedStudent.age) : null,
            classType: sanitizedStudent.classType,
            phone: sanitizedStudent.phone,
            note: sanitizedStudent.note,
            subject: sanitizedStudent.subject,
          });
          
          console.log('学员更新成功');

          // 如果课程类型变更为月卡或年卡，设置会员（支持自定义开始时间）
          if (classTypeChanged) {
            if (sanitizedStudent.classType === 'Month' || sanitizedStudent.classType === 'Year') {
              if (currentStudent.value.enableCustomMembership && currentStudent.value.customMembershipStart) {
                // 使用自定义开始时间
                console.log(`课程变更为${sanitizedStudent.classType === 'Month' ? '月卡' : '年卡'}，设置自定义会员时间: ${currentStudent.value.customMembershipStart}`);
                
                const startDate = new Date(currentStudent.value.customMembershipStart);
                const endDate = new Date(startDate);
                
                if (sanitizedStudent.classType === 'Month') {
                  // 正确处理月份计算，避免跨月问题
                  endDate.setMonth(endDate.getMonth() + 1);
                  // 如果日期超过目标月份的天数，调整到最后一天
                  if (endDate.getDate() !== startDate.getDate()) {
                    endDate.setDate(0); // 设置为上个月的最后一天
                  }
                } else {
                  // 正确处理年份计算，考虑闰年
                  endDate.setFullYear(endDate.getFullYear() + 1);
                  // 如果日期超过目标年份的2月29日（闰年），调整到2月28日
                  if (endDate.getMonth() === 1 && endDate.getDate() > 28) {
                    endDate.setDate(28);
                  }
                }
                
                await ApiService.setStudentMembership(
                  sanitizedStudent.uid, 
                  startDate.toISOString(), 
                  endDate.toISOString()
                );
                
                showSuccess('更新成功', `学员"${sanitizedStudent.name}"信息已更新，会员从${formatDateForDisplay(currentStudent.value.customMembershipStart)}开始`);
              } else {
                // 使用默认的当前时间
                console.log(`课程变更为${sanitizedStudent.classType === 'Month' ? '月卡' : '年卡'}，设置会员`);
                const membershipType = sanitizedStudent.classType === 'Month' ? 'month' : 'year';
                await ApiService.setMembershipByType(sanitizedStudent.uid, membershipType, true);
                
                showSuccess('更新成功', `学员"${sanitizedStudent.name}"信息已更新并自动设置${sanitizedStudent.classType === 'Month' ? '30天' : '365天'}会员`);
              }
            } else if (originalStudent?.class === 'Month' || originalStudent?.class === 'Year') {
              // 如果从月卡/年卡变更为其他类型，清除会员
              console.log('课程从会员类型变更为非会员类型，清除会员');
              await ApiService.clearStudentMembership(sanitizedStudent.uid);
              showSuccess('更新成功', `学员"${sanitizedStudent.name}"信息已更新，会员已清除`);
            } else {
              showSuccess('更新成功', `学员"${sanitizedStudent.name}"信息已更新`);
            }
          } else {
            showSuccess('更新成功', `学员"${sanitizedStudent.name}"信息已更新`);
          }
        }

        closeModals();
        
        // 保存当前页面状态
        const operationType = showAddModal.value ? '学员添加成功' : '学员更新成功';
        try {
          localStorage.setItem('qmx_active_tab', 'students');
          localStorage.setItem('qmx_last_operation', operationType);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error) {
          console.warn('保存页面状态失败:', error);
        }
        
        console.log(`✅ ${operationType}，触发局部刷新`);
        
        if (refreshSystem && 'refreshTriggers' in refreshSystem) {
          try {
            refreshSystem.refreshTriggers.students++;
          } catch (e) {
            console.warn('触发局部刷新失败，回退为重新加载数据:', e);
            loadStudents();
          }
        } else {
          loadStudents();
        }
      } catch (error) {
        console.error('保存学员失败:', error);
        const errorMessage = (error as Error).message || '未知错误';
        showError(
          '保存失败', 
          `保存学员信息时发生错误: ${errorMessage}`,
          (error as Error).stack
        );
      } finally {
        loading.value = false;
      }
    };

const getHighestScore = (student: Student): string => {
      try {
        // 增强的空值和类型检查
        if (!student || typeof student !== 'object') {
          return '-';
        }
        
        if (!student.rings || !Array.isArray(student.rings) || student.rings.length === 0) {
          return '-';
        }
        
        // 防止数组过大导致性能问题
        let rings = Array.isArray(student.rings) ? student.rings : [];
        if (rings.length > 10000) {
          console.warn('成绩数组过大，截取前10000条记录');
          rings = rings.slice(0, 10000);
        }
        
        // 过滤出有效的数字成绩，增强验证
        const validScores = rings.filter(score => {
          return typeof score === 'number' && 
                 !isNaN(score) && 
                 isFinite(score) && 
                 score >= 0 && 
                 score <= 1000; // 合理的分数范围
        });
        
        if (validScores.length === 0) {
          return '-';
        }
        
        // 安全的Math.max调用，防止栈溢出
        let maxScore;
        if (validScores.length > 1000) {
          // 对于大数组，使用reduce避免栈溢出
          maxScore = validScores.reduce((max, current) => Math.max(max, current), -Infinity);
        } else {
          maxScore = Math.max(...validScores);
        }
        
        return maxScore.toFixed(1);
      } catch (error) {
        console.warn('获取最高分数失败:', student?.uid || 'unknown', error);
        return '-';
      }
    };

const closeModals = (): void => {
      try {
        showAddModal.value = false;
        showEditModal.value = false;
        currentStudent.value = {
          uid: null,
          name: '',
          age: null, // 改为null
          phone: '',
          classType: '',
          note: '',
          subject: 'Shooting',
          customMembershipStart: '',
          enableCustomMembership: false,
        };
      } catch (error) {
        console.error('关闭模态框失败:', error);
        // 对于UI操作的错误，通常不需要弹窗，但可以记录
        // showError('操作失败', '关闭窗口时发生错误', error.message);
      }
    };

// 会员管理相关方法
const getMembershipStatusClass = (student: Student | null): string => {
      if (!student) return 'no-membership';
      if (student.is_membership_active) {
        return (student.membership_days_remaining ?? 0) > 7 ? 'active' : 'expiring';
      }
      return 'expired';
    };

const getMembershipStatusText = (student: Student | null): string => {
      if (!student) return '无会员';
      if (student.is_membership_active) {
        return '有效会员';
      }
      if (student.membership_end_date) {
        return '已过期';
      }
      return '无会员';
    };

const formatDate = (dateString: string): string => {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleDateString('zh-CN');
      } catch (error) {
        console.warn('日期格式化失败:', error);
        return dateString;
      }
    };

const getTodayDate = (): string => {
      return new Date().toISOString().split('T')[0] as string;
    };

const manageMembership = (student: Student): void => {
      try {
        if (!student || !student.uid) {
          showError('操作失败', '学员数据无效');
          return;
        }
        membershipStudent.value = student;
        membershipForm.value = {
          startDate: getTodayDate(),
          endDate: '',
        };
        showMembershipModal.value = true;
      } catch (error) {
        console.error('打开会员管理失败:', error);
        showError('操作失败', '打开会员管理时发生错误', (error as Error).message);
      }
    };

const closeMembershipModal = (): void => {
      try {
        showMembershipModal.value = false;
        membershipStudent.value = null;
        membershipForm.value = {
          startDate: '',
          endDate: '',
        };
      } catch (error) {
        console.error('关闭会员管理模态框失败:', error);
      }
    };

const setMembershipByType = async (type: string): Promise<void> => {
      const allowed = ['month','year'];
      if (!allowed.includes(type)) {
        showError('设置失败', '无效的会员类型');
        return;
      }
      if (loading.value) {
        console.warn('正在处理中，请勿重复操作');
        return;
      }

      if (!membershipStudent.value?.uid) {
        showError('操作失败', '学员数据无效');
        return;
      }

      loading.value = true;
      try {
        const studentName = membershipStudent.value.name; // 保存学员姓名
        await ApiService.setMembershipByType(membershipStudent.value.uid, type as 'month' | 'year', true);
        
        closeMembershipModal();
        
        // 保存当前页面状态
        const membershipType = type === 'month' ? '月卡' : '年卡';
        try {
          localStorage.setItem('qmx_active_tab', 'students');
          localStorage.setItem('qmx_last_operation', `已为${studentName}设置${membershipType}会员`);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error) {
          console.warn('保存页面状态失败:', error);
        }
        
        console.log(`✅ 已为${studentName}设置${membershipType}会员，触发局部刷新`);
        
        if (refreshSystem && 'refreshTriggers' in refreshSystem) {
          try {
            refreshSystem.refreshTriggers.students++;
          } catch (e) {
            console.warn('触发局部刷新失败，回退为重新加载数据:', e);
            loadStudents();
          }
        } else {
          loadStudents();
        }
      } catch (error) {
        console.error('设置会员失败:', error);
        showError('设置失败', '设置会员时发生错误', (error as Error).message);
      } finally {
        loading.value = false;
      }
    };

const clearMembership = async (): Promise<void> => {
      if (loading.value) {
        console.warn('正在处理中，请勿重复操作');
        return;
      }

      if (!membershipStudent.value?.uid) {
        showError('操作失败', '学员数据无效');
        return;
      }

      const studentName = membershipStudent.value.name; // 保存学员姓名
      showConfirm({
        title: '清除会员信息',
        message: `确定要清除${studentName}的会员信息吗？`,
        confirmText: '清除',
        cancelText: '取消',
        confirmType: 'warning',
        onConfirm: async () => {
          loading.value = true;
      try {
        await ApiService.clearStudentMembership(membershipStudent.value!.uid);
        
        closeMembershipModal();
        
        // 保存当前页面状态
        try {
          localStorage.setItem('qmx_active_tab', 'students');
          localStorage.setItem('qmx_last_operation', `已清除${studentName}的会员信息`);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error) {
          console.warn('保存页面状态失败:', error);
        }
        
        console.log(`✅ 已清除${studentName}的会员信息，触发局部刷新`);
        
        if (refreshSystem && 'refreshTriggers' in refreshSystem) {
          try {
            refreshSystem.refreshTriggers.students++;
          } catch (e) {
            console.warn('触发局部刷新失败，回退为重新加载数据:', e);
            loadStudents();
          }
        } else {
          loadStudents();
        }
      } catch (error) {
        console.error('清除会员失败:', error);
        showError('清除失败', '清除会员时发生错误', (error as Error).message);
          } finally {
            loading.value = false;
          }
        }
      });
    };

const saveCustomMembership = async (): Promise<void> => {
      if (loading.value) {
        console.warn('正在处理中，请勿重复操作');
        return;
      }

      if (!membershipStudent.value?.uid) {
        showError('操作失败', '学员数据无效');
        return;
      }

      if (!membershipForm.value.startDate || !membershipForm.value.endDate) {
        showError('输入错误', '请选择开始时间和结束时间');
        return;
      }

      if (new Date(membershipForm.value.endDate) <= new Date(membershipForm.value.startDate)) {
        showError('输入错误', '结束时间必须晚于开始时间');
        return;
      }

      loading.value = true;
      try {
        const studentName = membershipStudent.value.name; // 保存学员姓名
        const startDate = new Date(membershipForm.value.startDate).toISOString();
        const endDate = new Date(membershipForm.value.endDate).toISOString();
        
        await ApiService.setStudentMembership(membershipStudent.value.uid, startDate, endDate);
        
        closeMembershipModal();
        
        // 保存当前页面状态
        try {
          localStorage.setItem('qmx_active_tab', 'students');
          localStorage.setItem('qmx_last_operation', `已为${studentName}设置自定义会员时间`);
          localStorage.setItem('qmx_last_operation_time', Date.now().toString());
        } catch (error) {
          console.warn('保存页面状态失败:', error);
        }
        
        console.log(`✅ 已为${studentName}设置自定义会员时间，触发局部刷新`);
        
        if (refreshSystem && 'refreshTriggers' in refreshSystem) {
          try {
            refreshSystem.refreshTriggers.students++;
          } catch (e) {
            console.warn('触发局部刷新失败，回退为重新加载数据:', e);
            loadStudents();
          }
        } else {
          loadStudents();
        }
      } catch (error) {
        console.error('设置自定义会员失败:', error);
        showError('设置失败', '设置自定义会员时发生错误', (error as Error).message);
      } finally {
        loading.value = false;
      }
    };

    // 监听刷新触发器
    if (refreshSystem?.refreshTriggers) {
      watch(
        () => refreshSystem.refreshTriggers.students,
        (newValue, oldValue) => {
          if (newValue > oldValue) {
            console.log('StudentManagement 收到刷新信号，重新加载数据');
            loadStudents();
          }
        }
      );
    }

    onMounted(() => {
      try {
        loadStudents();
      } catch (error) {
        console.error('组件初始化失败:', error);
        showError('初始化失败', '组件初始化时发生错误', (error as Error).message || '未知错误');
      }
    });




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

.search-btn {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-left: 0.5rem;
  transition: all 0.3s ease;
}

.search-btn:hover:not(:disabled) {
  background-color: #1976d2;
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.advanced-search-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}

.advanced-search-toggle {
  margin-left: auto;
}

.toggle-btn {
  background-color: transparent;
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.3s ease;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-btn::after {
  content: '▼';
  font-size: 0.8rem;
  transition: transform 0.3s ease;
}

.toggle-btn.active::after {
  transform: rotate(180deg);
}

.toggle-btn:hover {
  background-color: var(--accent-primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
}

.toggle-btn.active {
  background-color: var(--accent-primary);
  color: white;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.advanced-search-panel {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 0 0 8px 8px;
  border: 1px solid var(--accent-primary);
  border-top: none;
  margin-top: 0;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.15);
  animation: slideDown 0.3s ease-out;
  position: relative;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 500px;
  }
}

.advanced-search-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.search-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.age-range,
.score-range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.age-range input,
.score-range input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.age-range span,
.score-range span {
  color: var(--text-secondary);
  font-weight: 500;
}

.advanced-search-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.apply-btn {
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.apply-btn:hover:not(:disabled) {
  background-color: #1976d2;
}

.clear-btn {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  background-color: var(--bg-primary);
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

/* 自定义会员时间样式 */
.membership-custom {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  background-color: var(--bg-secondary);
}

.custom-membership-toggle {
  margin-bottom: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-primary);
}

.checkbox-label input[type="checkbox"] {
  margin-right: 0.5rem;
  transform: scale(1.2);
}

.custom-membership-date {
  margin-top: 1rem;
}

.custom-membership-date {
  /* DatePicker component handles its own styling */
  color: var(--text-primary);
  font-size: 1rem;
}

.membership-preview {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #e8f5e8;
  border: 1px solid #4caf50;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-icon {
  font-size: 1.2rem;
}

.preview-text {
  font-size: 0.875rem;
  color: #2e7d32;
  font-weight: 500;
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
  
  .form-group input,
  .form-group select {
    padding: 1rem;
    font-size: 1rem;
    min-height: 48px;
    border-radius: 8px;
  }
  
  .form-group textarea {
    padding: 1rem;
    font-size: 1rem;
    min-height: 120px;
    border-radius: 8px;
  }
  
  .form-group label {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .modal-footer {
    padding: 1.5rem;
    gap: 1rem;
  }
  
  .modal-footer button {
    padding: 1rem 1.5rem;
    font-size: 1rem;
    min-height: 48px;
    border-radius: 8px;
  }
}

@media (max-width: 480px) {
  .form-group input,
  .form-group select {
    padding: 1.25rem;
    font-size: 1.125rem;
    min-height: 52px;
    border-radius: 12px;
  }
  
  .form-group textarea {
    padding: 1.25rem;
    font-size: 1.125rem;
    min-height: 140px;
    border-radius: 12px;
  }
  
  .form-group label {
    font-size: 1.125rem;
    font-weight: 600;
  }
  
  .modal-footer button {
    padding: 1.25rem 1.5rem;
    font-size: 1.125rem;
    min-height: 52px;
    border-radius: 12px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    transform: scale(1.02);
    transition: transform 0.2s ease;
  }
  
  .modal-footer button:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }
  
  .student-card:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
  
  /* 移除点击高亮 */
  * {
    -webkit-tap-highlight-color: transparent;
  }
}

/* 移动端布局优化 */
@media (max-width: 768px) {
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

  /* 高级搜索面板移动端优化 */
  .advanced-search-container {
    position: relative;
  }
  
  .advanced-search-toggle {
    margin-left: 0;
    margin-top: 1rem;
  }

  .toggle-btn {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    justify-content: center;
  }
  
  .toggle-btn.active {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  .advanced-search-panel {
    padding: 1rem;
    margin-top: 0;
    border-radius: 0 0 12px 12px;
  }

  .advanced-search-row {
    grid-template-columns: 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .search-field {
    width: 100%;
  }

  .search-field label {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .age-range,
  .score-range {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .age-range input,
  .score-range input {
    flex: 1;
    min-width: 80px;
    max-width: 120px;
    padding: 0.6rem 0.4rem;
    font-size: 0.9rem;
    text-align: center;
  }

  .age-range span,
  .score-range span {
    font-size: 0.9rem;
    padding: 0 0.2rem;
    flex-shrink: 0;
  }

  .advanced-search-actions {
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .apply-btn,
  .clear-btn {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
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

/* 会员管理相关样式 */
.membership-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

.membership-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.membership-badge.active {
  background-color: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #4caf50;
}

.membership-badge.expiring {
  background-color: #fff3e0;
  color: #f57c00;
  border: 1px solid #ff9800;
}

.membership-badge.expired {
  background-color: #fce4ec;
  color: #c2185b;
  border: 1px solid #e91e63;
}

.membership-badge.no-membership {
  background-color: #f5f5f5;
  color: #757575;
  border: 1px solid #bdbdbd;
}

.membership-days {
  font-size: 0.7rem;
  color: var(--text-secondary);
}

.membership-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  font-size: 1.2rem;
}

.membership-btn:hover {
  background-color: #ffd700;
  transform: scale(1.1);
}

/* 会员管理模态框样式 */
.membership-modal {
  max-width: 600px;
}

.membership-status {
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.membership-status h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.days-remaining {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.membership-dates {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.quick-actions {
  margin-bottom: 1.5rem;
}

.quick-actions h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.membership-action-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  flex: 1;
  min-width: 120px;
}

.month-btn {
  background-color: #e3f2fd;
  color: #1976d2;
  border: 1px solid #2196f3;
}

.month-btn:hover {
  background-color: #2196f3;
  color: white;
}

.year-btn {
  background-color: #f3e5f5;
  color: #7b1fa2;
  border: 1px solid #9c27b0;
}

.year-btn:hover {
  background-color: #9c27b0;
  color: white;
}

.clear-btn {
  background-color: #ffebee;
  color: #d32f2f;
  border: 1px solid #f44336;
}

.clear-btn:hover {
  background-color: #f44336;
  color: white;
}

.custom-membership {
  background-color: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
}

.custom-membership h4 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.custom-membership .form-group {
  margin-bottom: 1rem;
}

.custom-membership .form-group {
  /* DatePicker component handles its own styling */
  color: var(--text-primary);
}

/* 会员提示样式 */
.membership-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #e8f5e8;
  border: 1px solid #4caf50;
  border-radius: 6px;
  font-size: 0.875rem;
}

.hint-icon {
  font-size: 1rem;
}

.hint-text {
  color: #2e7d32;
  font-weight: 500;
}

/* 响应式设计 - 会员管理 */
@media (max-width: 768px) {
  .membership-modal {
    width: 95%;
    max-width: none;
  }
  
  .quick-buttons {
    flex-direction: column;
  }
  
  .membership-action-btn {
    min-width: auto;
  }
  
  .status-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .membership-hint {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
}

/* 小屏幕设备优化 - 针对分数输入框 */
@media (max-width: 480px) {
  /* 进一步优化高级搜索的输入框 */
  .age-range,
  .score-range {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .age-range input,
  .score-range input {
    width: 100%;
    max-width: none;
    min-width: auto;
    padding: 0.75rem;
    font-size: 16px; /* 防止iOS放大输入框 */
    border-radius: 6px;
  }

  .age-range span,
  .score-range span {
    align-self: center;
    font-size: 1rem;
    padding: 0.25rem 0;
  }

  /* 优化高级搜索面板间距 */
  .advanced-search-panel {
    padding: 0.75rem;
    margin-top: 0;
    border-radius: 0 0 12px 12px;
  }

  .search-field {
    margin-bottom: 1rem;
  }

  .search-field label {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  /* 优化按钮布局 */
  .advanced-search-actions {
    margin-top: 1.5rem;
    gap: 0.75rem;
  }

  .apply-btn,
  .clear-btn {
    padding: 1rem;
    font-size: 1.1rem;
    border-radius: 8px;
  }
}

/* 超小屏幕设备优化 */
@media (max-width: 360px) {
  .advanced-search-row {
    gap: 0.75rem;
  }

  .age-range input,
  .score-range input {
    padding: 0.6rem;
    font-size: 14px;
  }

  .advanced-search-panel {
    padding: 0.5rem;
    margin-top: 0;
    border-radius: 0 0 12px 12px;
  }

  .search-field label {
    font-size: 0.9rem;
  }
}
</style>

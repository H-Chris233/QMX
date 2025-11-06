import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import type { Student, StudentCreateData, StudentUpdateData, StudentSearchParams, CurrentStudentInput } from '../types/api';
import { ApiService } from '../api/ApiService';
import { storeActionWrapper, StoreActionPresets } from '../utils/storeErrorHandling';

/**
 * 学生数据状态管理
 * 负责学生信息的CRUD操作，缓存已移至API层统一管理
 */
export const useStudentStore = defineStore('student', () => {
  // State - 使用shallowRef优化性能
  const students = shallowRef<Student[]>([]);
  const currentStudent = shallowRef<Student | null>(null);
  const searchParams = ref<StudentSearchParams>({
    page: 1,
    limit: 20,
    keyword: '',
    class: '',
    subject: '',
    status: undefined
  });

  const pagination = ref({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Loading状态
  const loading = ref(false);
  const fetchLoading = ref(false);

  // 优化的computed属性 - 使用缓存提升性能
  const studentsById = computed(() => {
    const map = new Map<number, Student>();
    for (const student of students.value) {
      map.set(student.uid, student);
    }
    return map;
  });

  // 记忆化的查找函数，避免重复计算
  const getStudentById = (id: number): Student | undefined => {
    return studentsById.value.get(id);
  };

  const activeStudents = computed(() => {
    return students.value.filter(student =>
      !student.membership_end_date || new Date(student.membership_end_date) > new Date()
    );
  });

  const inactiveStudents = computed(() => {
    return students.value.filter(student =>
      student.membership_end_date && new Date(student.membership_end_date) <= new Date()
    );
  });

  const studentsByClass = computed(() => {
    const groups: Record<string, Student[]> = {};
    students.value.forEach(student => {
      const className = student.class || '未分配班级';
      if (!groups[className]) {
        groups[className] = [];
      }
      groups[className].push(student);
    });
    return groups;
  });

  const currentSearchParams = computed(() => searchParams.value);

  // 移除缓存相关computed，缓存逻辑已在API层处理

  // Actions

  /**
   * 获取学生列表 - 使用统一错误处理
   */
  async function fetchStudents(params?: Partial<StudentSearchParams>, forceRefresh = false) {
    fetchLoading.value = true;

    try {
      return await storeActionWrapper(async () => {
        const mergedParams = { ...searchParams.value, ...params };
        const response = await ApiService.getAllStudents(mergedParams, forceRefresh);

        students.value = response.students;
        // 转换分页格式
        pagination.value = {
          currentPage: response.pagination.page,
          totalPages: response.pagination.total_pages,
          totalItems: response.pagination.total,
          itemsPerPage: response.pagination.limit,
          hasNextPage: response.pagination.page < response.pagination.total_pages,
          hasPrevPage: response.pagination.page > 1
        };
        searchParams.value = mergedParams;

        return response;
      }, {
        ...StoreActionPresets.fetch('学生列表'),
        context: { params, forceRefresh },
        retryCallback: () => fetchStudents(params, true)
      });
    } finally {
      fetchLoading.value = false;
    }
  }

  /**
   * 获取单个学生详情 - 简化缓存逻辑，使用API层缓存
   */
  async function fetchStudentById(id: number, forceRefresh = false) {
    return storeActionWrapper(async () => {
      const student = await ApiService.getStudentById(id, forceRefresh);
      currentStudent.value = student;

      // 更新本地列表中的学生信息
      const index = students.value.findIndex(s => s.uid === id);
      if (index !== -1) {
        const newStudents = [...students.value];
        newStudents[index] = student;
        students.value = newStudents;
      } else {
        students.value = [...students.value, student];
      }

      return student;
    }, {
      ...StoreActionPresets.fetch('学生详情'),
      context: { id, forceRefresh }
    });
  }

  /**
   * 创建学生 - 使用统一错误处理
   */
  async function createStudent(data: CurrentStudentInput) {
    loading.value = true;

    try {
      return await storeActionWrapper(async () => {
        const newStudent = await ApiService.addStudent(data);

        // 更新本地状态
        students.value = [newStudent, ...students.value];
        currentStudent.value = newStudent;

        return newStudent;
      }, {
        ...StoreActionPresets.create('学生'),
        context: { data }
      });
    } finally {
      loading.value = false;
    }
  }

  /**
   * 更新学生信息 - 使用统一错误处理
   */
  async function updateStudent(id: number, data: StudentUpdateData) {
    loading.value = true;

    try {
      return await storeActionWrapper(async () => {
        const updatedStudent = await ApiService.updateStudentInfo(id, data);

        // 更新本地状态
        const index = students.value.findIndex(s => s.uid === id);
        if (index !== -1) {
          const newStudents = [...students.value];
          newStudents[index] = updatedStudent;
          students.value = newStudents;
        }

        if (currentStudent.value?.uid === id) {
          currentStudent.value = updatedStudent;
        }

        return updatedStudent;
      }, {
        ...StoreActionPresets.update('学生信息'),
        context: { id, data }
      });
    } finally {
      loading.value = false;
    }
  }

  /**
   * 删除学生 - 使用统一错误处理
   */
  async function deleteStudent(id: number) {
    loading.value = true;

    try {
      await storeActionWrapper(async () => {
        await ApiService.deleteStudent(id);

        // 更新本地状态
        students.value = students.value.filter(s => s.uid !== id);
        if (currentStudent.value?.uid === id) {
          currentStudent.value = null;
        }
      }, {
        ...StoreActionPresets.delete('学生'),
        context: { id }
      });
    } finally {
      loading.value = false;
    }
  }

  /**
   * 搜索学生 - 使用统一错误处理
   */
  async function searchStudents(keyword: string) {
    return fetchStudents({ keyword, page: 1 });
  }

  /**
   * 设置当前学生
   */
  function setCurrentStudent(student: Student | null) {
    currentStudent.value = student;
  }

  /**
   * 更新搜索参数
   */
  function updateSearchParams(params: Partial<StudentSearchParams>) {
    searchParams.value = { ...searchParams.value, ...params };
  }

  /**
   * 重置搜索参数
   */
  function resetSearchParams() {
    searchParams.value = {
      page: 1,
      limit: 20,
      keyword: '',
      class: '',
      subject: '',
      status: undefined
    };
  }

  /**
   * 清空学生数据 - 移除缓存相关逻辑
   */
  function clearStudents() {
    students.value = [];
    currentStudent.value = null;
  }

  /**
   * 刷新数据 - 移除缓存相关逻辑
   */
  async function refresh() {
    return fetchStudents(searchParams.value, true);
  }

  return {
    // State
    students,
    currentStudent,
    searchParams,
    pagination,
    loading,
    fetchLoading,

    // Getters
    studentsById,
    activeStudents,
    inactiveStudents,
    studentsByClass,
    currentSearchParams,
    getStudentById, // 优化的查找函数

    // Actions
    fetchStudents,
    fetchStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    searchStudents,
    setCurrentStudent,
    updateSearchParams,
    resetSearchParams,
    clearStudents,
    refresh
  };
});
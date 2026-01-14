/**
 * Student Store 单元测试
 *
 * 测试覆盖：
 * 1. 状态初始化
 * 2. 学员列表获取
 * 3. 学员CRUD操作
 * 4. 搜索和筛选
 * 5. 分页功能
 * 6. Computed Getters
 * 7. 边界条件处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia, type Pinia } from 'pinia';
import { useStudentStore } from '../student';
import { ApiService } from '@/api/ApiService';

// Mock ApiService
vi.mock('@/api/ApiService', () => ({
  ApiService: {
    getAllStudents: vi.fn(),
    getStudent: vi.fn(),
    addStudent: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudent: vi.fn(),
  },
}));

describe('StudentStore', () => {
  let pinia: Pinia;
  let store: ReturnType<typeof useStudentStore>;

  const mockStudents = [
    {
      uid: 1,
      name: '张三',
      phone: '13800138000',
      class: 'Month',
      subject: 'Shooting',
      rings: [9, 8, 7],
      lesson_left: 10,
      membership_start_date: '2024-01-01',
      membership_end_date: '2024-12-31',
      is_membership_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      uid: 2,
      name: '李四',
      phone: '13900139000',
      class: 'Year',
      subject: 'Archery',
      rings: [10, 9],
      lesson_left: 5,
      membership_start_date: '2024-01-01',
      membership_end_date: '2024-03-01',
      is_membership_active: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    store = useStudentStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. 状态初始化', () => {
    it('应该初始化空学员列表', () => {
      expect(store.students).toEqual([]);
    });

    it('应该初始化分页信息', () => {
      expect(store.pagination.currentPage).toBe(1);
      expect(store.pagination.totalPages).toBe(1);
      expect(store.pagination.totalItems).toBe(0);
      expect(store.pagination.itemsPerPage).toBe(20);
    });

    it('应该初始化默认搜索参数', () => {
      expect(store.searchParams.page).toBe(1);
      expect(store.searchParams.limit).toBe(20);
      expect(store.searchParams.keyword).toBe('');
    });

    it('应该初始化loading状态为false', () => {
      expect(store.loading).toBe(false);
      expect(store.fetchLoading).toBe(false);
    });
  });

  describe('2. 学员列表获取', () => {
    it('fetchStudents应该获取学员列表', async () => {
      const mockResponse = {
        students: mockStudents,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          total_pages: 1,
        },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      await store.fetchStudents();

      expect(store.students).toEqual(mockStudents);
      expect(store.pagination.totalItems).toBe(2);
      expect(store.pagination.currentPage).toBe(1);
    });

    it('fetchStudents应该处理ApiService错误', async () => {
      vi.mocked(ApiService.getAllStudents).mockRejectedValue(new Error('API Error'));

      await expect(store.fetchStudents()).rejects.toThrow('API Error');
    });

    it('fetchStudents应该支持强制刷新', async () => {
      const mockResponse = {
        students: mockStudents,
        pagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      await store.fetchStudents({}, true);

      expect(ApiService.getAllStudents).toHaveBeenCalledWith(expect.any(Object), true);
    });

    it('应该正确更新分页信息', async () => {
      const mockResponse = {
        students: mockStudents,
        pagination: {
          page: 2,
          limit: 20,
          total: 50,
          total_pages: 3,
        },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      await store.fetchStudents({ page: 2 });

      expect(store.pagination.currentPage).toBe(2);
      expect(store.pagination.totalPages).toBe(3);
      expect(store.pagination.hasNextPage).toBe(true);
      expect(store.pagination.hasPrevPage).toBe(true);
    });
  });

  describe('3. 学员搜索', () => {
    it('searchParams应该响应参数变化', async () => {
      store.searchParams.keyword = '测试';

      expect(store.searchParams.keyword).toBe('测试');
    });

    it('currentSearchParams应该返回当前搜索参数', () => {
      store.searchParams.keyword = '张三';
      store.searchParams.class = 'Month';

      const params = store.currentSearchParams;

      expect(params.keyword).toBe('张三');
      expect(params.class).toBe('Month');
    });

    it('支持按班级筛选', async () => {
      const mockResponse = {
        students: [mockStudents[0]],
        pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      await store.fetchStudents({ class: 'Month' });

      expect(ApiService.getAllStudents).toHaveBeenCalledWith(
        expect.objectContaining({ class_type: 'Month' })
      );
    });

    it('支持按科目筛选', async () => {
      const mockResponse = {
        students: mockStudents,
        pagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      await store.fetchStudents({ subject: 'Shooting' });

      expect(ApiService.getAllStudents).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Shooting' })
      );
    });

    it('支持按会员状态筛选', async () => {
      const mockResponse = {
        students: mockStudents,
        pagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      await store.fetchStudents({ membershipStatus: 'ACTIVE' });

      expect(ApiService.getAllStudents).toHaveBeenCalledWith(
        expect.objectContaining({ membership_status: 'ACTIVE' })
      );
    });
  });

  describe('4. Computed Getters', () => {
    beforeEach(async () => {
      const mockResponse = {
        students: mockStudents,
        pagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
      };
      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);
      await store.fetchStudents();
    });

    it('studentsById应该返回ID到学员的映射', () => {
      const map = store.studentsById;

      expect(map.get(1)?.name).toBe('张三');
      expect(map.get(2)?.name).toBe('李四');
      expect(map.size).toBe(2);
    });

    it('getStudentById应该返回正确的学员', () => {
      const student = store.getStudentById(1);

      expect(student?.name).toBe('张三');
    });

    it('getStudentById应该处理不存在的ID', () => {
      const student = store.getStudentById(999);

      expect(student).toBeUndefined();
    });

    it('activeStudents应该返回活跃学员', () => {
      const active = store.activeStudents;

      expect(active.length).toBe(1);
      expect(active[0]?.name).toBe('张三');
    });

    it('inactiveStudents应该返回非活跃学员', () => {
      const inactive = store.inactiveStudents;

      expect(inactive.length).toBe(1);
      expect(inactive[0]?.name).toBe('李四');
    });

    it('studentsByClass应该按班级分组', () => {
      const groups = store.studentsByClass;

      expect(groups['Month']).toHaveLength(1);
      expect(groups['Year']).toHaveLength(1);
      expect(groups['未分配班级']).toBeUndefined();
    });

    it('应该处理无班级学员', async () => {
      const studentWithNoClass = {
        ...mockStudents[0],
        class: null,
        uid: 3,
      };

      const mockResponse = {
        students: [...mockStudents, studentWithNoClass],
        pagination: { page: 1, limit: 20, total: 3, total_pages: 1 },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      store.students = [...mockStudents, studentWithNoClass] as any;

      const groups = store.studentsByClass;

      expect(groups['未分配班级']).toHaveLength(1);
    });
  });

  describe('5. 分页功能', () => {
    it('goToPage应该跳转到指定页', async () => {
      const mockResponse = {
        students: mockStudents,
        pagination: { page: 1, limit: 20, total: 50, total_pages: 3 },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      store.pagination.totalPages = 3;
      await store.goToPage(2);

      expect(store.searchParams.page).toBe(2);
    });

    it('goToPage应该处理无效页码', async () => {
      const mockResponse = {
        students: mockStudents,
        pagination: { page: 1, limit: 20, total: 50, total_pages: 3 },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      store.pagination.totalPages = 3;
      // 小于1的页码
      await store.goToPage(0);

      expect(ApiService.getAllStudents).not.toHaveBeenCalled();

      // 大于总页数的页码
      await store.goToPage(999);

      expect(ApiService.getAllStudents).not.toHaveBeenCalled();
    });

    it('shouldUpdateSearchParams应该正确合并参数', async () => {
      store.searchParams.keyword = '原关键词';

      await store.fetchStudents({ keyword: '新关键词' });

      expect(store.searchParams.keyword).toBe('新关键词');
    });
  });

  describe('6. 边界条件', () => {
    it('应该处理空学员列表', async () => {
      const mockResponse = {
        students: [],
        pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      await store.fetchStudents();

      expect(store.students).toEqual([]);
      expect(store.pagination.totalItems).toBe(0);
    });

    it('应该处理null/undefined的班级字段', async () => {
      const studentWithNullClass = [
        {
          uid: 1,
          name: '测试学员',
          class: null,
          subject: 'Shooting',
        },
      ] as any;

      const mockResponse = {
        students: studentWithNullClass,
        pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      };

      vi.mocked(ApiService.getAllStudents).mockResolvedValue(mockResponse);

      store.students = studentWithNullClass as any;

      const groups = store.studentsByClass;

      expect(groups['未分配班级']).toHaveLength(1);
    });

    it('getStudentById应该处理边界ID值', () => {
      expect(store.getStudentById(0)).toBeUndefined();
      expect(store.getStudentById(-1)).toBeUndefined();
      expect(store.getStudentById(Number.MAX_SAFE_INTEGER)).toBeUndefined();
    });

    it('activeStudents应该处理无会员日期的情况', async () => {
      const studentWithoutMembership = {
        uid: 1,
        name: '无会员',
        membership_end_date: null,
      } as any;

      store.students = [studentWithoutMembership];

      const active = store.activeStudents;

      expect(active.length).toBe(1);
    });

    it('inactiveStudents应该处理过期会员', async () => {
      const expiredStudent = {
        uid: 1,
        name: '已过期',
        membership_end_date: '2020-01-01', // 过去的日期
      } as any;

      store.students = [expiredStudent];

      const inactive = store.inactiveStudents;

      expect(inactive.length).toBe(1);
    });
  });

  describe('7. 状态管理', () => {
    it('loading状态应该在请求期间为true', async () => {
      vi.mocked(ApiService.getAllStudents).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          students: mockStudents,
          pagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
        }), 100))
      );

      expect(store.fetchLoading).toBe(false);

      const promise = store.fetchStudents();

      expect(store.fetchLoading).toBe(true);

      await promise;

      expect(store.fetchLoading).toBe(false);
    });

    it('resetSearchParams应该重置搜索参数', async () => {
      // 设置一些非默认值
      store.searchParams.keyword = '测试';
      store.searchParams.class = 'Month';
      store.searchParams.page = 5;

      store.resetSearchParams();

      expect(store.searchParams.keyword).toBe('');
      expect(store.searchParams.class).toBe('');
      expect(store.searchParams.page).toBe(1);
    });
  });
});

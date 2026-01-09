/**
 * 学员管理 API 服务
 */
import { baseClient, apiCall } from "./baseClient";
import type {
  Student,
  StudentUpdateData,
  StudentSearchOptions,
  PaginatedResponse,
  CurrentStudentInput,
} from "../types/api";

/**
 * 查询参数序列化助手
 */
function serializeParams(params: Record<string, any>): Record<string, string> {
  const serialized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      serialized[key] = String(value);
    }
  }

  return serialized;
}

/**
 * 学员 API 响应类型
 */
export interface StudentListResponse {
  students: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * 学员 API 服务类
 */
export class StudentApiService {
  /**
   * 获取所有学员（支持分页和搜索）
   */
  static async getAllStudents(
    params?: StudentSearchOptions,
    forceRefresh = false
  ): Promise<StudentListResponse> {
    const queryParams = params ? serializeParams(params) : {};

    return apiCall<StudentListResponse>(
      baseClient
        .get<PaginatedResponse<Student>>("/students", {
          params: queryParams,
        })
        .then((response) => {
          // 解包分页数据
          return {
            students: response.data.data || [],
            pagination: response.data.pagination,
          };
        }),
      "/students",
      params,
      forceRefresh
    );
  }

  /**
   * 搜索学员（返回数组）
   */
  static async searchStudents(
    params: StudentSearchOptions
  ): Promise<Student[]> {
    const response = await this.getAllStudents(params);
    return response.students;
  }

  /**
   * 根据 ID 获取学员信息
   */
  static async getStudentById(
    uid: number,
    forceRefresh = false
  ): Promise<Student> {
    return apiCall<Student>(
      baseClient.get(`/students/${uid}`),
      `/students/${uid}`,
      { uid },
      forceRefresh
    );
  }

  /**
   * 新增学员
   * 将前端字段（classType）映射为后端字段（class）
   */
  static async addStudent(student: CurrentStudentInput): Promise<Student> {
    // 确保字段命名正确
    const payload = {
      name: student.name,
      age: student.age,
      phone: student.phone,
      class: student.class, // 后端期望的字段名
      subject: student.subject,
      note: student.note || "",
      lesson_left: student.lesson_left,
      membership_start_date: student.membership_start_date,
      membership_end_date: student.membership_end_date,
    };

    return apiCall<Student>(baseClient.post("/students", payload));
  }

  /**
   * 更新学员信息
   * 将前端字段映射为后端字段
   */
  static async updateStudent(
    uid: number,
    data: StudentUpdateData
  ): Promise<Student> {
    // 确保字段命名正确
    const payload: Record<string, any> = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.age !== undefined) payload.age = data.age;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.class !== undefined) payload.class = data.class; // 后端期望的字段名
    if (data.subject !== undefined) payload.subject = data.subject;
    if (data.note !== undefined) payload.note = data.note;
    if (data.lesson_left !== undefined) payload.lesson_left = data.lesson_left;
    if (data.membership_start_date !== undefined)
      payload.membership_start_date = data.membership_start_date;
    if (data.membership_end_date !== undefined)
      payload.membership_end_date = data.membership_end_date;
    if (data.rings !== undefined) payload.rings = data.rings;

    return apiCall<Student>(baseClient.put(`/students/${uid}`, payload));
  }

  /**
   * 删除学员
   */
  static async deleteStudent(uid: number): Promise<void> {
    await apiCall<void>(baseClient.delete(`/students/${uid}`));
  }

  /**
   * 获取学员成绩
   */
  static async getStudentScores(uid: number): Promise<number[]> {
    const response = await apiCall<{ rings: number[]; scores?: number[] }>(
      baseClient.get(`/students/${uid}/scores`)
    );

    // 返回 rings 字段（后端使用 rings 存储成绩）
    return response.rings || response.scores || [];
  }

  /**
   * 添加学员成绩
   */
  static async addScore(uid: number, score: number): Promise<number[]> {
    const response = await apiCall<{ rings: number[]; scores?: number[] }>(
      baseClient.post(`/students/${uid}/scores`, { score })
    );

    return response.rings || response.scores || [];
  }

  /**
   * 删除学员成绩
   */
  static async deleteScore(uid: number, scoreIndex: number): Promise<number[]> {
    const response = await apiCall<{ rings: number[]; scores?: number[] }>(
      baseClient.delete(`/students/${uid}/scores/${scoreIndex}`)
    );

    return response.rings || response.scores || [];
  }

  /**
   * 更新学员成绩
   */
  static async updateScore(
    uid: number,
    scoreIndex: number,
    newScore: number
  ): Promise<number[]> {
    const response = await apiCall<{ rings: number[]; scores?: number[] }>(
      baseClient.put(`/students/${uid}/scores/${scoreIndex}`, { newScore })
    );

    return response.rings || response.scores || [];
  }

  /**
   * 批量更新学员成绩
   */
  static async updateScoresBatch(
    uid: number,
    scores: number[]
  ): Promise<number[]> {
    const response = await apiCall<{ rings: number[]; scores?: number[] }>(
      baseClient.post(`/students/${uid}/scores/batch`, { scores })
    );

    return response.rings || response.scores || [];
  }
}

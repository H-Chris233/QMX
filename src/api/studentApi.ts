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
  StudentScoreDetail,
  StudentScoresResponse,
} from "../types/api";
import {
  toClassType,
  toSubjectType,
  toFrontendClassType,
  toFrontendSubjectType,
  toFrontendMembershipStatus,
} from "./paramMappers";

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
  private static normalizeStudent(student: Student): Student {
    const scoreDetails = Array.isArray(student.score_details) ? student.score_details : [];
    const rings = scoreDetails.map((detail) => Number(detail.score)).filter((score) => Number.isFinite(score));

    return {
      ...student,
      class: toFrontendClassType(String(student.class)) || student.class,
      subject: toFrontendSubjectType(String(student.subject)) || student.subject,
      score_details: scoreDetails,
      rings,
      membership_status: student.membership_status
        ? (toFrontendMembershipStatus(String(student.membership_status)) as any)
        : student.membership_status,
    };
  }

  /**
   * 获取所有学员（支持分页和搜索）
   */
  static async getAllStudents(
    params?: StudentSearchOptions,
    forceRefresh = false
  ): Promise<StudentListResponse> {
    const normalizedParams = params ? { ...params } : undefined;
    if (normalizedParams?.class_type) {
      normalizedParams.class_type = toClassType(String(normalizedParams.class_type));
    }
    if (normalizedParams?.subject) {
      normalizedParams.subject = toSubjectType(String(normalizedParams.subject));
    }
    if (normalizedParams?.membership_status !== undefined) {
      delete (normalizedParams as Record<string, unknown>).membership_status;
    }
    const queryParams = normalizedParams ? serializeParams(normalizedParams) : {};

    return apiCall<StudentListResponse>(
      baseClient
        .get<PaginatedResponse<Student>>("/students", {
          params: queryParams,
        })
        .then((response) => {
          const normalizedStudents = (response.data.data || []).map((student) =>
            StudentApiService.normalizeStudent(student)
          );
          // 解包分页数据
          return {
            students: normalizedStudents,
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
    const student = await apiCall<Student>(
      baseClient.get(`/students/${uid}`),
      `/students/${uid}`,
      { uid },
      forceRefresh
    );
    return StudentApiService.normalizeStudent(student);
  }

  /**
   * 新增学员
   * 将前端字段（classType）映射为后端字段（class）
   */
  static async addStudent(student: CurrentStudentInput): Promise<Student> {
    // 确保字段命名正确
    const payload: Record<string, unknown> = {
      name: student.name,
      age: student.age,
      phone: student.phone,
      class: toClassType(String(student.class)), // 后端期望的字段名
      subject: toSubjectType(String(student.subject)),
    };

    if (student.note !== undefined) payload.note = student.note;
    if (student.lesson_left !== undefined) payload.lesson_left = student.lesson_left;
    if (student.membership_start_date !== undefined) {
      payload.membership_start_date = student.membership_start_date;
    }
    if (student.membership_end_date !== undefined) {
      payload.membership_end_date = student.membership_end_date;
    }

    const created = await apiCall<Student>(baseClient.post("/students", payload));
    return StudentApiService.normalizeStudent(created);
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
    if (data.class !== undefined) payload.class = toClassType(String(data.class)); // 后端期望的字段名
    if (data.subject !== undefined) payload.subject = toSubjectType(String(data.subject));
    if (data.note !== undefined) payload.note = data.note;
    if (data.lesson_left !== undefined) payload.lesson_left = data.lesson_left;
    if (data.membership_start_date !== undefined)
      payload.membership_start_date = data.membership_start_date;
    if (data.membership_end_date !== undefined)
      payload.membership_end_date = data.membership_end_date;
    if (data.score_details !== undefined) payload.score_details = data.score_details;

    const updated = await apiCall<Student>(baseClient.put(`/students/${uid}`, payload));
    return StudentApiService.normalizeStudent(updated);
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
  static async getStudentScores(uid: number): Promise<StudentScoreDetail[]> {
    const response = await apiCall<StudentScoresResponse>(
      baseClient.get(`/students/${uid}/scores`)
    );
    return Array.isArray(response.score_details) ? response.score_details : [];
  }

  /**
   * 添加学员成绩
   */
  static async addScore(
    uid: number,
    payload: { score: number; subject?: string; recorded_at?: string; note?: string | null },
  ): Promise<StudentScoreDetail[]> {
    const response = await apiCall<StudentScoresResponse>(
      baseClient.post(`/students/${uid}/scores`, payload)
    );
    return Array.isArray(response.score_details) ? response.score_details : [];
  }

  /**
   * 删除学员成绩
   */
  static async deleteScore(uid: number, scoreIndex: number): Promise<StudentScoreDetail[]> {
    const response = await apiCall<StudentScoresResponse>(
      baseClient.delete(`/students/${uid}/scores/${scoreIndex}`)
    );
    return Array.isArray(response.score_details) ? response.score_details : [];
  }

  /**
   * 清空学员所有成绩
   */
  static async clearAllScores(uid: number): Promise<void> {
    await apiCall<void>(baseClient.delete(`/students/${uid}/scores`));
  }

  /**
   * 更新学员成绩
   */
  static async updateScore(
    uid: number,
    scoreIndex: number,
    payload: { newScore: number; subject?: string; recorded_at?: string; note?: string | null },
  ): Promise<StudentScoreDetail[]> {
    const response = await apiCall<StudentScoresResponse>(
      baseClient.put(`/students/${uid}/scores/${scoreIndex}`, payload)
    );
    return Array.isArray(response.score_details) ? response.score_details : [];
  }

  /**
   * 批量更新学员成绩
   */
  static async updateScoresBatch(
    uid: number,
    scoreDetails: Array<{ score: number; subject?: string; recorded_at?: string; note?: string | null }>,
  ): Promise<StudentScoreDetail[]> {
    const response = await apiCall<StudentScoresResponse>(
      baseClient.post(`/students/${uid}/scores/batch`, { score_details: scoreDetails })
    );
    return Array.isArray(response.score_details) ? response.score_details : [];
  }
}

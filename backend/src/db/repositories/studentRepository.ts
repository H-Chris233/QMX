import { db } from '../index';
import { students, Student, NewStudent } from '../schema/students';
import { eq, like, and, or, gte, lte, isNull, isNotNull, desc, asc, count, sql } from 'drizzle-orm';

export interface StudentSearchOptions {
  nameContains?: string;
  minAge?: number;
  maxAge?: number;
  minScore?: number;
  maxScore?: number;
  classType?: string;
  subject?: string;
  hasMembership?: boolean;
  membershipActiveAt?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export class StudentRepository {
  // 根据 UID 查找
  static async findByUid(uid: number): Promise<Student | null> {
    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.uid, uid))
      .limit(1);
    return student || null;
  }

  // 查找所有
  static async findAll(): Promise<Student[]> {
    return await db.select().from(students).orderBy(desc(students.createdAt));
  }

  // 创建学员
  static async create(data: NewStudent): Promise<Student> {
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  // 更新学员
  static async updateByUid(uid: number, data: Partial<NewStudent>): Promise<Student | null> {
    const [updated] = await db
      .update(students)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(students.uid, uid))
      .returning();
    return updated || null;
  }

  // 删除学员
  static async deleteByUid(uid: number): Promise<boolean> {
    const result = await db.delete(students).where(eq(students.uid, uid));
    return result.rowCount > 0;
  }

  // 计数
  static async count(filter?: Partial<StudentSearchOptions>): Promise<number> {
    const conditions = this.buildConditions(filter || {});
    const [result] = await db
      .select({ count: count() })
      .from(students)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return result?.count || 0;
  }

  // 搜索
  static async search(options: StudentSearchOptions): Promise<Student[]> {
    const { config } = await import('@/config');
    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sortBy, options.sortOrder);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(students)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(options.limit || config.pagination.defaultLimit);

    return results;
  }

  // 分页查询
  static async findWithPagination(options: StudentSearchOptions): Promise<PaginationResult<Student>> {
    const { config } = await import('@/config');
    const page = options.page || 1;
    const limit = Math.min(options.limit || config.pagination.defaultLimit, config.pagination.maxLimit);
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sortBy, options.sortOrder);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    console.log('[DEBUG] findWithPagination 查询参数:', { page, limit, offset, conditions: conditions.length });

    // 查询数据
    const data = await db
      .select()
      .from(students)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    console.log('[DEBUG] findWithPagination 查询结果:', { dataLength: data.length, firstItem: data[0] });

    // 查询总数
    const countResultArray = await db
      .select({ count: count() })
      .from(students)
      .where(whereClause);

    console.log('[DEBUG] countResultArray:', JSON.stringify(countResultArray, null, 2));
    const [countResult] = countResultArray;
    console.log('[DEBUG] countResult:', JSON.stringify(countResult, null, 2));
    console.log('[DEBUG] countResult.count type:', typeof countResult?.count, 'value:', countResult?.count);

    const total = countResult?.count ? Number(countResult.count) : 0;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // 查找即将过期的会员
  static async findExpiringMemberships(days: number): Promise<Student[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await db
      .select()
      .from(students)
      .where(
        and(
          isNotNull(students.membershipStartDate),
          isNotNull(students.membershipEndDate),
          gte(students.membershipEndDate, now.toISOString().split('T')[0]),
          lte(students.membershipEndDate, futureDate.toISOString().split('T')[0])
        )
      )
      .orderBy(asc(students.membershipEndDate));
  }

  // 构建查询条件
  private static buildConditions(options: StudentSearchOptions) {
    const conditions = [];

    console.log('[DEBUG] buildConditions options:', JSON.stringify(options, null, 2));

    if (options.nameContains) {
      conditions.push(like(students.name, `%${options.nameContains}%`));
    }

    if (options.minAge !== undefined) {
      conditions.push(gte(students.age, options.minAge));
    }

    if (options.maxAge !== undefined) {
      conditions.push(lte(students.age, options.maxAge));
    }

    if (options.classType) {
      conditions.push(eq(students.classType, options.classType));
    }

    if (options.subject) {
      conditions.push(eq(students.subject, options.subject));
    }

    if (options.hasMembership === true) {
      conditions.push(
        and(
          isNotNull(students.membershipStartDate),
          isNotNull(students.membershipEndDate)
        )
      );
    } else if (options.hasMembership === false) {
      conditions.push(
        or(
          isNull(students.membershipStartDate),
          isNull(students.membershipEndDate)
        )
      );
    }

    // support membershipActiveAt filter - check if membership is active at given date
    if (options.membershipActiveAt) {
      const activeAtDate = options.membershipActiveAt;
      conditions.push(
        and(
          isNotNull(students.membershipStartDate),
          isNotNull(students.membershipEndDate),
          lte(students.membershipStartDate, activeAtDate),
          gte(students.membershipEndDate, activeAtDate)
        )
      );
    }

    return conditions;
  }

  // 构建排序
  private static buildOrderBy(sortBy?: string, sortOrder?: 'ASC' | 'DESC') {
    const column = sortBy === 'name' ? students.name
      : sortBy === 'age' ? students.age
      : sortBy === 'created_at' || sortBy === 'createdAt' ? students.createdAt
      : students.uid;

    return sortOrder === 'ASC' ? asc(column) : desc(column);
  }

  // 成绩操作 - 添加成绩
  static async addScore(uid: number, score: number): Promise<number[] | null> {
    const student = await this.findByUid(uid);
    if (!student) return null;

    const newRings = [...(student.rings || []), score];
    await this.updateByUid(uid, { rings: newRings });
    return newRings;
  }

  // 成绩操作 - 更新成绩
  static async updateScore(uid: number, index: number, newScore: number): Promise<number[] | null> {
    const student = await this.findByUid(uid);
    if (!student || !student.rings || index >= student.rings.length) return null;

    const newRings = [...student.rings];
    newRings[index] = newScore;
    await this.updateByUid(uid, { rings: newRings });
    return newRings;
  }

  // 成绩操作 - 删除成绩
  static async deleteScore(uid: number, index: number): Promise<number[] | null> {
    const student = await this.findByUid(uid);
    if (!student || !student.rings || index >= student.rings.length) return null;

    const newRings = student.rings.filter((_, i) => i !== index);
    await this.updateByUid(uid, { rings: newRings });
    return newRings;
  }
}

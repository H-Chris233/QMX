import { db } from '../index';
import { students, Student, NewStudent } from '../schema/students';
import { eq, like, and, or, gte, lte, isNull, isNotNull, desc, asc, count } from 'drizzle-orm';

export interface StudentSearchOptions {
  name_contains?: string;
  min_age?: number;
  max_age?: number;
  class_type?: string;
  subject?: string;
  has_membership?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
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
    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sort_by, options.sort_order);

    let query = db.select().from(students);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(orderBy).limit(options.limit || 100);
  }

  // 分页查询
  static async findWithPagination(options: StudentSearchOptions): Promise<PaginationResult<Student>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(options);
    const orderBy = this.buildOrderBy(options.sort_by, options.sort_order);

    // 查询数据
    let dataQuery = db.select().from(students);
    if (conditions.length > 0) {
      dataQuery = dataQuery.where(and(...conditions));
    }
    const data = await dataQuery.orderBy(orderBy).limit(limit).offset(offset);

    // 查询总数
    let countQuery = db.select({ count: count() }).from(students);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;
    const total = countResult?.count || 0;

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

  // 构建查询条件
  private static buildConditions(options: StudentSearchOptions) {
    const conditions = [];

    if (options.name_contains) {
      conditions.push(like(students.name, `%${options.name_contains}%`));
    }

    if (options.min_age !== undefined) {
      conditions.push(gte(students.age, options.min_age));
    }

    if (options.max_age !== undefined) {
      conditions.push(lte(students.age, options.max_age));
    }

    if (options.class_type) {
      conditions.push(eq(students.classType, options.class_type));
    }

    if (options.subject) {
      conditions.push(eq(students.subject, options.subject));
    }

    if (options.has_membership === true) {
      conditions.push(
        and(
          isNotNull(students.membershipStartDate),
          isNotNull(students.membershipEndDate)
        )
      );
    } else if (options.has_membership === false) {
      conditions.push(
        or(
          isNull(students.membershipStartDate),
          isNull(students.membershipEndDate)
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

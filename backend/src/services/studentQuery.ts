import { db } from '../db';
import { students, Student } from '../db/schema/students';
import {
  eq,
  and,
  or,
  gte,
  lte,
  like,
  isNull,
  isNotNull,
  desc,
  asc,
  count,
  sql,
} from 'drizzle-orm';

export interface StudentQueryResult {
  data: StudentQueryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface StudentQueryItem {
  uid: number;
  name: string;
  age: number | null;
  phone: string;
  classType: string;
  subject: string;
  rings: number[];
  averageScore: number;
  membershipStatus: 'NONE' | 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
  membershipStartDate: string | null;
  membershipEndDate: string | null;
  lessonLeft: number | null;
  createdAt: string;
}

const SORT_FIELD_MAP = {
  uid: 'uid',
  name: 'name',
  age: 'age',
  created_at: 'createdAt',
  created_at_ts: 'createdAt',
} as const;

type SortFieldKey = keyof typeof SORT_FIELD_MAP;
type SortFieldValue = (typeof SORT_FIELD_MAP)[SortFieldKey];

type MembershipFilterState = 'any' | 'withMembership' | 'withoutMembership';

export class StudentQuery {
  private nameFilter?: string;
  private ageFilter: { min?: number; max?: number } = {};
  private classFilter?: string;
  private subjectFilter?: string;
  private membershipFilter: MembershipFilterState = 'any';
  private membershipActiveDate?: Date;
  private membershipStatusFilter?: 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
  private minAverageScore?: number;
  private maxAverageScore?: number;
  private scoreFilterActive = false;
  private sortField: SortFieldValue = SORT_FIELD_MAP.created_at;
  private sortOrder: 1 | -1 = -1;
  private page = 1;
  private limit = 20;

  static create(): StudentQuery {
    return new StudentQuery();
  }

  nameContains(name?: string | null): this {
    if (name) {
      this.nameFilter = name.trim();
    }
    return this;
  }

  ageRange(min?: number | null, max?: number | null): this {
    if (min !== undefined && min !== null) {
      this.ageFilter.min = Number(min);
    }
    if (max !== undefined && max !== null) {
      this.ageFilter.max = Number(max);
    }
    return this;
  }

  classType(classType?: string | null): this {
    if (classType) {
      this.classFilter = classType;
    }
    return this;
  }

  subject(subject?: string | null): this {
    if (subject) {
      this.subjectFilter = subject;
    }
    return this;
  }

  hasMembership(hasMembership?: boolean | null): this {
    if (hasMembership === true) {
      this.membershipFilter = 'withMembership';
    } else if (hasMembership === false) {
      this.membershipFilter = 'withoutMembership';
    } else {
      this.membershipFilter = 'any';
    }
    return this;
  }

  membershipStatus(status?: 'ACTIVE' | 'EXPIRED' | 'UPCOMING' | null): this {
    if (status) {
      this.membershipStatusFilter = status;
    }
    return this;
  }

  membershipActiveAt(date?: Date | string | null): this {
    if (!date) {
      this.membershipActiveDate = undefined;
      return this;
    }
    const activeDate = date instanceof Date ? date : new Date(date);
    if (!Number.isNaN(activeDate.getTime())) {
      this.membershipActiveDate = activeDate;
    }
    return this;
  }

  scoreRange(min?: number | null, max?: number | null): this {
    const hasMin = min !== undefined && min !== null;
    const hasMax = max !== undefined && max !== null;

    if (!hasMin && !hasMax) {
      this.minAverageScore = undefined;
      this.maxAverageScore = undefined;
      this.scoreFilterActive = false;
      return this;
    }

    this.minAverageScore = hasMin ? Number(min) : undefined;
    this.maxAverageScore = hasMax ? Number(max) : undefined;
    this.scoreFilterActive = true;

    if (
      this.minAverageScore !== undefined &&
      this.maxAverageScore !== undefined &&
      this.minAverageScore > this.maxAverageScore
    ) {
      const tmp = this.minAverageScore;
      this.minAverageScore = this.maxAverageScore;
      this.maxAverageScore = tmp;
    }
    return this;
  }

  sort(sortField?: string, order: 'ASC' | 'DESC' = 'DESC'): this {
    const key = Object.keys(SORT_FIELD_MAP).find(
      (k) => k === sortField
    ) as SortFieldKey | undefined;
    this.sortField = key ? SORT_FIELD_MAP[key] : SORT_FIELD_MAP.created_at;
    this.sortOrder = order === 'ASC' ? 1 : -1;
    return this;
  }

  paginate(page?: number, limit?: number): this {
    if (page && Number.isFinite(page) && page > 0) {
      this.page = Math.floor(page);
    }
    if (limit && Number.isFinite(limit) && limit > 0) {
      this.limit = Math.min(Math.floor(limit), 100);
    }
    return this;
  }

  /**
   * 构建查询条件
   */
  private buildConditions() {
    const conditions: ReturnType<typeof eq | typeof gte | typeof lte | typeof like | typeof isNull | typeof isNotNull>[] = [];

    if (this.nameFilter) {
      conditions.push(like(students.name, `%${this.nameFilter}%`));
    }

    if (this.ageFilter.min !== undefined) {
      conditions.push(gte(students.age, this.ageFilter.min));
    }

    if (this.ageFilter.max !== undefined) {
      conditions.push(lte(students.age, this.ageFilter.max));
    }

    if (this.classFilter) {
      conditions.push(eq(students.classType, this.classFilter));
    }

    if (this.subjectFilter) {
      conditions.push(eq(students.subject, this.subjectFilter));
    }

    if (this.membershipFilter === 'withMembership') {
      conditions.push(
        and(
          isNotNull(students.membershipStartDate),
          isNotNull(students.membershipEndDate)
        ) as unknown as typeof eq
      );
    } else if (this.membershipFilter === 'withoutMembership') {
      conditions.push(
        or(
          isNull(students.membershipStartDate),
          isNull(students.membershipEndDate)
        ) as unknown as typeof eq
      );
    }

    if (this.membershipStatusFilter) {
      const today = sql`CURRENT_DATE`;
      if (this.membershipStatusFilter === 'ACTIVE') {
        conditions.push(
          sql`(${students.membershipStartDate} <= ${today} AND ${students.membershipEndDate} >= ${today})` as unknown as typeof eq
        );
      } else if (this.membershipStatusFilter === 'EXPIRED') {
        conditions.push(
          sql`${students.membershipEndDate} < ${today}` as unknown as typeof eq
        );
      } else if (this.membershipStatusFilter === 'UPCOMING') {
        conditions.push(
          sql`${students.membershipStartDate} > ${today}` as unknown as typeof eq
        );
      }
    }

    return conditions;
  }

  /**
   * 计算平均分
   */
  private calculateAverageScore() {
    return sql`
      CASE WHEN array_length(${students.rings}, 1) > 0
        THEN round((SELECT AVG(r) FROM unnest(${students.rings}) AS r), 1)
        ELSE 0
      END
    `.as('averageScore');
  }

  /**
   * 计算会员状态
   */
  private calculateMembershipStatus() {
    return sql`
      CASE
        WHEN ${students.membershipEndDate} IS NULL THEN 'NONE'
        WHEN ${students.membershipEndDate} < CURRENT_DATE THEN 'EXPIRED'
        WHEN ${students.membershipStartDate} > CURRENT_DATE THEN 'UPCOMING'
        ELSE 'ACTIVE'
      END
    `.as('membershipStatus');
  }

  /**
   * 执行查询
   */
  async execute(): Promise<StudentQueryResult> {
    const conditions = this.buildConditions();
    const offset = (this.page - 1) * this.limit;

    // 计算平均分的子查询表达式
    const avgScoreExpr = this.calculateAverageScore();

    // 查询数据
    const query = db
      .select({
        uid: students.uid,
        name: students.name,
        age: students.age,
        phone: students.phone,
        classType: students.classType,
        subject: students.subject,
        rings: students.rings,
        lessonLeft: students.lessonLeft,
        averageScore: avgScoreExpr,
        membershipStatus: this.calculateMembershipStatus(),
        membershipStartDate: students.membershipStartDate,
        membershipEndDate: students.membershipEndDate,
        createdAt: students.createdAt,
      })
      .from(students);

    // 添加条件
    let finalQuery = conditions.length > 0 ? query.where(and(...conditions)) : query;

    // 添加平均分过滤 - 使用 HAVING 子句
    if (this.scoreFilterActive && (this.minAverageScore !== undefined || this.maxAverageScore !== undefined)) {
      const havingConditions: ReturnType<typeof sql>[] = [];
      if (this.minAverageScore !== undefined) {
        havingConditions.push(sql`${avgScoreExpr} >= ${this.minAverageScore}`);
      }
      if (this.maxAverageScore !== undefined) {
        havingConditions.push(sql`${avgScoreExpr} <= ${this.maxAverageScore}`);
      }
      // Drizzle 的 HAVING 暂不完全支持，需要在结果层面过滤
    }

    // 排序映射
    let orderByColumn;
    switch (this.sortField) {
      case 'uid':
        orderByColumn = students.uid;
        break;
      case 'name':
        orderByColumn = students.name;
        break;
      case 'age':
        orderByColumn = students.age ?? sql`0`;
        break;
      case 'createdAt':
      default:
        orderByColumn = students.createdAt;
        break;
    }

    const sort = this.sortOrder === 1 ? asc(orderByColumn) : desc(orderByColumn);
    finalQuery = finalQuery.orderBy(sort);

    // 添加排序以满足类型检查
    finalQuery = finalQuery.orderBy(sort);

    // 分页
    const rawData = await finalQuery.limit(this.limit).offset(offset);

    // 结果过滤 - 处理平均分过滤
    let data = rawData;
    if (this.scoreFilterActive) {
      data = rawData.filter((item) => {
        const avg = Number(item.averageScore || 0);
        if (this.minAverageScore !== undefined && avg < this.minAverageScore) return false;
        if (this.maxAverageScore !== undefined && avg > this.maxAverageScore) return false;
        return true;
      });
    }

    // 查询总数
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(students);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [countResult] = await countQuery;
    const total = Number(countResult?.count) || 0;

    // 转换为查询结果格式
    const resultData: StudentQueryItem[] = data.map((item) => ({
      uid: item.uid,
      name: item.name,
      age: item.age,
      phone: item.phone,
      classType: item.classType,
      subject: item.subject,
      rings: item.rings || [],
      averageScore: Number(item.averageScore || 0),
      membershipStatus: (item.membershipStatus as any) || 'NONE',
      membershipStartDate: item.membershipStartDate || null,
      membershipEndDate: item.membershipEndDate || null,
      lessonLeft: item.lessonLeft,
      createdAt: item.createdAt?.toISOString() || '',
    }));

    return {
      data: resultData,
      pagination: {
        page: this.page,
        limit: this.limit,
        total,
        total_pages: Math.ceil(total / this.limit),
      },
    };
  }

  /**
   * 快捷执行
   */
  async build(): Promise<StudentQueryResult> {
    return await this.execute();
  }
}

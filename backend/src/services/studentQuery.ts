import { ClassType, SubjectType } from '@/types';

const SORT_FIELD_MAP = {
  uid: 'uid',
  name: 'name',
  age: 'age',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
} as const;

type SortFieldKey = keyof typeof SORT_FIELD_MAP;

type SortFieldValue = (typeof SORT_FIELD_MAP)[SortFieldKey];

const isSortFieldKey = (value: unknown): value is SortFieldKey => {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(SORT_FIELD_MAP, value);
};

type MembershipFilterState = 'any' | 'withMembership' | 'withoutMembership';

export interface StudentQueryBuildResult {
  pipeline: any[];
  countPipeline: any[];
  page: number;
  limit: number;
}

export class StudentQuery {
  private nameFilter?: string;
  private ageFilter: { min?: number; max?: number } = {};
  private classFilter?: ClassType;
  private subjectFilter?: SubjectType;
  private membershipFilter: MembershipFilterState = 'any';
  private membershipActiveDate?: Date;
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

  class(classType?: ClassType | null): this {
    if (classType) {
      this.classFilter = classType;
    }
    return this;
  }

  subject(subjectType?: SubjectType | null): this {
    if (subjectType) {
      this.subjectFilter = subjectType;
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
      this.minAverageScore !== undefined
      && this.maxAverageScore !== undefined
      && this.minAverageScore > this.maxAverageScore
    ) {
      const tmp = this.minAverageScore;
      this.minAverageScore = this.maxAverageScore;
      this.maxAverageScore = tmp;
    }
    return this;
  }

  sort(sortField?: string, order: 'ASC' | 'DESC' = 'DESC'): this {
    if (isSortFieldKey(sortField)) {
      this.sortField = SORT_FIELD_MAP[sortField];
    } else {
      this.sortField = SORT_FIELD_MAP.created_at;
    }
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

  build(): StudentQueryBuildResult {
    const matchStage: Record<string, any> = {};

    if (this.nameFilter) {
      matchStage.name = { $regex: this.nameFilter, $options: 'i' };
    }

    if (this.ageFilter.min !== undefined || this.ageFilter.max !== undefined) {
      const ageCondition: Record<string, number> = {};
      if (this.ageFilter.min !== undefined) {
        ageCondition.$gte = this.ageFilter.min;
      }
      if (this.ageFilter.max !== undefined) {
        ageCondition.$lte = this.ageFilter.max;
      }
      matchStage.age = ageCondition;
    }

    if (this.classFilter) {
      matchStage.class = this.classFilter;
    }

    if (this.subjectFilter) {
      matchStage.subject = this.subjectFilter;
    }

    if (this.membershipFilter === 'withMembership') {
      matchStage.membershipStartDate = { $ne: null };
      matchStage.membershipEndDate = { $ne: null };
    } else if (this.membershipFilter === 'withoutMembership') {
      matchStage.$or = [
        { membershipStartDate: null },
        { membershipEndDate: null },
      ];
    }

    const exprConditions: any[] = [];

    if (this.membershipActiveDate) {
      exprConditions.push({ $ne: ['$membershipStartDate', null] });
      exprConditions.push({ $ne: ['$membershipEndDate', null] });
      exprConditions.push({ $lte: ['$membershipStartDate', this.membershipActiveDate] });
      exprConditions.push({ $gte: ['$membershipEndDate', this.membershipActiveDate] });
    }

    const stages: any[] = [];

    if (this.scoreFilterActive) {
      stages.push({
        $addFields: {
          avgScore: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$rings', []] } }, 0] },
              then: { $round: [{ $avg: '$rings' }, 1] },
              else: 0,
            },
          },
        },
      });

      const avgCondition: Record<string, number> = {};
      if (this.minAverageScore !== undefined) {
        avgCondition.$gte = this.minAverageScore;
      }
      if (this.maxAverageScore !== undefined) {
        avgCondition.$lte = this.maxAverageScore;
      }
      if (Object.keys(avgCondition).length > 0) {
        matchStage.avgScore = avgCondition;
      }
    }

    if (Object.keys(matchStage).length > 0 || exprConditions.length > 0) {
      const matchQuery: Record<string, any> = {};
      if (Object.keys(matchStage).length > 0) {
        Object.assign(matchQuery, matchStage);
      }
      if (exprConditions.length > 0) {
        matchQuery.$expr = exprConditions.length === 1 ? exprConditions[0] : { $and: exprConditions };
      }
      stages.push({ $match: matchQuery });
    }

    const corePipeline = [...stages];

    const sortDefinition: Record<string, 1 | -1> = { [this.sortField]: this.sortOrder };
    const sortStage = { $sort: sortDefinition };
    const paginationStages: any[] = [sortStage];

    const skip = (this.page - 1) * this.limit;
    if (skip > 0) {
      paginationStages.push({ $skip: skip });
    }
    paginationStages.push({ $limit: this.limit });

    const pipeline = [...corePipeline, ...paginationStages];

    if (this.scoreFilterActive) {
      pipeline.push({ $project: { avgScore: 0 } });
    }

    const countPipeline = [...corePipeline, { $count: 'count' }];

    return {
      pipeline,
      countPipeline,
      page: this.page,
      limit: this.limit,
    };
  }
}

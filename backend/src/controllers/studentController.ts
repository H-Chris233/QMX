import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Student, 
  Cash,
  ClassType, 
  SubjectType,
  IStudent,
  IStudentSearchOptions,
  IApiResponse,
  IPaginatedResponse
} from '@/models';
import { catchAsync } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

// 学员控制器
export class StudentController {
  // 获取所有学员
  public getAllStudents = catchAsync(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
      name_contains,
      min_age,
      max_age,
      min_score,
      max_score,
      class_type,
      subject,
      has_membership,
    } = req.query as any;

    const offset = (Number(page) - 1) * Number(limit);
    
    // 构建查询条件
    const whereCondition: any = {};

    // 姓名模糊搜索
    if (name_contains) {
      whereCondition.name = {
        [Op.like]: `%${name_contains}%`,
      };
    }

    // 年龄范围筛选
    if (min_age !== undefined || max_age !== undefined) {
      whereCondition.age = {};
      if (min_age !== undefined && min_age !== null) {
        whereCondition.age[Op.gte] = Number(min_age);
      }
      if (max_age !== undefined && max_age !== null) {
        whereCondition.age[Op.lte] = Number(max_age);
      }
    }

    // 班级类型筛选
    if (class_type && Object.values(ClassType).includes(class_type)) {
      whereCondition.class = class_type;
    }

    // 科目筛选
    if (subject && Object.values(SubjectType).includes(subject)) {
      whereCondition.subject = subject;
    }

    // 会员状态筛选
    if (has_membership !== undefined && has_membership !== null) {
      if (has_membership === 'true') {
        whereCondition[Op.and] = [
          {
            membership_start_date: {
              [Op.not]: null,
            },
          },
          {
            membership_end_date: {
              [Op.not]: null,
            },
          },
          {
            membership_start_date: {
              [Op.lte]: new Date(),
            },
          },
          {
            membership_end_date: {
              [Op.gte]: new Date(),
            },
          },
        ];
      } else {
        whereCondition[Op.or] = [
          {
            membership_start_date: null,
          },
          {
            membership_end_date: null,
          },
          {
            membership_end_date: {
              [Op.lt]: new Date(),
            },
          },
        ];
      }
    }

    // 执行查询
    const { count, rows: students } = await Student.findAndCountAll({
      where: whereCondition,
      limit: Number(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      include: [
        {
          model: Cash,
          as: 'cashTransactions',
          attributes: ['uid', 'cash', 'created_at'],
        },
      ],
    });

    // 成绩筛选（在内存中处理，因为rings是JSON字段）
    let filteredStudents = students;
    if (min_score !== undefined && min_score !== null) {
      filteredStudents = filteredStudents.filter(student => 
        student.rings.some(score => score >= Number(min_score))
      );
    }
    if (max_score !== undefined && max_score !== null) {
      filteredStudents = filteredStudents.filter(student => 
        student.rings.some(score => score <= Number(max_score))
      );
    }

    // 构建响应数据
    const responseData = filteredStudents.map(student => ({
      uid: student.uid,
      name: student.name,
      age: student.age,
      class: student.class,
      subject: student.subject,
      phone: student.phone,
      rings: student.rings,
      note: student.note,
      lesson_left: student.lesson_left,
      membership_start_date: student.membership_start_date,
      membership_end_date: student.membership_end_date,
      is_membership_active: student.hasMembership(),
      membership_days_remaining: student.getMembershipDaysRemaining(),
      cash: student.cashTransactions?.reduce((sum, transaction) => sum + transaction.cash, 0) || 0,
      created_at: student.createdAt,
      updated_at: student.updatedAt,
    }));

    const paginationResponse: IPaginatedResponse<any> = {
      data: responseData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Array.isArray(students) ? students.length : count,
        total_pages: Math.ceil(count / Number(limit)),
      },
    };

    const response: IApiResponse<typeof paginationResponse> = {
      success: true,
      data: paginationResponse,
    };

    logger.info(`获取学员列表成功，共 ${count} 条记录`);
    res.json(response);
  });

  // 根据ID获取学员详情
  public getStudentById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const student = await Student.findByPk(Number(id), {
      include: [
        {
          model: Cash,
          as: 'cashTransactions',
          order: [['created_at', 'DESC']],
        },
      ],
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: '学员不存在',
      });
    }

    const responseData = {
      uid: student.uid,
      name: student.name,
      age: student.age,
      class: student.class,
      subject: student.subject,
      phone: student.phone,
      rings: student.rings,
      note: student.note,
      lesson_left: student.lesson_left,
      membership_start_date: student.membership_start_date,
      membership_end_date: student.membership_end_date,
      is_membership_active: student.hasMembership(),
      membership_days_remaining: student.getMembershipDaysRemaining(),
      cash: student.cashTransactions?.reduce((sum, transaction) => sum + transaction.cash, 0) || 0,
      cash_transactions: student.cashTransactions?.map(transaction => ({
        uid: transaction.uid,
        amount: transaction.cash,
        note: transaction.note,
        created_at: transaction.createdAt,
      })) || [],
      created_at: student.createdAt,
      updated_at: student.updatedAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`获取学员详情成功，UID: ${student.uid}`);
    return res.json(response);
  });

  // 创建新学员
  public createStudent = catchAsync(async (req: Request, res: Response) => {
    const {
      name,
      age,
      class: classType,
      phone,
      note = '',
      subject,
    } = req.body;

    // 检查手机号是否已存在
    const existingStudent = await Student.findOne({
      where: { phone },
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        error: '手机号已存在',
      });
    }

    const student = await Student.create({
      name: name.trim(),
      age: age ? Number(age) : null,
      class: classType || ClassType.OTHERS,
      phone: phone.trim() || '未填写',
      note: note?.trim() || '',
      subject: subject || SubjectType.OTHERS,
      lesson_left: null,
      membership_start_date: null,
      membership_end_date: null,
      rings: [],
    });

    const responseData = {
      uid: student.uid,
      name: student.name,
      age: student.age,
      class: student.class,
      subject: student.subject,
      phone: student.phone,
      rings: student.rings,
      note: student.note,
      lesson_left: student.lesson_left,
      membership_start_date: student.membership_start_date,
      membership_end_date: student.membership_end_date,
      is_membership_active: student.hasMembership(),
      membership_days_remaining: student.getMembershipDaysRemaining(),
      cash: 0,
      created_at: student.createdAt,
      updated_at: student.updatedAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '学员创建成功',
    };

    logger.info(`创建新学员成功，UID: ${student.uid}, 姓名: ${student.name}`);
    return res.status(201).json(response);
  });

  // 更新学员信息
  public updateStudent = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      return res.status(404).json({
        success: false,
        error: '学员不存在',
      });
    }

    // 检查手机号是否已被其他学员使用
    if (updates.phone && updates.phone !== student.phone) {
      const existingStudent = await Student.findOne({
        where: { 
          phone: updates.phone,
          uid: { [Op.ne]: Number(id) },
        },
      });

      if (existingStudent) {
        return res.status(400).json({
          success: false,
          error: '手机号已被其他学员使用',
        });
      }
    }

    // 更新字段
    const allowedUpdates = [
      'name', 'age', 'class', 'phone', 'note', 'subject', 'lesson_left',
      'membership_start_date', 'membership_end_date'
    ];

    const updateData: any = {};
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        if (key === 'name' || key === 'phone' || key === 'note') {
          updateData[key] = updates[key]?.trim();
        } else if (key === 'age' || key === 'lesson_left') {
          updateData[key] = updates[key] ? Number(updates[key]) : null;
        } else {
          updateData[key] = updates[key];
        }
      }
    }

    await student.update(updateData);

    const responseData = {
      uid: student.uid,
      name: student.name,
      age: student.age,
      class: student.class,
      subject: student.subject,
      phone: student.phone,
      rings: student.rings,
      note: student.note,
      lesson_left: student.lesson_left,
      membership_start_date: student.membership_start_date,
      membership_end_date: student.membership_end_date,
      is_membership_active: student.hasMembership(),
      membership_days_remaining: student.getMembershipDaysRemaining(),
      cash: 0, // 这里简化处理，实际应该查询
      created_at: student.createdAt,
      updated_at: student.updatedAt,
    };

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      message: '学员信息更新成功',
    };

    logger.info(`更新学员信息成功，UID: ${student.uid}`);
    return res.json(response);
  });

  // 删除学员
  public deleteStudent = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    const student = await Student.findByPk(Number(id));

    if (!student) {
      return res.status(404).json({
        success: false,
        error: '学员不存在',
      });
    }

    // 检查是否有关联的交易记录
    const cashCount = await Cash.count({
      where: { student_id: Number(id) },
    });

    if (cashCount > 0) {
      return res.status(400).json({
        success: false,
        error: `该学员有 ${cashCount} 条关联的交易记录，无法删除`,
      });
    }

    await student.destroy();

    const response: IApiResponse = {
      success: true,
      message: '学员删除成功',
    };

    logger.info(`删除学员成功，UID: ${student.uid}, 姓名: ${student.name}`);
    return res.json(response);
  });

  // 搜索学员（高级搜索）
  public searchStudents = catchAsync(async (req: Request, res: Response) => {
    const searchOptions: IStudentSearchOptions = req.query;

    // 构建查询条件
    const whereCondition: any = {};

    if (searchOptions.name_contains) {
      whereCondition.name = { [Op.like]: `%${searchOptions.name_contains}%` };
    }

    if (searchOptions.min_age !== undefined && searchOptions.min_age !== null) {
      whereCondition.age = { [Op.gte]: Number(searchOptions.min_age) };
    }

    if (searchOptions.max_age !== undefined && searchOptions.max_age !== null) {
      whereCondition.age = { ...whereCondition.age, [Op.lte]: Number(searchOptions.max_age) };
    }

    if (searchOptions.class_type) {
      whereCondition.class = searchOptions.class_type;
    }

    if (searchOptions.subject) {
      whereCondition.subject = searchOptions.subject;
    }

    // 会员状态筛选
    if (searchOptions.has_membership !== undefined && searchOptions.has_membership !== null) {
      if (searchOptions.has_membership) {
        whereCondition[Op.and] = [
          { membership_start_date: { [Op.not]: null } },
          { membership_end_date: { [Op.not]: null } },
          { membership_start_date: { [Op.lte]: new Date() } },
          { membership_end_date: { [Op.gte]: new Date() } },
        ];
      } else {
        whereCondition[Op.or] = [
          { membership_start_date: null },
          { membership_end_date: null },
          { membership_end_date: { [Op.lt]: new Date() } },
        ];
      }
    }

    const students = await Student.findAll({
      where: whereCondition,
      order: [[searchOptions.sort_by || 'created_at', searchOptions.sort_order || 'DESC']],
      limit: searchOptions.limit ? Number(searchOptions.limit) : undefined,
    });

    // 成绩筛选
    let filteredStudents = students;
    if (searchOptions.min_score !== undefined && searchOptions.min_score !== null) {
      filteredStudents = filteredStudents.filter(student =>
        student.rings.some(score => score >= Number(searchOptions.min_score))
      );
    }

    if (searchOptions.max_score !== undefined && searchOptions.max_score !== null) {
      filteredStudents = filteredStudents.filter(student =>
        student.rings.some(score => score <= Number(searchOptions.max_score))
      );
    }

    const responseData = filteredStudents.map(student => ({
      uid: student.uid,
      name: student.name,
      age: student.age,
      class: student.class,
      subject: student.subject,
      phone: student.phone,
      rings: student.rings,
      note: student.note,
      lesson_left: student.lesson_left,
      membership_start_date: student.membership_start_date,
      membership_end_date: student.membership_end_date,
      is_membership_active: student.hasMembership(),
      membership_days_remaining: student.getMembershipDaysRemaining(),
      created_at: student.createdAt,
      updated_at: student.updatedAt,
    }));

    const response: IApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
    };

    logger.info(`搜索学员完成，找到 ${responseData.length} 条记录`);
    return res.json(response);
  });
}

export default new StudentController();
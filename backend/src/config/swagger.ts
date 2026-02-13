import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Swagger/OpenAPI 配置
 * 用于自动生成 API 文档
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'QMX 启明星学生管理系统 API',
      version: '0.15.0',
      description: `
教育培训机构学生管理系统后端 API 文档。

## 功能模块
- **学员管理** - 学员信息的增删改查
- **成绩管理** - 学员成绩记录和统计
- **交易管理** - 收费记录和财务管理
- **分期付款** - 分期计划和支付管理
- **会员管理** - 会员状态和权益管理
- **统计数据** - 各类统计报表

## 响应格式
所有 API 响应遵循统一格式：
\`\`\`json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
\`\`\`

## 错误处理
错误响应格式：
\`\`\`json
{
  "success": false,
  "error": "错误描述"
}
\`\`\`
      `,
      contact: {
        name: 'QMX Support',
        email: 'support@qmx.local',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: '开发服务器',
      },
      {
        url: '/api/v1',
        description: '相对路径（生产环境）',
      },
    ],
    tags: [
      { name: 'Health', description: '健康检查 - 服务状态监控' },
      { name: 'Auth', description: '认证管理 - 密码设置和验证' },
      { name: 'Students', description: '学员管理 - 学员信息 CRUD' },
      { name: 'Scores', description: '成绩管理 - 学员成绩记录' },
      { name: 'Transactions', description: '交易管理 - 收费和财务记录' },
      { name: 'Installments', description: '分期付款 - 分期计划管理' },
      { name: 'Membership', description: '会员管理 - 会员状态和权益' },
      { name: 'Stats', description: '统计数据 - 各类统计报表' },
      { name: 'Adapter', description: '数据库适配器 - 数据库状态' },
    ],
    components: {
      schemas: {
        // 通用响应格式
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '操作是否成功',
              example: true,
            },
            data: {
              description: '响应数据',
            },
            message: {
              type: 'string',
              description: '操作消息',
              example: '操作成功',
            },
            error: {
              type: 'string',
              description: '错误信息（失败时）',
              example: '参数无效',
            },
          },
          required: ['success'],
        },

        // 分页信息
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: '当前页码',
              example: 1,
            },
            limit: {
              type: 'integer',
              description: '每页数量',
              example: 20,
            },
            total: {
              type: 'integer',
              description: '总记录数',
              example: 100,
            },
            total_pages: {
              type: 'integer',
              description: '总页数',
              example: 5,
            },
          },
        },

        // 分页响应
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {},
            },
            pagination: {
              $ref: '#/components/schemas/Pagination',
            },
          },
        },

        // 学员性别枚举
        Gender: {
          type: 'string',
          enum: ['男', '女', '其他'],
          description: '性别',
          example: '男',
        },

        // 学员状态枚举
        StudentStatus: {
          type: 'string',
          enum: ['active', 'inactive', 'graduated', 'suspended'],
          description: '学员状态',
          example: 'active',
        },

        // 交易类型枚举
        TransactionType: {
          type: 'string',
          enum: ['income', 'expense', 'refund'],
          description: '交易类型',
          example: 'income',
        },

        // 支付方式枚举
        PaymentMethod: {
          type: 'string',
          enum: ['cash', 'wechat', 'alipay', 'bank_transfer', 'credit_card', 'other'],
          description: '支付方式',
          example: 'wechat',
        },

        // 会员类型枚举
        MembershipType: {
          type: 'string',
          enum: ['none', 'monthly', 'quarterly', 'yearly', 'lifetime'],
          description: '会员类型',
          example: 'monthly',
        },

        // 分期状态枚举
        InstallmentStatus: {
          type: 'string',
          enum: ['pending', 'paid', 'overdue', 'cancelled'],
          description: '分期状态',
          example: 'pending',
        },

        // 健康状态
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2026-02-13T10:00:00.000Z',
            },
            uptime: {
              type: 'number',
              description: '服务运行时间（秒）',
              example: 3600,
            },
            environment: {
              type: 'string',
              example: 'development',
            },
            version: {
              type: 'string',
              example: '0.15.0',
            },
            database: {
              type: 'string',
              example: 'postgresql',
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'connected',
                    },
                    responseTime: {
                      type: 'number',
                      example: 5,
                    },
                  },
                },
                api: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'healthy',
                    },
                    responseTime: {
                      type: 'number',
                      example: 0,
                    },
                  },
                },
              },
            },
          },
        },

        // 认证状态
        AuthStatus: {
          type: 'object',
          properties: {
            hasPassword: {
              type: 'boolean',
              description: '是否已设置密码',
              example: true,
            },
            isFirstVisit: {
              type: 'boolean',
              description: '是否首次访问',
              example: false,
            },
            adminConfigured: {
              type: 'boolean',
              description: '是否配置了管理员',
              example: true,
            },
          },
        },

        // 学员基本信息
        Student: {
          type: 'object',
          properties: {
            uid: {
              type: 'integer',
              minimum: 1,
              description: '学员唯一标识',
              example: 123,
            },
            name: {
              type: 'string',
              description: '学员姓名',
              example: '张三',
            },
            gender: {
              $ref: '#/components/schemas/Gender',
            },
            phone: {
              type: 'string',
              description: '联系电话',
              example: '13800138000',
            },
            school: {
              type: 'string',
              description: '学校',
              example: '第一中学',
            },
            grade: {
              type: 'string',
              description: '年级',
              example: '高一',
            },
            status: {
              $ref: '#/components/schemas/StudentStatus',
            },
            membership_type: {
              $ref: '#/components/schemas/MembershipType',
            },
            membership_end_date: {
              type: 'string',
              format: 'date',
              description: '会员到期日期',
              example: '2026-12-31',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: '更新时间',
            },
          },
        },

        // 创建学员请求
        CreateStudentRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              description: '学员姓名',
              example: '张三',
            },
            gender: {
              $ref: '#/components/schemas/Gender',
            },
            phone: {
              type: 'string',
              description: '联系电话',
              example: '13800138000',
            },
            school: {
              type: 'string',
              description: '学校',
              example: '第一中学',
            },
            grade: {
              type: 'string',
              description: '年级',
              example: '高一',
            },
          },
        },

        // 交易记录
        Transaction: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              format: 'uuid',
              description: '交易唯一标识',
            },
            student_uid: {
              type: 'string',
              format: 'uuid',
              description: '关联学员 ID',
            },
            type: {
              $ref: '#/components/schemas/TransactionType',
            },
            amount_cents: {
              type: 'integer',
              description: '金额（分）',
              example: 10000,
            },
            payment_method: {
              $ref: '#/components/schemas/PaymentMethod',
            },
            description: {
              type: 'string',
              description: '交易描述',
              example: '月度课程费用',
            },
            transaction_date: {
              type: 'string',
              format: 'date',
              description: '交易日期',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },

        // 分期计划
        InstallmentPlan: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              format: 'uuid',
            },
            student_uid: {
              type: 'string',
              format: 'uuid',
            },
            total_amount_cents: {
              type: 'integer',
              description: '总金额（分）',
            },
            installment_count: {
              type: 'integer',
              description: '分期数',
            },
            paid_count: {
              type: 'integer',
              description: '已支付期数',
            },
            status: {
              $ref: '#/components/schemas/InstallmentStatus',
            },
          },
        },

        // 成绩记录
        Score: {
          type: 'object',
          properties: {
            uid: {
              type: 'string',
              format: 'uuid',
            },
            student_uid: {
              type: 'string',
              format: 'uuid',
            },
            subject: {
              type: 'string',
              description: '科目',
              example: '数学',
            },
            score: {
              type: 'number',
              description: '分数',
              example: 95.5,
            },
            max_score: {
              type: 'number',
              description: '满分',
              example: 100,
            },
            exam_date: {
              type: 'string',
              format: 'date',
              description: '考试日期',
            },
            remark: {
              type: 'string',
              description: '备注',
            },
          },
        },

        // 统计数据
        DashboardStats: {
          type: 'object',
          properties: {
            total_students: {
              type: 'integer',
              description: '总学员数',
            },
            total_revenue_cents: {
              type: 'integer',
              description: '总收入（分）',
            },
            total_expense_cents: {
              type: 'integer',
              description: '总支出（分）',
            },
            net_income_cents: {
              type: 'integer',
              description: '净收入（分）',
            },
            average_score: {
              type: 'number',
              description: '平均分',
            },
            max_score: {
              type: 'number',
              description: '最高分',
            },
            active_courses: {
              type: 'integer',
              description: '活跃课程数',
            },
            active_members: {
              type: 'integer',
              description: '有效会员数',
            },
            active_installment_plans: {
              type: 'integer',
              description: '活跃分期计划数',
            },
            overdue_installment_count: {
              type: 'integer',
              description: '逾期分期数量',
            },
          },
        },
      },

      // 通用响应定义
      responses: {
        NotFound: {
          description: '资源未找到',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  error: {
                    type: 'string',
                    example: '资源不存在',
                  },
                },
              },
            },
          },
        },
        ValidationError: {
          description: '参数验证失败',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  error: {
                    type: 'string',
                    example: '参数无效',
                  },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string',
                        },
                        message: {
                          type: 'string',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: '未授权',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  error: {
                    type: 'string',
                    example: '密码错误',
                  },
                },
              },
            },
          },
        },
        ServerError: {
          description: '服务器内部错误',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  error: {
                    type: 'string',
                    example: '服务器内部错误',
                  },
                },
              },
            },
          },
        },
      },

      // 查询参数
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: '页码（从 1 开始）',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: '每页数量',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
        SearchParam: {
          name: 'search',
          in: 'query',
          description: '搜索关键词',
          schema: {
            type: 'string',
          },
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          description: '排序字段',
          schema: {
            type: 'string',
          },
        },
        OrderParam: {
          name: 'sort_order',
          in: 'query',
          description: '排序方向',
          schema: {
            type: 'string',
            enum: ['ASC', 'DESC'],
            default: 'DESC',
          },
        },
      },
    },
  },
  // 扫描路由文件中的 JSDoc 注释
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

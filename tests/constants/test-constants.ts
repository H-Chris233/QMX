/**
 * 测试常量
 * 定义测试中使用的常量值
 */

/**
 * API 相关常量
 */
export const API_CONSTANTS = {
  BASE_URL: 'http://localhost:3001/api/v1',
  TIMEOUT: 10000,
  RETRY_COUNT: 3,
} as const;

/**
 * 测试数据常量
 */
export const TEST_DATA = {
  STUDENT_COUNT: 20,
  PAGE_SIZE: 10,
  CURRENT_PAGE: 1,
  TOTAL_PAGES: 2,
  MOCK_STUDENT_ID: 1,
  MOCK_TRANSACTION_ID: 1,
  MOCK_INSTALLMENT_ID: 1,
} as const;

/**
 * 表单验证常量
 */
export const VALIDATION_CONSTANTS = {
  MIN_AGE: 1,
  MAX_AGE: 120,
  PHONE_PATTERN: /^1[3-9]\d{9}$/,
  MAX_NOTE_LENGTH: 500,
  MIN_LESSON_LEFT: 0,
  MAX_LESSON_LEFT: 1000,
} as const;

/**
 * 成员状态常量
 */
export const MEMBERSHIP_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  EXPIRED: 'Expired',
  NONE: 'None',
} as const;

/**
 * 课程类型常量
 */
export const CLASS_TYPES = {
  MONTH: 'Month',
  YEAR: 'Year',
  TRIAL: 'Trial',
} as const;

/**
 * 科目常量
 */
export const SUBJECTS = {
  SHOOTING: 'Shooting',
  ARCHERY: 'Archery',
} as const;

/**
 * 交易类型常量
 */
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;

/**
 * 分期状态常量
 */
export const INSTALLMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
} as const;

/**
 * 错误消息常量
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error',
  PERMISSION_DENIED: 'Permission denied',
  STUDENT_NOT_FOUND: '学员不存在',
  SERVER_ERROR: '服务器内部错误',
  VALIDATION_ERROR: '数据验证失败',
  TIMEOUT_ERROR: '请求超时',
  DATABASE_ERROR: '数据库连接失败',
  RATE_LIMIT_ERROR: '请求过于频繁，请稍后重试',
  CONFLICT_ERROR: '数据已被其他用户修改，请刷新后重试',
} as const;

/**
 * 成功消息常量
 */
export const SUCCESS_MESSAGES = {
  STUDENT_ADDED: '学员添加成功',
  STUDENT_UPDATED: '学员信息更新成功',
  STUDENT_DELETED: '学员删除成功',
  TRANSACTION_ADDED: '交易记录添加成功',
  INSTALLMENT_ADDED: '分期计划添加成功',
  DATA_EXPORTED: '数据导出成功',
} as const;

/**
 * 测试选择器常量
 */
export const SELECTORS = {
  // 学生管理
  STUDENT_CARD: '.student-card',
  STUDENT_NAME: '.student-name',
  STUDENT_PHONE: '.student-phone',
  STUDENT_SUBJECT: '.student-subject',
  STUDENT_CLASS: '.student-class',
  STUDENT_MEMBERSHIP: '.student-membership',
  
  // 表单
  FORM_INPUT: '.form-input',
  FORM_SELECT: '.form-select',
  FORM_TEXTAREA: '.form-textarea',
  FORM_SUBMIT: '.form-submit',
  FORM_CANCEL: '.form-cancel',
  
  // 分页
  PAGINATION: '.pagination',
  PAGE_INFO: '.page-info',
  PAGE_BUTTON: '.page-btn',
  PREV_BUTTON: '.prev-btn',
  NEXT_BUTTON: '.next-btn',
  
  // 搜索和筛选
  SEARCH_INPUT: '.search-input',
  SEARCH_BUTTON: '.search-btn',
  FILTER_SELECT: '.filter-select',
  FILTER_BUTTON: '.filter-btn',
  
  // 操作按钮
  ADD_BUTTON: '.add-btn',
  EDIT_BUTTON: '.edit-btn',
  DELETE_BUTTON: '.delete-btn',
  EXPORT_BUTTON: '.export-btn',
  IMPORT_BUTTON: '.import-btn',
  
  // 模态框
  MODAL: '.modal',
  MODAL_TITLE: '.modal-title',
  MODAL_CONTENT: '.modal-content',
  MODAL_CONFIRM: '.modal-confirm',
  MODAL_CANCEL: '.modal-cancel',
  
  // 错误和成功消息
  ERROR_MESSAGE: '.error-message',
  SUCCESS_MESSAGE: '.success-message',
  WARNING_MESSAGE: '.warning-message',
  
  // 加载状态
  LOADING_SPINNER: '.loading-spinner',
  LOADING_TEXT: '.loading-text',
  
  // 空状态
  EMPTY_STATE: '.empty-state',
  EMPTY_ICON: '.empty-icon',
  EMPTY_TEXT: '.empty-text',
  
  // 数据显示
  DATA_TABLE: '.data-table',
  DATA_ROW: '.data-row',
  DATA_CELL: '.data-cell',
  
  // 统计信息
  STATS_CONTAINER: '.stats-container',
  STAT_ITEM: '.stat-item',
  STAT_VALUE: '.stat-value',
  STAT_LABEL: '.stat-label',
} as const;

/**
 * 测试超时常量
 */
export const TIMEOUT_CONSTANTS = {
  DEFAULT: 5000,
  LONG: 10000,
  SHORT: 1000,
  IMMEDIATE: 0,
} as const;

/**
 * 测试日期常量
 */
export const TEST_DATES = {
  FIXED_DATE: '2024-01-01T00:00:00.000Z',
  FIXED_DATE_ONLY: '2024-01-01',
  FUTURE_DATE: '2024-12-31',
  PAST_DATE: '2023-01-01',
  MEMBERSHIP_START: '2024-01-01',
  MEMBERSHIP_END: '2024-12-31',
  EXPIRED_MEMBERSHIP: '2023-12-31',
} as const;

/**
 * 测试用户数据
 */
export const TEST_USERS = {
  ADMIN: {
    id: 1,
    name: '管理员',
    email: 'admin@test.com',
    role: 'admin',
  },
  TEACHER: {
    id: 2,
    name: '教师',
    email: 'teacher@test.com',
    role: 'teacher',
  },
  STUDENT: {
    id: 3,
    name: '学生',
    email: 'student@test.com',
    role: 'student',
  },
} as const;

/**
 * 测试环境配置
 */
export const TEST_CONFIG = {
  MOCK_TIMER: true,
  SUPPRESS_CONSOLE: true,
  AUTO_CLEANUP: true,
  ISOLATE_TESTS: true,
  PARALLEL_TESTS: true,
} as const;

/**
 * 性能测试常量
 */
export const PERFORMANCE_CONSTANTS = {
  MAX_RESPONSE_TIME: 1000,
  MAX_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  MAX_CPU_USAGE: 80, // 80%
} as const;

/**
 * 可访问性测试常量
 */
export const A11Y_CONSTANTS = {
  MIN_CONTRAST_RATIO: 4.5,
  MIN_TOUCH_TARGET_SIZE: 44, // 44px
  MAX_TAB_INDEX: 1000,
} as const;
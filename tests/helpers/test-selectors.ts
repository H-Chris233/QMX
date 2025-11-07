/**
 * 测试选择器辅助
 * 提供统一的data-testid选择器和查询工具
 */

import { testId } from '../factories/utils';

/**
 * 常用组件的测试ID
 */
export const TestIds = {
  // 通用组件
  modal: 'modal',
  modalClose: 'modal-close',
  modalConfirm: 'modal-confirm',
  modalCancel: 'modal-cancel',
  loadingSpinner: 'loading-spinner',
  errorMessage: 'error-message',
  successMessage: 'success-message',

  // 学员管理
  studentList: 'student-list',
  studentItem: 'student-item',
  studentForm: 'student-form',
  studentName: 'student-name',
  studentPhone: 'student-phone',
  studentAge: 'student-age',
  studentClass: 'student-class',
  studentSubject: 'student-subject',
  studentSearchInput: 'student-search-input',
  studentSearchButton: 'student-search-button',
  studentAddButton: 'student-add-button',
  studentEditButton: 'student-edit-button',
  studentDeleteButton: 'student-delete-button',
  studentSubmitButton: 'student-submit-button',

  // 交易管理
  transactionList: 'transaction-list',
  transactionItem: 'transaction-item',
  transactionForm: 'transaction-form',
  transactionAmount: 'transaction-amount',
  transactionNote: 'transaction-note',
  transactionStudentId: 'transaction-student-id',
  transactionAddButton: 'transaction-add-button',
  transactionSubmitButton: 'transaction-submit-button',

  // 分期管理
  installmentList: 'installment-list',
  installmentItem: 'installment-item',
  installmentPlanForm: 'installment-plan-form',
  installmentPlanList: 'installment-plan-list',
  installmentPayButton: 'installment-pay-button',

  // 统计面板
  dashboard: 'dashboard',
  dashboardStats: 'dashboard-stats',
  totalRevenue: 'total-revenue',
  activeStudents: 'active-students',
  averageGrade: 'average-grade',

  // 导航
  navHome: 'nav-home',
  navStudents: 'nav-students',
  navTransactions: 'nav-transactions',
  navInstallments: 'nav-installments',
  navStats: 'nav-stats',

  // 分页
  pagination: 'pagination',
  paginationPrev: 'pagination-prev',
  paginationNext: 'pagination-next',
  paginationPage: 'pagination-page',

  // 表格
  table: 'table',
  tableHead: 'table-head',
  tableBody: 'table-body',
  tableRow: 'table-row',
  tableCell: 'table-cell',
} as const;

/**
 * 生成测试ID选择器
 */
export const Selectors = {
  /**
   * 通用选择器
   */
  byTestId: (id: string) => testId(id),
  
  /**
   * 学员相关选择器
   */
  student: {
    list: () => testId(TestIds.studentList),
    item: (uid?: number) => uid ? testId(`${TestIds.studentItem}-${uid}`) : testId(TestIds.studentItem),
    form: () => testId(TestIds.studentForm),
    nameInput: () => testId(TestIds.studentName),
    phoneInput: () => testId(TestIds.studentPhone),
    ageInput: () => testId(TestIds.studentAge),
    classSelect: () => testId(TestIds.studentClass),
    subjectSelect: () => testId(TestIds.studentSubject),
    searchInput: () => testId(TestIds.studentSearchInput),
    searchButton: () => testId(TestIds.studentSearchButton),
    addButton: () => testId(TestIds.studentAddButton),
    editButton: (uid?: number) => uid ? testId(`${TestIds.studentEditButton}-${uid}`) : testId(TestIds.studentEditButton),
    deleteButton: (uid?: number) => uid ? testId(`${TestIds.studentDeleteButton}-${uid}`) : testId(TestIds.studentDeleteButton),
    submitButton: () => testId(TestIds.studentSubmitButton),
  },

  /**
   * 交易相关选择器
   */
  transaction: {
    list: () => testId(TestIds.transactionList),
    item: (uid?: number) => uid ? testId(`${TestIds.transactionItem}-${uid}`) : testId(TestIds.transactionItem),
    form: () => testId(TestIds.transactionForm),
    amountInput: () => testId(TestIds.transactionAmount),
    noteInput: () => testId(TestIds.transactionNote),
    studentIdInput: () => testId(TestIds.transactionStudentId),
    addButton: () => testId(TestIds.transactionAddButton),
    submitButton: () => testId(TestIds.transactionSubmitButton),
  },

  /**
   * 分期相关选择器
   */
  installment: {
    list: () => testId(TestIds.installmentList),
    item: (uid?: number) => uid ? testId(`${TestIds.installmentItem}-${uid}`) : testId(TestIds.installmentItem),
    planForm: () => testId(TestIds.installmentPlanForm),
    planList: () => testId(TestIds.installmentPlanList),
    payButton: (uid?: number) => uid ? testId(`${TestIds.installmentPayButton}-${uid}`) : testId(TestIds.installmentPayButton),
  },

  /**
   * 统计面板选择器
   */
  dashboard: {
    root: () => testId(TestIds.dashboard),
    stats: () => testId(TestIds.dashboardStats),
    totalRevenue: () => testId(TestIds.totalRevenue),
    activeStudents: () => testId(TestIds.activeStudents),
    averageGrade: () => testId(TestIds.averageGrade),
  },

  /**
   * 通用UI组件选择器
   */
  modal: {
    root: () => testId(TestIds.modal),
    close: () => testId(TestIds.modalClose),
    confirm: () => testId(TestIds.modalConfirm),
    cancel: () => testId(TestIds.modalCancel),
  },

  /**
   * 分页选择器
   */
  pagination: {
    root: () => testId(TestIds.pagination),
    prev: () => testId(TestIds.paginationPrev),
    next: () => testId(TestIds.paginationNext),
    page: (page: number) => testId(`${TestIds.paginationPage}-${page}`),
  },

  /**
   * 表格选择器
   */
  table: {
    root: () => testId(TestIds.table),
    head: () => testId(TestIds.tableHead),
    body: () => testId(TestIds.tableBody),
    row: (index?: number) => index !== undefined ? testId(`${TestIds.tableRow}-${index}`) : testId(TestIds.tableRow),
    cell: (row: number, col: number) => testId(`${TestIds.tableCell}-${row}-${col}`),
  },
} as const;

/**
 * 生成带数据属性的选择器
 */
export function dataAttr(attribute: string, value: string): string {
  return `[data-${attribute}='${value}']`;
}

/**
 * 生成角色选择器
 */
export function byRole(role: string): string {
  return `[role='${role}']`;
}

/**
 * 生成ARIA标签选择器
 */
export function byAriaLabel(label: string): string {
  return `[aria-label='${label}']`;
}

/**
 * 生成类名选择器
 */
export function byClass(className: string): string {
  return `.${className}`;
}

/**
 * 生成ID选择器
 */
export function byId(id: string): string {
  return `#${id}`;
}

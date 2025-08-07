// API服务 - 封装所有后端调用
export class ApiService {
  // 学员管理
  static async addStudent(name: string, age: number, classType: string, phone: string) {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('add_student', { 
        name, 
        age, 
        classType, 
        phone 
      })
    }
    throw new Error('Tauri API不可用')
  }

  static async getAllStudents() {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('get_all_students')
    }
    throw new Error('Tauri API不可用')
  }

  static async addScore(studentUid: number, score: number) {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('add_score', { 
        studentUid, 
        score 
      })
    }
    throw new Error('Tauri API不可用')
  }

  static async getStudentScores(studentUid: number) {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('get_student_scores', { 
        studentUid 
      })
    }
    throw new Error('Tauri API不可用')
  }

  static async updateStudentInfo(studentUid: number, updates: {
    name?: string
    age?: number
    classType?: string
    phone?: string
  }) {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('update_student_info', { 
        studentUid,
        name: updates.name,
        age: updates.age,
        classType: updates.classType,
        phone: updates.phone
      })
    }
    throw new Error('Tauri API不可用')
  }

  static async deleteStudent(studentUid: number) {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('delete_student', { 
        studentUid 
      })
    }
    throw new Error('Tauri API不可用')
  }

  // 财务管理
  static async addCashTransaction(studentUid: number | null, amount: number, description: string) {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('add_cash_transaction', { 
        studentUid, 
        amount, 
        description 
      })
    }
    throw new Error('Tauri API不可用')
  }

  static async getAllTransactions() {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('get_all_transactions')
    }
    throw new Error('Tauri API不可用')
  }

  static async deleteCashTransaction(transactionUid: number) {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('delete_cash_transaction', { 
        transactionUid 
      })
    }
    throw new Error('Tauri API不可用')
  }

  // 统计数据
  static async getDashboardStats() {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('get_dashboard_stats')
    }
    throw new Error('Tauri API不可用')
  }

  // 窗口管理
  static async openSettingsWindow() {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('open_settings_window')
    }
    throw new Error('Tauri API不可用')
  }

  static async openMainWindow() {
    if (window.__TAURI__) {
      const { invoke } = window.__TAURI__.tauri
      return await invoke('open_main_window')
    }
    throw new Error('Tauri API不可用')
  }
}

// 类型定义
export interface Student {
  uid: number
  name: string
  age: number
  class: string
  phone: string
  rings: number[]
  note: string
  cash: string
}

export interface Transaction {
  uid: number
  student_id: string
  amount: number
  description: string
}

export interface DashboardStats {
  total_students: number
  total_revenue: number
  total_expense: number
  average_score: number
  max_score: number
}
// API服务 - 封装所有后端调用
export class ApiService {
  // 检查 Tauri 环境的通用方法
  private static checkTauriEnvironment(): boolean {
    console.log('🔍 [ApiService] 检查 Tauri 环境...');
    console.log('🔍 [ApiService] window.__TAURI__ 存在:', !!window.__TAURI__);
    console.log('🔍 [ApiService] window 对象:', window);
    
    if (window.__TAURI__) {
      console.log('🔍 [ApiService] Tauri 环境检测通过');
      console.log('🔍 [ApiService] window.__TAURI__.tauri:', window.__TAURI__.tauri);
      console.log('🔍 [ApiService] invoke 函数可用:', typeof window.__TAURI__.tauri.invoke);
      return true;
    }
    
    console.error('❌ [ApiService] Tauri 环境不可用 - window.__TAURI__ 未定义');
    console.error('❌ [ApiService] 当前环境:', window.location.href);
    console.error('❌ [ApiService] 用户代理:', navigator.userAgent);
    return false;
  }

  // 学员管理
  static async addStudent(name: string, age: number, classType: string, phone: string) {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.addStudent] 调用 add_student 命令...');
      return await invoke('add_student', {
        name,
        age,
        classType,
        phone
      })
    }
    throw new Error('Tauri环境不可用')
  }

  static async getAllStudents() {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.getAllStudents] 调用 get_all_students 命令...');
      return await invoke('get_all_students')
    }
    throw new Error('Tauri环境不可用')
  }

  static async addScore(studentUid: number, score: number) {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.addScore] 调用 add_score 命令...');
      return await invoke('add_score', {
        studentUid,
        score
      })
    }
    throw new Error('Tauri环境不可用')
  }

  static async getStudentScores(studentUid: number) {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.getStudentScores] 调用 get_student_scores 命令...');
      return await invoke('get_student_scores', {
        studentUid
      })
    }
    throw new Error('Tauri环境不可用')
  }

  static async updateStudentInfo(studentUid: number, updates: {
    name?: string
    age?: number
    classType?: string
    phone?: string
  }) {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.updateStudentInfo] 调用 update_student_info 命令...');
      return await invoke('update_student_info', {
        studentUid,
        name: updates.name,
        age: updates.age,
        classType: updates.classType,
        phone: updates.phone
      })
    }
    throw new Error('Tauri环境不可用')
  }

  static async deleteStudent(studentUid: number) {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.deleteStudent] 调用 delete_student 命令...');
      return await invoke('delete_student', {
        studentUid
      })
    }
    throw new Error('Tauri环境不可用')
  }

  // 财务管理
  static async addCashTransaction(studentUid: number | null, amount: number, description: string) {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.addCashTransaction] 调用 add_cash_transaction 命令...');
      return await invoke('add_cash_transaction', {
        studentUid,
        amount,
        description
      })
    }
    throw new Error('Tauri环境不可用')
  }

  static async getAllTransactions() {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.getAllTransactions] 调用 get_all_transactions 命令...');
      return await invoke('get_all_transactions')
    }
    throw new Error('Tauri环境不可用')
  }

  static async deleteCashTransaction(transactionUid: number) {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.deleteCashTransaction] 调用 delete_cash_transaction 命令...');
      return await invoke('delete_cash_transaction', {
        transactionUid
      })
    }
    throw new Error('Tauri环境不可用')
  }

  // 统计数据
  static async getDashboardStats() {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.getDashboardStats] 调用 get_dashboard_stats 命令...');
      return await invoke('get_dashboard_stats')
    }
    throw new Error('Tauri环境不可用')
  }

  // 窗口管理
  static async openSettingsWindow() {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.openSettingsWindow] 调用 open_settings_window 命令...');
      return await invoke('open_settings_window')
    }
    throw new Error('Tauri环境不可用')
  }

  static async openMainWindow() {
    if (this.checkTauriEnvironment()) {
      const { invoke } = window.__TAURI__!.tauri
      console.log('🔍 [ApiService.openMainWindow] 调用 open_main_window 命令...');
      return await invoke('open_main_window')
    }
    throw new Error('Tauri环境不可用')
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
  active_courses: number
}
<template>
  <div :class="['main-app', theme]">
    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="nav-brand">
        <h1>启明星管理系统</h1>
      </div>
      
      <!-- 水平导航菜单 -->
      <div class="nav-menu">
        <div 
          v-for="item in menuItems" 
          :key="item.id"
          :class="['nav-menu-item', { active: activeTab === item.id }]"
          @click="activeTab = item.id"
        >
          <span class="nav-menu-icon">{{ item.icon }}</span>
          <span class="nav-menu-text">{{ item.label }}</span>
        </div>
      </div>
      
      <div class="nav-actions">
        <button class="settings-btn" @click="openSettings">
          ⚙️ 设置
        </button>
      </div>
    </nav>

    <!-- 主内容区域 -->
    <main class="main-content">
      <!-- 学员管理 -->
      <div v-if="activeTab === 'students'" class="tab-content">
        <StudentManagement />
      </div>

      <!-- 收支统计 -->
      <div v-if="activeTab === 'finance'" class="tab-content">
        <FinancialStatistics />
      </div>

      <!-- 分数管理 -->
      <div v-if="activeTab === 'scores'" class="tab-content">
        <ScoreManagement />
      </div>

      <!-- 仪表盘 -->
      <div v-if="activeTab === 'dashboard'" class="tab-content">
        <Dashboard />
      </div>

      <!-- 设置 -->
      <div v-if="activeTab === 'settings'" class="tab-content">
        <Settings />
      </div>
    </main>

    <!-- 错误弹窗 -->
    <ErrorModal
      :show="errorModal.show"
      :title="errorModal.title"
      :message="errorModal.message"
      :details="errorModal.details"
      :show-retry="errorModal.showRetry"
      @close="hideError"
      @retry="retryWithError"
    />
  </div>
</template>

<script>
import { ref, onMounted, provide } from 'vue'
import StudentManagement from './components/StudentManagement.vue'
import FinancialStatistics from './components/FinancialStatistics.vue'
import ScoreManagement from './components/ScoreManagement.vue'
import Dashboard from './components/Dashboard.vue'
import Settings from './components/Settings.vue'
import ErrorModal from './components/ErrorModal.vue'

export default {
  name: 'MainApp',
  components: {
    StudentManagement,
    FinancialStatistics,
    ScoreManagement,
    Dashboard,
    Settings,
    ErrorModal
  },
  setup() {
    const theme = ref('dark')
    const activeTab = ref('dashboard')
    
    // 错误弹窗状态
    const errorModal = ref({
      show: false,
      title: '错误',
      message: '',
      details: '',
      showRetry: false
    })

    const menuItems = [
      { id: 'dashboard', label: '仪表盘', icon: '📊' },
      { id: 'students', label: '学员管理', icon: '👥' },
      { id: 'finance', label: '收支统计', icon: '💰' },
      { id: 'scores', label: '分数管理', icon: '🎯' }
    ]

    
    const openSettings = () => {
      // 在当前界面显示设置面板
      activeTab.value = 'settings'
    }

    // 错误处理方法
    const showError = (title, message, details = '', showRetry = false) => {
      errorModal.value = {
        show: true,
        title,
        message,
        details,
        showRetry
      }
    }

    const hideError = () => {
      errorModal.value.show = false
    }

    const retryWithError = () => {
      errorModal.value.show = false
      // 这里可以添加重试逻辑，目前只是关闭弹窗
    }

    onMounted(() => {
      // 初始化主题
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        theme.value = savedTheme
      } else {
        theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      document.documentElement.className = theme.value + '-theme'
    })

    // 提供全局错误处理方法给子组件使用
    provide('errorHandler', {
      showError,
      hideError,
      retryWithError
    })

    return {
      theme,
      activeTab,
      menuItems,
      openSettings,
      errorModal,
      showError,
      hideError,
      retryWithError
    }
  }
}
</script>

<style>
/* === CSS变量定义 === */
:root {
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --bg-tertiary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #bbbbbb;
  --accent-primary: #2196f3;
  --accent-secondary: #4caf50;
  --accent-danger: #f44336;
  --border-color: #333333;
  --shadow-color: rgba(0, 0, 0, 0.3);
}

:root.light-theme {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e0e0e0;
  --text-primary: #333333;
  --text-secondary: #666666;
  --accent-primary: #1976d2;
  --accent-secondary: #388e3c;
  --accent-danger: #d32f2f;
  --border-color: #dddddd;
  --shadow-color: rgba(0, 0, 0, 0.1);
}

/* 主应用布局 */
.main-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 导航栏 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.nav-brand h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* 水平导航菜单 */
.nav-menu {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
}

.nav-menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  color: var(--text-primary);
}

.nav-menu-item:hover {
  background-color: var(--bg-tertiary);
}

.nav-menu-item.active {
  background-color: var(--accent-primary);
  color: white;
}

.nav-menu-icon {
  margin-right: 0.5rem;
  font-size: 1.1rem;
}

.nav-menu-text {
  font-weight: 500;
}

.nav-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.settings-btn {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.settings-btn:hover {
  background-color: var(--bg-tertiary);
  transform: translateY(-1px);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background-color: var(--bg-primary);
  height: calc(100vh - 80px);
}

.tab-content {
  height: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .navbar {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-menu {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  
  .nav-brand h1 {
    font-size: 1.2rem;
  }
  
  .main-content {
    padding: 1rem;
  }
}

@media (max-width: 600px) {
  .navbar {
    padding: 0.75rem;
  }
  
  .nav-menu {
    gap: 0.25rem;
  }
  
  .nav-menu-item {
    padding: 0.5rem 1rem;
    flex-direction: column;
    min-width: 60px;
    text-align: center;
  }
  
  .nav-menu-icon {
    margin-right: 0;
    margin-bottom: 0.25rem;
  }
  
  .nav-menu-text {
    font-size: 0.8rem;
  }
  
  .nav-brand h1 {
    font-size: 1rem;
  }
  
  .settings-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>
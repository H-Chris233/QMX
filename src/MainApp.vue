<template>
  <div :class="['main-app', theme]">
    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <div class="nav-brand">
        <h1>启明星管理系统</h1>
      </div>
      <div class="nav-actions">
        <button class="theme-toggle" @click="toggleTheme">
          <span v-if="theme === 'dark'">🌕</span>
          <span v-else>🌑</span>
        </button>
        <button class="settings-btn" @click="openSettings">
          ⚙️ 设置
        </button>
      </div>
    </nav>

    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-menu">
        <div 
          v-for="item in menuItems" 
          :key="item.id"
          :class="['menu-item', { active: activeTab === item.id }]"
          @click="activeTab = item.id"
        >
          <span class="menu-icon">{{ item.icon }}</span>
          <span class="menu-text">{{ item.label }}</span>
        </div>
      </div>
    </aside>

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
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import StudentManagement from './components/StudentManagement.vue'
import FinancialStatistics from './components/FinancialStatistics.vue'
import ScoreManagement from './components/ScoreManagement.vue'
import Dashboard from './components/Dashboard.vue'

export default {
  name: 'MainApp',
  components: {
    StudentManagement,
    FinancialStatistics,
    ScoreManagement,
    Dashboard
  },
  setup() {
    const theme = ref('dark')
    const activeTab = ref('dashboard')

    const menuItems = [
      { id: 'dashboard', label: '仪表盘', icon: '📊' },
      { id: 'students', label: '学员管理', icon: '👥' },
      { id: 'finance', label: '收支统计', icon: '💰' },
      { id: 'scores', label: '分数管理', icon: '🎯' }
    ]

    const toggleTheme = () => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', theme.value)
      document.documentElement.className = theme.value + '-theme'
    }

    const openSettings = async () => {
      if (window.__TAURI__) {
        const { invoke } = window.__TAURI__.tauri
        await invoke('open_settings_window')
      }
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

    return {
      theme,
      activeTab,
      menuItems,
      toggleTheme,
      openSettings
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

.nav-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.theme-toggle, .settings-btn {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.theme-toggle:hover, .settings-btn:hover {
  background-color: var(--bg-tertiary);
  transform: translateY(-1px);
}

/* 侧边栏 */
.sidebar {
  width: 250px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  padding: 1rem 0;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.menu-item:hover {
  background-color: var(--bg-tertiary);
}

.menu-item.active {
  background-color: var(--bg-tertiary);
  border-left-color: var(--accent-primary);
  color: var(--accent-primary);
}

.menu-icon {
  margin-right: 0.75rem;
  font-size: 1.2rem;
}

.menu-text {
  font-weight: 500;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background-color: var(--bg-primary);
}

.tab-content {
  height: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
  
  .navbar {
    padding: 1rem;
  }
  
  .nav-brand h1 {
    font-size: 1.2rem;
  }
  
  .main-content {
    padding: 1rem;
  }
}

@media (max-width: 600px) {
  .main-app {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  
  .sidebar-menu {
    flex-direction: row;
    overflow-x: auto;
  }
  
  .menu-item {
    flex-direction: column;
    padding: 0.5rem;
    min-width: 80px;
    text-align: center;
  }
  
  .menu-icon {
    margin-right: 0;
    margin-bottom: 0.25rem;
  }
  
  .menu-text {
    font-size: 0.8rem;
  }
}
</style>
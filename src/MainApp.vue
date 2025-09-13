<template>
  <div :class="['main-app', theme]">
    <!-- 顶部导航栏（同时承载移动端侧边栏触发按钮） -->
    <nav class="navbar">
      <!-- 移动端：品牌标题 + 侧边栏触发按钮 -->
      <div class="nav-mobile-header">
        <h1>启明星管理系统</h1>
        <button class="sidebar-toggle" @click.stop="toggleSidebar">☰</button>
      </div>

      <!-- 大屏：原有水平导航菜单（≥769px 显示） -->
      <div class="nav-menu-desktop">
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

      <!-- 移动端：侧边栏（≤768px 显示，抽屉式展开） -->
      <aside class="sidebar" :class="{ 'sidebar-open': isSidebarOpen }">
        <div class="sidebar-header">
          <h2>启明星</h2>
          <button class="sidebar-close" @click="toggleSidebar">×</button>
        </div>
        <ul class="sidebar-menu">
          <li
            v-for="item in menuItems"
            :key="item.id"
            :class="{ active: activeTab === item.id }"
            @click="handleSidebarItemClick(item.id)"
          >
            <span class="sidebar-icon">{{ item.icon }}</span>
            <span class="sidebar-text">{{ item.label }}</span>
          </li>
        </ul>
      </aside>

      <!-- 遮罩层：独立于侧边栏，作为 navbar 子元素 -->
      <div
        class="sidebar-overlay"
        :class="{ 'sidebar-overlay-show': isSidebarOpen }"
        @click="toggleSidebar"
      ></div>
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

    <!-- 会员到期提醒 -->
    <MembershipAlerts />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, provide } from 'vue';
import StudentManagement from './components/StudentManagement.vue';
import FinancialStatistics from './components/FinancialStatistics.vue';
import ScoreManagement from './components/ScoreManagement.vue';
import Dashboard from './components/Dashboard.vue';
import Settings from './components/Settings.vue';
import ErrorModal from './components/ErrorModal.vue';
import MembershipAlerts from './components/MembershipAlerts.vue';

export default {
  name: 'MainApp',
  components: {
    StudentManagement,
    FinancialStatistics,
    ScoreManagement,
    Dashboard,
    Settings,
    ErrorModal,
    MembershipAlerts,
  },
  setup() {
    const theme = ref('dark');
    const activeTab = ref('dashboard');

    // 错误弹窗状态
    const errorModal = ref({
      show: false,
      title: '错误',
      message: '',
      details: '',
      showRetry: false,
    });

    const menuItems = [
      { id: 'dashboard', label: '仪表盘', icon: '📊' },
      { id: 'students', label: '学员管理', icon: '👥' },
      { id: 'finance', label: '收支统计', icon: '💰' },
      { id: 'scores', label: '分数管理', icon: '🎯' },
      { id: 'settings', label: '设置', icon: '⚙️' }, // 新增「设置」菜单项
    ];

    // 新增：侧边栏展开状态 + 交互方法
    const isSidebarOpen = ref(false);
    const toggleSidebar = () => {
      isSidebarOpen.value = !isSidebarOpen.value;
      console.log('侧边栏状态：' + isSidebarOpen.value); // 调试用
    };
    const handleSidebarItemClick = (id) => {
      activeTab.value = id; // 切换激活Tab
      toggleSidebar(); // 点击菜单项后自动收起侧边栏
    };

    const openSettings = () => {
      activeTab.value = 'settings';
    };

    // 错误处理方法
    const showError = (title, message, details = '', showRetry = false) => {
      try {
        // 验证参数
        if (!title || typeof title !== 'string') {
          title = '系统错误';
        }
        if (!message || typeof message !== 'string') {
          message = '发生了未知错误';
        }

        errorModal.value = {
          show: true,
          title: title.substring(0, 100), // 限制长度防止UI问题
          message: message.substring(0, 500),
          details: details ? String(details).substring(0, 2000) : '',
          showRetry: Boolean(showRetry),
        };
      } catch (error) {
        console.error('显示错误弹窗失败:', error);
        // 降级方案
        alert(`${title}: ${message}`);
      }
    };

    const hideError = () => {
      errorModal.value.show = false;
    };

    const retryWithError = () => {
      errorModal.value.show = false;
      // 这里可以添加重试逻辑，目前只是关闭弹窗
    };

    // 成功消息处理（简单的控制台日志，可以后续扩展为Toast通知）
    const showSuccess = (title, message) => {
      console.log(`✅ ${title}: ${message}`);
      // 这里可以添加Toast通知或其他成功提示UI
    };

    // 事件监听器清理函数
    let cleanupFunctions = [];

    onMounted(() => {
      try {
        // 安全的主题初始化
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['dark', 'light'].includes(savedTheme)) {
          theme.value = savedTheme;
        } else {
          // 安全的媒体查询检查
          const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
          theme.value = mediaQuery?.matches ? 'dark' : 'light';
        }
        document.documentElement.className = `${theme.value}-theme`;
        
        // 修复内存泄漏：正确管理事件监听器
        const handleOutsideClick = (e) => {
          if (window.innerWidth <= 768 && isSidebarOpen.value) {
            const sidebar = document.querySelector('.sidebar');
            const toggleButton = document.querySelector('.sidebar-toggle');
            
            // 更安全的DOM查询和事件检查
            if (sidebar && !sidebar.contains(e.target) && 
                toggleButton && !toggleButton.contains(e.target)) {
              isSidebarOpen.value = false;
            }
          }
        };

        // 防抖处理，避免频繁触发
        let debounceTimer = null;
        const debouncedHandleClick = (e) => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => handleOutsideClick(e), 10);
        };

        document.addEventListener('click', debouncedHandleClick, { passive: true });
        
        // 添加清理函数
        cleanupFunctions.push(() => {
          document.removeEventListener('click', debouncedHandleClick);
          if (debounceTimer) clearTimeout(debounceTimer);
        });

        // 添加窗口大小变化监听器，自动关闭侧边栏
        const handleResize = () => {
          if (window.innerWidth > 768 && isSidebarOpen.value) {
            isSidebarOpen.value = false;
          }
        };

        window.addEventListener('resize', handleResize, { passive: true });
        cleanupFunctions.push(() => {
          window.removeEventListener('resize', handleResize);
        });

      } catch (error) {
        console.error('主题初始化失败:', error);
        theme.value = 'dark'; // 安全的降级方案
        document.documentElement.className = 'dark-theme';
      }
    });

    onUnmounted(() => {
      // 清理所有事件监听器
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('清理事件监听器失败:', error);
        }
      });
      cleanupFunctions = [];
    });

    // 提供全局错误处理方法给子组件使用
    provide('errorHandler', {
      showError,
      hideError,
      retryWithError,
      showSuccess,
    });

    return {
      theme,
      activeTab,
      menuItems,
      openSettings,
      errorModal,
      showError,
      hideError,
      retryWithError,
      isSidebarOpen,
      toggleSidebar,
      handleSidebarItemClick,
    };
  },
};
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

/* ========== 导航栏整体布局 ========== */
.navbar {
  display: flex;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 8px var(--shadow-color);
  position: relative; /* 为绝对定位的侧边栏做容器 */
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

/* ========== 移动端：品牌+侧边栏触发按钮（小屏显示） ========== */
.nav-mobile-header {
  display: none; /* 大屏默认隐藏 */
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.sidebar-toggle {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
}

/* ========== 大屏：水平导航菜单（≥769px 显示） ========== */
.nav-menu-desktop {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
}
.nav-menu-item {
  /* 原有菜单项样式保持不变 */
}

/* ========== 移动端：侧边栏（≤768px 显示，抽屉式） ========== */
.sidebar {
  position: fixed;
  top: 0;
  left: -250px; /* 初始隐藏 */
  width: 250px;
  height: 100vh;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  box-shadow: 2px 0 8px var(--shadow-color);
  transition: left 0.3s ease; /* 确保过渡生效 */
  z-index: 999;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}
.sidebar-open {
  left: 0; /* 展开时回到屏幕内 */
}
.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.sidebar-close {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
}
.sidebar-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar-menu li {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  color: var(--text-primary);
}
.sidebar-menu li.active {
  background-color: var(--accent-primary);
  color: white;
}
.sidebar-menu li:hover {
  background-color: var(--bg-tertiary);
}
.sidebar-icon {
  margin-right: 0.5rem;
  font-size: 1.1rem;
}
.sidebar-text {
  font-weight: 500;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  z-index: 998; /* 低于sidebar的999 */
  display: none; /* 初始隐藏 */
  pointer-events: auto; /* 确保点击事件生效 */
}
.sidebar-overlay-show {
  display: block; /* 展开时显示 */
}

/* ========== 响应式媒体查询 ========== */
/* 小屏（≤768px）：显示移动端元素，隐藏大屏导航 */
@media (max-width: 768px) {
  .navbar {
    flex-direction: row; /* 保持横向，让触发按钮和设置按钮在同一行 */
    justify-content: space-between;
    padding: 1rem;
  }
  .nav-mobile-header {
    display: flex; /* 显示移动端标题+触发按钮 */
  }
  .nav-menu-desktop {
    display: none; /* 隐藏大屏水平导航 */
  }
}

/* 大屏（≥769px）：隐藏移动端元素，显示大屏导航 */
@media (min-width: 769px) {
  .sidebar {
    display: none; /* 大屏不需要侧边栏 */
  }
  .nav-mobile-header {
    display: none; /* 隐藏移动端触发按钮 */
  }
  .sidebar-overlay {
    display: none;
  }
}

/* 小屏细节优化（≤600px，可选） */
@media (max-width: 600px) {
  .nav-brand h1 {
    font-size: 1rem;
  }
  .sidebar-menu li {
    padding: 0.5rem;
  }
}
</style>

<template>
  <div :class="['main-app', theme]">
    <!-- 顶部导航栏（同时承载移动端侧边栏触发按钮） -->
    <nav class="navbar">
      <!-- 移动端：品牌标题 + 侧边栏触发按钮 -->
      <div class="nav-mobile-header">
        <h1>启明星管理系统</h1>
        <button ref="toggleButtonRef" class="sidebar-toggle" type="button" aria-label="打开侧边栏" @click.stop="toggleSidebar">☰</button>
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
        <!-- 开发环境测试按钮 -->
        <button
          v-if="isDev"
          class="test-confirm-btn"
          @click="testConfirmModal"
          title="测试确认弹窗"
        >
          🧪
        </button>
      </div>

      <!-- 移动端：侧边栏（≤768px 显示，抽屉式展开） -->
      <aside ref="sidebarRef" class="sidebar" :class="{ 'sidebar-open': isSidebarOpen }">
        <div class="sidebar-header">
          <h2>启明星</h2>
          <button class="sidebar-close" type="button" aria-label="关闭侧边栏" @click="toggleSidebar">×</button>
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

      <!-- 成绩管理 -->
      <div v-if="activeTab === 'grades'" class="tab-content">
        <GradeManagement />
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
      :show="appStore.hasErrors"
      :title="appStore.latestError?.message || '错误'"
      :message="appStore.latestError?.context || '操作失败'"
      :details="appStore.latestError ? JSON.stringify(appStore.latestError, null, 2) : ''"
      :show-retry="true"
      :priority="'medium'"
      @close="appStore.clearErrors"
      @retry="() => { /* 处理重试逻辑 */ }"
    />

    <!-- 确认弹窗 -->
    <ConfirmModal
      :show="appStore.confirmModal.show"
      :title="appStore.confirmModal.title"
      :message="appStore.confirmModal.message"
      :confirm-text="appStore.confirmModal.confirmText"
      :cancel-text="appStore.confirmModal.cancelText"
      :confirm-type="appStore.confirmModal.confirmType"
      @confirm="appStore.handleConfirm"
      @cancel="appStore.handleCancel"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAppStore } from './stores/app';
import { useAuthStore } from './stores/auth';
import { runAllStoreTests } from './utils/store-test';
import ErrorModal from './components/ErrorModal.vue';
import StudentManagement from './components/StudentManagement.vue';
import FinancialStatistics from './components/FinancialStatistics.vue';
import GradeManagement from './components/GradeManagement.vue';
import Dashboard from './components/Dashboard.vue';
import Settings from './components/Settings.vue';
import ConfirmModal from './components/ConfirmModal.vue';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: '仪表盘', icon: '📊' },
  { id: 'students', label: '学员管理', icon: '👥' },
  { id: 'finance', label: '收支统计', icon: '💰' },
  { id: 'grades', label: '成绩管理', icon: '📝' },
  { id: 'settings', label: '设置', icon: '⚙️' },
];

// 使用新的Pinia stores
const appStore = useAppStore();

// 开发环境标志
const isDev = import.meta.env.DEV;

// DOM元素引用
const sidebarRef = ref<HTMLElement | null>(null);
const toggleButtonRef = ref<HTMLElement | null>(null);
const isSidebarOpen = ref(false);

// 需要在app store中添加activeTab和theme状态
const activeTab = ref('dashboard');
const theme = ref('dark-theme');

const toggleSidebar = (): void => {
  const newState = !isSidebarOpen.value;
  isSidebarOpen.value = newState;
  
  // 设置ARIA属性
  const sidebar = sidebarRef.value;
  if (sidebar) {
    if (newState) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      sidebar.setAttribute('aria-label', '导航菜单');
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      sidebar.removeAttribute('aria-label');
    }
  }
  
  if (import.meta.env?.MODE !== 'production') console.log('侧边栏状态：' + newState);
};

const handleSidebarItemClick = (id: string): void => {
  activeTab.value = id; // 切换激活Tab
  toggleSidebar(); // 点击菜单项后自动收起侧边栏
};

// 测试确认弹窗功能
const testConfirmModal = (): void => {
  appStore.showConfirm({
    title: '测试确认弹窗',
    message: '这是新的Pinia状态管理的确认弹窗，你感觉怎么样？',
    confirmText: '感觉很棒',
    cancelText: '一般般',
    confirmType: 'primary',
    onConfirm: () => {
      appStore.errorHandler.showSuccess('你选择了：感觉很棒！');
    },
    onCancel: () => {
      appStore.errorHandler.showError('你选择了：一般般', 'confirm-test');
    }
  });
};

// 事件监听器清理函数
let cleanupFunctions: (() => void)[] = [];

onMounted(() => {
  // 优化的外部点击处理
  const handleOutsideClick = (e: Event): void => {
    if (window.innerWidth <= 768 && isSidebarOpen.value) {
      const target = e.target as Node;
      
      const sidebar = sidebarRef.value;
      const toggleButton = toggleButtonRef.value;
      
      if (target && sidebar && toggleButton && 
          !sidebar.contains(target) && 
          !toggleButton.contains(target)) {
        isSidebarOpen.value = false;
      }
    }
  };

  // 防抖处理
  let debounceTimer: number | null = null;
  const debouncedHandleClick = (e: Event): void => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => handleOutsideClick(e), 10);
  };

  document.addEventListener('click', debouncedHandleClick);
  
  const handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && isSidebarOpen.value) {
      isSidebarOpen.value = false;
    }
  };
  document.addEventListener('keydown', handleKeydown);
  
  // 添加窗口大小变化监听器
  let resizeRaf = 0;
  const handleResize = (): void => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      if (window.innerWidth > 768 && isSidebarOpen.value) {
        isSidebarOpen.value = false;
      }
    });
  };

  window.addEventListener('resize', handleResize);

  // 开发环境运行状态管理测试
  if (import.meta.env.DEV) {
    console.log('🧪 开发环境：运行状态管理测试');
    runAllStoreTests();
  }

  // 一次性添加所有清理函数
  cleanupFunctions.push(
    () => document.removeEventListener('click', debouncedHandleClick),
    () => {
      if (debounceTimer) window.clearTimeout(debounceTimer as number);
    },
    () => document.removeEventListener('keydown', handleKeydown),
    () => { if (resizeRaf) cancelAnimationFrame(resizeRaf); },
    () => window.removeEventListener('resize', handleResize)
  );
});

onUnmounted(() => {
  // 清理所有事件监听器
  cleanupFunctions.forEach((cleanup: () => void) => {
    try {
      cleanup();
    } catch (error) {
      if (import.meta.env?.MODE !== 'production') console.warn('清理事件监听器失败:', error);
    }
  });
  cleanupFunctions = [];
});

// 开发环境：全局暴露测试方法
if (import.meta.env.DEV) {
  (window as any).testConfirmModal = testConfirmModal;
  console.log('🧪 测试方法已暴露到window.testConfirmModal()');
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
  --accent-warning: #ff9800;
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
  --accent-warning: #fb8c00;
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

/* 开发环境测试按钮 */
.test-confirm-btn {
  background: var(--accent-warning);
  border: none;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  margin-left: 1rem;
  transition: all 0.2s ease;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-confirm-btn:hover {
  background: #f57c00;
  transform: scale(1.05);
}

.test-confirm-btn:active {
  transform: scale(0.95);
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
  padding: 0.5rem;
  border-radius: 8px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.sidebar-toggle:hover {
  background-color: var(--bg-tertiary);
}

.sidebar-toggle:active {
  transform: scale(0.95);
  background-color: var(--bg-secondary);
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
  left: 0;
  width: 250px;
  height: 100vh;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  box-shadow: 2px 0 8px var(--shadow-color);
  transform: translateX(-100%); /* 完全隐藏在屏幕外 */
  transition: transform 0.3s ease; /* 使用transform性能更好 */
  z-index: 999;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow: hidden; /* 防止内容溢出 */
}
.sidebar-open {
  transform: translateX(0); /* 展开时回到屏幕内 */
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
  padding: 0.5rem;
  border-radius: 8px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.sidebar-close:hover {
  background-color: var(--bg-tertiary);
}

.sidebar-close:active {
  transform: scale(0.95);
  background-color: var(--bg-primary);
}
.sidebar-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar-menu li {
  display: flex;
  align-items: center;
  padding: 1rem 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-primary);
  min-height: 48px;
  font-size: 1rem;
  -webkit-tap-highlight-color: transparent;
}
.sidebar-menu li.active {
  background-color: var(--accent-primary);
  color: white;
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}
.sidebar-menu li:hover {
  background-color: var(--bg-tertiary);
  transform: translateX(2px);
}
.sidebar-menu li:active {
  transform: scale(0.98) translateX(2px);
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
    padding: 1rem;
    font-size: 1.125rem;
  }
  .sidebar {
    width: 280px;
    padding: 1.5rem;
  }
  .main-content {
    padding: 1rem;
  }
}

/* 超小屏优化（≤480px） */
@media (max-width: 480px) {
  .navbar {
    padding: 0.75rem;
  }
  
  .nav-mobile-header h1 {
    font-size: 1.125rem;
  }
  
  .sidebar {
    width: calc(100vw - 40px);
    max-width: 320px;
    border-radius: 0 16px 16px 0;
  }
  
  .sidebar-header h2 {
    font-size: 1.25rem;
  }
  
  .main-content {
    padding: 0.75rem;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .sidebar-overlay {
    -webkit-tap-highlight-color: transparent;
  }
  
  .sidebar-menu li:active {
    background-color: var(--accent-primary);
    color: white;
  }
  
  .sidebar-menu li.active:active {
    background-color: #1976d2;
  }
}

/* 横屏模式优化 */
@media (max-width: 768px) and (orientation: landscape) {
  .sidebar {
    width: 240px;
  }
  
  .navbar {
    padding: 0.5rem 1rem;
  }
  
  .main-content {
    padding: 1rem;
  }
}
</style>

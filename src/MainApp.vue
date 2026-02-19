<template>
  <div :class="['main-app', appStore.theme + '-theme']">
    <!-- 未登录状态：显示登录页面 -->
    <Login v-if="!authStore.isAuthenticated" />

    <!-- 已登录状态：显示主应用 -->
    <template v-else>
    <!-- 顶部导航栏 -->
    <nav class="navbar">
      <!-- 移动端：品牌标题 + 侧边栏触发按钮 -->
      <div class="nav-mobile-header">
        <div class="brand-logo">
          <component :is="Sparkles" class="brand-icon" />
          <h1>启明星</h1>
        </div>
        <button 
          ref="toggleButtonRef" 
          class="icon-btn sidebar-toggle" 
          type="button" 
          aria-label="打开侧边栏" 
          @click.stop="toggleSidebar"
        >
          <Menu :size="24" />
        </button>
      </div>

      <!-- 大屏：水平导航菜单 -->
      <div class="nav-menu-desktop" data-testid="nav-menu-desktop">
        <div class="brand-desktop">
          <component :is="Sparkles" class="brand-icon" />
          <span class="brand-text">启明星系统</span>
        </div>

        <div class="nav-links">
          <div
            v-for="item in menuItems"
            :key="item.id"
            :class="['nav-item', { active: activeTab === item.id }]"
            @click="activeTab = item.id"
            :data-testid="`nav-${item.id}`"
          >
            <component :is="item.icon" class="nav-icon" :size="18" />
            <span class="nav-text">{{ item.label }}</span>
          </div>
        </div>

        <!-- 开发环境测试按钮 -->
        <button
          v-if="isDev"
          class="icon-btn test-btn"
          @click="testConfirmModal"
          title="测试确认弹窗"
        >
          <FlaskConical :size="20" />
        </button>
      </div>

      <!-- 移动端：侧边栏（抽屉式） -->
      <aside ref="sidebarRef" class="sidebar" :class="{ 'sidebar-open': isSidebarOpen }">
        <div class="sidebar-header">
          <div class="brand-logo">
            <component :is="Sparkles" class="brand-icon" />
            <h2>启明星</h2>
          </div>
          <button class="icon-btn sidebar-close" type="button" aria-label="关闭侧边栏" @click="toggleSidebar">
            <X :size="24" />
          </button>
        </div>
        
        <div class="sidebar-scroll-area">
          <ul class="sidebar-menu">
            <li
              v-for="item in menuItems"
              :key="item.id"
              :class="{ active: activeTab === item.id }"
              @click="handleSidebarItemClick(item.id)"
            >
              <component :is="item.icon" class="sidebar-icon" :size="20" />
              <span class="sidebar-text">{{ item.label }}</span>
            </li>
          </ul>
        </div>
        
        <div class="sidebar-footer">
          <p class="version-text">v1.0.0 Alpha</p>
        </div>
      </aside>

      <!-- 遮罩层：带呼吸感的过渡 -->
      <div
        class="sidebar-overlay"
        :class="{ 'sidebar-overlay-show': isSidebarOpen }"
        @click="toggleSidebar"
      ></div>
    </nav>

    <!-- 主内容区域 -->
    <main class="main-content" data-testid="main-content">
      <!-- ErrorBoundary 包裹内容，防止组件错误导致整个应用崩溃 -->
      <ErrorBoundary
        :fallback-title="`${activeTabLabel}加载失败`"
        fallback-message="该功能遇到问题，请尝试切换到其他页面或刷新浏览器"
        @error="handleComponentError"
      >
        <transition name="fade-slide" mode="out-in">
          <div :key="activeTab" class="content-wrapper">
            <component :is="currentTabComponent" />
          </div>
        </transition>
      </ErrorBoundary>
    </main>

    <!-- 弹窗组件 -->
    <ErrorModal
      :show="appStore.hasErrors"
      :title="appStore.latestError?.message || '错误'"
      :message="appStore.latestError?.context || '操作失败'"
      :details="appStore.latestError ? JSON.stringify(appStore.latestError, null, 2) : ''"
      :show-retry="true"
      @close="appStore.clearErrors"
    />

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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, shallowRef } from 'vue';
import { useAppStore } from './stores/app';
import { useAuthStore } from './stores/auth';
import { logger } from './utils/logger';
import {
  LayoutDashboard,
  Users,
  Wallet,
  GraduationCap,
  Settings,
  Menu,
  X,
  FlaskConical,
  Sparkles
} from 'lucide-vue-next';

// 全局组件导入（需要立即可用）
import ErrorModal from './components/ErrorModal.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import Login from './components/Login.vue';
import ErrorBoundary from './components/ErrorBoundary.vue';

// 页面组件懒加载（按需加载，提升首屏性能）
import { defineAsyncComponent } from 'vue';

// 加载占位组件
const LoadingPlaceholder = {
  template: `
    <div class="loading-placeholder">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载中...</p>
    </div>
  `
};

// 懒加载配置
const asyncComponentConfig = {
  loadingComponent: LoadingPlaceholder,
  delay: 200, // 200ms 后才显示加载状态，避免闪烁
  timeout: 10000 // 10秒超时
};

const Dashboard = defineAsyncComponent({
  loader: () => import('./components/Dashboard.vue'),
  ...asyncComponentConfig
});

const StudentManagement = defineAsyncComponent({
  loader: () => import('./components/StudentManagement.vue'),
  ...asyncComponentConfig
});

const FinancialStatistics = defineAsyncComponent({
  loader: () => import('./components/FinancialStatistics.vue'),
  ...asyncComponentConfig
});

const GradeManagement = defineAsyncComponent({
  loader: () => import('./components/GradeManagement.vue'),
  ...asyncComponentConfig
});

const SettingsComp = defineAsyncComponent({
  loader: () => import('./components/Settings.vue'),
  ...asyncComponentConfig
});

const appStore = useAppStore();
const authStore = useAuthStore();
const isDev = import.meta.env.DEV;

// 状态管理
const activeTab = ref('dashboard');
const isSidebarOpen = ref(false);

// DOM 引用
const sidebarRef = ref<HTMLElement | null>(null);
const toggleButtonRef = ref<HTMLElement | null>(null);

// 菜单配置 (使用 shallowRef 避免组件对象被深层响应式代理，提升性能)
const menuItems = shallowRef([
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, component: Dashboard },
  { id: 'students', label: '学员管理', icon: Users, component: StudentManagement },
  { id: 'finance', label: '收支统计', icon: Wallet, component: FinancialStatistics },
  { id: 'grades', label: '成绩管理', icon: GraduationCap, component: GradeManagement },
  { id: 'settings', label: '设置', icon: Settings, component: SettingsComp },
]);

// 动态获取当前组件
const currentTabComponent = computed(() => {
  return menuItems.value.find(item => item.id === activeTab.value)?.component || Dashboard;
});

// 获取当前标签名称
const activeTabLabel = computed(() => {
  return menuItems.value.find(item => item.id === activeTab.value)?.label || '页面';
});

// 处理组件错误
function handleComponentError(error: Error, info: string): void {
  logger.error('组件错误被ErrorBoundary捕获:', { error, info });

  // 记录到 appStore（可选）
  appStore.addError({
    message: `${activeTabLabel.value}加载失败`,
    context: error.message,
    type: 'component_error'
  });
}

// 侧边栏逻辑
const toggleSidebar = (): void => {
  const newState = !isSidebarOpen.value;
  isSidebarOpen.value = newState;
  
  // 核心交互优化：滚动锁定
  if (newState) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }

  // A11y
  const sidebar = sidebarRef.value;
  if (sidebar) {
    newState 
      ? sidebar.setAttribute('aria-modal', 'true') 
      : sidebar.removeAttribute('aria-modal');
  }
};

const handleSidebarItemClick = (id: string): void => {
  activeTab.value = id;
  toggleSidebar();
};

const testConfirmModal = (): void => {
  appStore.showConfirm({
    title: '系统通知',
    message: 'Lucide 图标库已成功集成，当前界面采用 Material Dark 风格渲染。',
    confirmText: '确认',
    cancelText: '取消',
    confirmType: 'primary',
    onConfirm: () => logger.log('Confirmed'),
  });
};

// 响应式与事件清理
let cleanupFunctions: (() => void)[] = [];

onMounted(async () => {
  // 初始化主题
  appStore.initTheme();

  // 初始化认证状态
  await authStore.fetchStatus();

  // 点击外部关闭侧边栏
  const handleOutsideClick = (e: Event): void => {
    if (window.innerWidth <= 768 && isSidebarOpen.value) {
      const target = e.target as Node;
      if (sidebarRef.value && !sidebarRef.value.contains(target) && 
          toggleButtonRef.value && !toggleButtonRef.value.contains(target)) {
        toggleSidebar();
      }
    }
  };
  
  document.addEventListener('click', handleOutsideClick);

  // 窗口调整重置
  let resizeTimer: number;
  const handleResize = () => {
    cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(() => {
      if (window.innerWidth > 768 && isSidebarOpen.value) {
        // 大屏自动关闭侧边栏时，记得释放滚动锁定
        isSidebarOpen.value = false;
        document.body.style.overflow = '';
      }
    });
  };
  window.addEventListener('resize', handleResize);

  cleanupFunctions.push(
    () => document.removeEventListener('click', handleOutsideClick),
    () => window.removeEventListener('resize', handleResize),
    () => { document.body.style.overflow = ''; } // 确保卸载时恢复滚动
  );
});

onUnmounted(() => cleanupFunctions.forEach(fn => fn()));
</script>

<style>
/* === 核心变量定义 === */
:root {
  --bg-app: #0f1014;       /* 更深邃的背景 */
  --bg-surface: #1a1c23;   /* 稍微提亮的表面色 */
  --bg-hover: #252836;     /* 悬停色 */

  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;

  --primary-color: #6366f1; /* Indigo 500 */
  --primary-glow: rgba(99, 102, 241, 0.3);

  --border-subtle: rgba(255, 255, 255, 0.08);
  --shadow-elevation: 0 4px 20px rgba(0, 0, 0, 0.4);

  --sidebar-width: 260px;
  --nav-height: 64px;
}

/* 浅色主题 */
.light-theme {
  --bg-app: #f8fafc;
  --bg-surface: #ffffff;
  --bg-hover: #f1f5f9;

  --text-primary: #1e293b;
  --text-secondary: #64748b;

  --primary-color: #6366f1;
  --primary-glow: rgba(99, 102, 241, 0.2);

  --border-subtle: rgba(0, 0, 0, 0.08);
  --shadow-elevation: 0 4px 20px rgba(0, 0, 0, 0.1);
}

/* 深色主题 (默认) */
.dark-theme {
  --bg-app: #0f1014;
  --bg-surface: #1a1c23;
  --bg-hover: #252836;

  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;

  --primary-color: #6366f1;
  --primary-glow: rgba(99, 102, 241, 0.3);

  --border-subtle: rgba(255, 255, 255, 0.08);
  --shadow-elevation: 0 4px 20px rgba(0, 0, 0, 0.4);
}

/* 主应用容器 */
.main-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-app);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* ========== Navbar 顶部导航 ========== */
.navbar {
  height: var(--nav-height);
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  position: relative;
  z-index: 50;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

/* 品牌标识 */
.brand-logo, .brand-desktop {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-primary);
}
.brand-icon {
  color: var(--primary-color);
}
.brand-text, .brand-logo h1, .brand-logo h2 {
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
}
.brand-logo h1 { font-size: 1.25rem; }

/* 按钮基础样式 */
.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.icon-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}
.icon-btn:active {
  transform: scale(0.95);
}

/* 移动端 Header */
.nav-mobile-header {
  display: none;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

/* 桌面端导航 */
.nav-menu-desktop {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}
.nav-links {
  display: flex;
  gap: 0.5rem;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s;
}
.nav-item:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}
.nav-item.active {
  background-color: var(--bg-hover);
  color: var(--primary-color);
}

/* 开发测试按钮 */
.test-btn {
  color: #fbbf24;
}
.test-btn:hover {
  background-color: rgba(251, 191, 36, 0.1);
  color: #f59e0b;
}

/* ========== Sidebar 侧边栏 ========== */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background-color: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-elevation);
}
.sidebar-open {
  transform: translateX(0);
}

.sidebar-header {
  height: var(--nav-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.sidebar-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.sidebar-menu {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar-menu li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}
.sidebar-menu li:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}
.sidebar-menu li.active {
  background-color: rgba(99, 102, 241, 0.1); /* Primary color low opacity */
  color: var(--primary-color);
  font-weight: 600;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--border-subtle);
  text-align: center;
}
.version-text {
  font-size: 0.75rem;
  color: #52525b;
  margin: 0;
}

/* ========== Overlay 遮罩层 ========== */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px); /* 磨砂质感 */
  z-index: 90;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}
.sidebar-overlay-show {
  opacity: 1;
  visibility: visible;
}

/* ========== Main Content 主内容 ========== */
.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  position: relative;
}
.content-wrapper {
  min-height: 100%;
}

/* 内容切换过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ========== 组件懒加载占位符 ========== */
.loading-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-subtle);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .nav-menu-desktop { display: none; }
  .nav-mobile-header { display: flex; }
  .main-content { padding: 1rem; }
}

@media (min-width: 769px) {
  .sidebar { display: none; }
  .sidebar-overlay { display: none !important; } /* 强制隐藏 */
}
</style>

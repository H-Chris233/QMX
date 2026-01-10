<template>
  <div class="settings-container">
    <!-- 页面标题 -->
    <header class="settings-header">
      <h2 class="page-title">系统设置</h2>
      <p class="page-subtitle">管理应用程序的外观、行为与系统信息</p>
    </header>

    <!-- 设置网格 -->
    <div class="settings-grid">

      <!-- 账户管理 -->
      <section class="setting-card">
        <div class="card-header">
          <div class="header-icon">
            <User :size="20" />
          </div>
          <h3>账户管理</h3>
        </div>

        <div class="card-content">
          <div class="account-info">
            <div class="account-badge" :class="{ admin: authStore.isAdmin }">
              <Shield :size="16" v-if="authStore.isAdmin" />
              <User :size="16" v-else />
              <span>{{ authStore.isAdmin ? '管理员' : '普通用户' }}</span>
            </div>
          </div>

          <div class="logout-section">
            <button class="logout-btn" @click="handleLogout">
              <LogOut :size="18" />
              <span>退出登录</span>
            </button>
            <p class="logout-hint">退出后需要重新输入密码才能访问系统</p>
          </div>
        </div>
      </section>

      <!-- 外观设置 -->
      <section class="setting-card">
        <div class="card-header">
          <div class="header-icon">
            <Palette :size="20" />
          </div>
          <h3>外观偏好</h3>
        </div>

        <div class="card-content">
          <div class="setting-row">
            <div class="setting-meta">
              <label>界面主题</label>
              <p class="desc">切换深色或浅色模式以适应环境光线</p>
            </div>

            <!-- 主题切换器 (Segmented Control 风格) -->
            <div class="theme-switcher">
              <button
                class="theme-option"
                :class="{ active: appStore.theme === 'light' }"
                @click="appStore.setTheme('light')"
              >
                <Sun :size="16" />
                <span>浅色</span>
              </button>
              <button
                class="theme-option"
                :class="{ active: appStore.theme === 'dark' }"
                @click="appStore.setTheme('dark')"
              >
                <Moon :size="16" />
                <span>深色</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 通用设置 -->
      <section class="setting-card">
        <div class="card-header">
          <div class="header-icon">
            <Sliders :size="20" />
          </div>
          <h3>通用行为</h3>
        </div>

        <div class="card-content">
          <div class="setting-row">
            <div class="setting-meta">
              <div class="label-with-icon">
                <label>实时数据保护</label>
                <Lock :size="14" class="lock-icon" title="系统强制开启" />
              </div>
              <p class="desc">
                防止数据意外丢失，所有操作将自动写入数据库。
                <span class="highlight-text">此策略由系统管理员强制开启。</span>
              </p>
            </div>

            <div class="setting-control">
              <!-- 样式化的 Switch -->
              <label class="switch-wrapper">
                <input
                  type="checkbox"
                  v-model="autoSave"
                  disabled
                  class="switch-input"
                />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- 系统信息 (关于) -->
      <section class="setting-card about-card">
        <div class="card-header">
          <div class="header-icon">
            <Info :size="20" />
          </div>
          <h3>关于系统</h3>
        </div>
        
        <div class="card-content">
          <div class="about-hero">
            <div class="logo-circle">
              <Sparkles :size="32" />
            </div>
            <div class="app-info">
              <h4>启明星管理系统</h4>
              <span class="version-badge">v0.12.1 Beta</span>
            </div>
          </div>
          
          <div class="tech-specs">
            <div class="spec-item">
              <span class="spec-label">构建核心</span>
              <span class="spec-value">Tauri + Vue 3</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">渲染引擎</span>
              <span class="spec-value">Webview2 / WebKit</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">本地存储</span>
              <span class="spec-value">SQLite / FS</span>
            </div>
          </div>
          
          <div class="card-footer">
            <p class="copyright">© 2024 Morning Star System. All rights reserved.</p>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type Ref } from 'vue';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';
import {
  Palette,
  Sun,
  Moon,
  Sliders,
  Lock,
  Info,
  Sparkles,
  User,
  Shield,
  LogOut
} from 'lucide-vue-next';

const appStore = useAppStore();
const authStore = useAuthStore();
const autoSave: Ref<boolean> = ref(true);

function handleLogout() {
  authStore.logout();
}
</script>

<style scoped>
.settings-container {
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 2rem;
  animation: fade-in 0.4s ease;
}

/* 账户管理样式 */
.account-info {
  margin-bottom: 1.5rem;
}

.account-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-app);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.account-badge.admin {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary-color);
}

.logout-section {
  border-top: 1px solid var(--border-subtle);
  padding-top: 1.5rem;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem;
  background: transparent;
  border: 1px solid #ef4444;
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

.logout-hint {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0.75rem 0 0;
}


/* Header */
.settings-header {
  margin-bottom: 2rem;
}
.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}
.page-subtitle {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

/* Grid */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1.5rem;
}

/* Card Common Styles */
.setting-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s;
}

.setting-card:hover {
  border-color: var(--border-subtle);
}

.card-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background-color: rgba(255, 255, 255, 0.02);
}

.header-icon {
  color: var(--text-secondary);
  display: flex;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.card-content {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Setting Rows */
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.setting-meta label {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
}

.label-with-icon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lock-icon {
  color: var(--accent-warning, #f59e0b);
  opacity: 0.8;
}

.desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.highlight-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--accent-warning, #f59e0b);
  opacity: 0.8;
}

/* Theme Switcher (Segmented Control) */
.theme-switcher {
  display: flex;
  background-color: var(--bg-app); /* Darker background */
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.theme-option:hover {
  color: var(--text-primary);
}

.theme-option.active {
  background-color: var(--bg-surface);
  color: var(--primary-color, #6366f1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  font-weight: 600;
}

/* Modern Switch */
.switch-wrapper {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.switch-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-app);
  border: 1px solid var(--border-subtle);
  transition: .3s;
  border-radius: 34px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text-secondary);
  transition: .3s;
  border-radius: 50%;
}

/* Checked State */
.switch-input:checked + .switch-slider {
  background-color: var(--primary-color, #6366f1); /* Primary Color */
  border-color: var(--primary-color, #6366f1);
}

.switch-input:checked + .switch-slider:before {
  transform: translateX(24px);
  background-color: white;
}

/* Disabled State Styling - Make it look "Locked" not "Broken" */
.switch-input:disabled + .switch-slider {
  cursor: not-allowed;
  opacity: 0.8; /* Keep it relatively visible */
}
.switch-input:disabled:checked + .switch-slider {
  background-color: #2e7d32; /* Success green darker */
  border-color: #2e7d32;
}
.switch-input:disabled + .switch-slider:before {
  background-color: #e0e0e0;
}

/* About Card Specifics */
.about-hero {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.logo-circle {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--primary-color, #6366f1), #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.app-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.version-badge {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  background-color: rgba(99, 102, 241, 0.1);
  color: var(--primary-color, #6366f1);
  border-radius: 99px;
  font-weight: 500;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.tech-specs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background-color: var(--bg-app);
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}

.spec-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.spec-label {
  color: var(--text-secondary);
}

.spec-value {
  color: var(--text-primary);
  font-family: monospace;
}

.card-footer {
  margin-top: auto;
  padding-top: 1.5rem;
  text-align: center;
}

.copyright {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.6;
  margin: 0;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .theme-switcher {
    width: 100%;
  }
  
  .theme-option {
    flex: 1;
    justify-content: center;
  }
  
  .setting-control {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
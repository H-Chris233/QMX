<template>
  <div class="login-container">
    <div class="login-card">
      <!-- Logo/品牌区 -->
      <div class="login-header">
        <div class="brand-icon-wrapper">
          <Sparkles :size="48" class="brand-icon" />
        </div>
        <h1 class="brand-title">启明星系统</h1>
        <p class="brand-subtitle">学生管理系统</p>
      </div>

      <!-- 首次访问：设置密码 -->
      <div v-if="isFirstVisit" class="login-form">
        <h2>初次访问</h2>
        <p class="form-desc">请设置访问密码</p>

        <div class="input-group">
          <Lock :size="20" class="input-icon" />
          <input
            type="password"
            v-model="password"
            placeholder="设置密码（至少4位）"
            class="login-input"
            @keyup.enter="handleSetup"
            autofocus
          />
        </div>

        <div class="input-group">
          <Lock :size="20" class="input-icon" />
          <input
            type="password"
            v-model="confirmPassword"
            placeholder="确认密码"
            class="login-input"
            @keyup.enter="handleSetup"
          />
        </div>

        <p v-if="error" class="error-message">{{ error }}</p>

        <button
          class="login-btn primary"
          @click="handleSetup"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>确认设置</span>
        </button>
      </div>

      <!-- 已有密码：登录 -->
      <div v-else class="login-form">
        <h2>访问验证</h2>
        <p class="form-desc">请输入密码访问系统</p>

        <div class="input-group">
          <Lock :size="20" class="input-icon" />
          <input
            type="password"
            v-model="password"
            placeholder="请输入密码"
            class="login-input"
            @keyup.enter="handleLogin"
            autofocus
          />
        </div>

        <p v-if="error" class="error-message">{{ error }}</p>

        <button
          class="login-btn primary"
          @click="handleLogin"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spinner"></span>
          <span v-else>进入系统</span>
        </button>
      </div>

      <!-- 底部信息 -->
      <div class="login-footer">
        <p v-if="isAdmin" class="admin-badge">
          <Shield :size="14" />
          管理员模式
        </p>
        <p class="version">v1.0.0 Alpha</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Sparkles, Lock, Shield } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';

const authStore = useAuthStore();
const appStore = useAppStore();

const password = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);

const isFirstVisit = ref(true);
const isAdmin = ref(false);
const error = ref('');

// 获取密码状态
async function fetchStatus() {
  isLoading.value = true;
  try {
    await authStore.fetchStatus();
    isFirstVisit.value = authStore.isFirstVisit;
    isAdmin.value = authStore.isAdmin;
  } catch (e) {
    // 离线模式：检查本地存储
    const cached = localStorage.getItem('qmx_site_password');
    isFirstVisit.value = !cached;
  } finally {
    isLoading.value = false;
  }
}

// 设置密码（首次访问）
async function handleSetup() {
  error.value = '';

  if (!password.value) {
    error.value = '请输入密码';
    return;
  }

  if (password.value.length < 4) {
    error.value = '密码长度至少4位';
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = '两次密码不一致';
    return;
  }

  isLoading.value = true;
  try {
    const success = await authStore.setPassword(password.value);
    if (success) {
      // 密码保存成功，登录状态在 store 中已更新
      password.value = '';
      confirmPassword.value = '';
    } else {
      error.value = authStore.error || '设置失败';
    }
  } finally {
    isLoading.value = false;
  }
}

// 登录验证
async function handleLogin() {
  error.value = '';

  if (!password.value) {
    error.value = '请输入密码';
    return;
  }

  isLoading.value = true;
  try {
    const success = await authStore.verifyPassword(password.value);
    if (success) {
      password.value = '';
    } else {
      error.value = authStore.error || '密码错误';
    }
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchStatus();
});
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-app) 0%, #1a1c23 100%);
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: var(--bg-surface);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-subtle);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-icon-wrapper {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary-color), #818cf8);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
}

.brand-icon {
  color: white;
}

.brand-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}

.brand-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.login-form h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
  text-align: center;
}

.form-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 1.5rem;
  text-align: center;
}

.input-group {
  position: relative;
  margin-bottom: 1rem;
}

.input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
}

.login-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 3rem;
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.login-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-glow);
}

.login-input::placeholder {
  color: var(--text-secondary);
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin: 0.5rem 0;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 0.875rem;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.login-btn.primary {
  background: linear-gradient(135deg, var(--primary-color), #818cf8);
  color: white;
}

.login-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.login-btn.primary:active {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  margin-top: 1.5rem;
  text-align: center;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary-color);
  padding: 0.375rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}

.version {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}
</style>

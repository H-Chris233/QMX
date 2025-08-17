<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2>设置</h2>
    </div>
    
    <div class="settings-content">
      <!-- 外观设置 -->
      <div class="settings-section">
        <h3>外观</h3>
        <div class="setting-item">
          <div class="setting-info">
            <label>主题模式</label>
            <p class="setting-description">选择应用程序的主题外观</p>
          </div>
          <div class="setting-control">
            <button 
              class="theme-toggle-btn" 
              @click="toggleTheme"
              :title="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
            >
              <span v-if="theme === 'dark'">🌑 深色</span>
              <span v-else>🌕 浅色</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 通用设置 -->
      <div class="settings-section">
        <h3>通用</h3>
        <div class="setting-item">
          <div class="setting-info">
            <label>自动保存</label>
            <p class="setting-description">自动保存数据更改</p>
          </div>
          <div class="setting-control">
            <label class="switch">
              <input type="checkbox" v-model="autoSave" @change="saveSettings">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- 关于 -->
      <div class="settings-section">
        <h3>关于</h3>
        <div class="about-info">
          <div class="app-info">
            <h4>启明星管理系统</h4>
            <p>版本: 1.0.0</p>
            <p>基于 Tauri + Vue 3 构建</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'Settings',
  setup() {
    const theme = ref('dark')
    const autoSave = ref(true)

    const toggleTheme = () => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', theme.value)
      document.documentElement.className = theme.value + '-theme'
    }

    const saveSettings = () => {
      localStorage.setItem('autoSave', autoSave.value.toString())
    }

    const closeSettings = () => {
      // 在同一界面中，不需要关闭窗口
      console.log('设置面板已关闭')
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

      // 加载设置
      const savedAutoSave = localStorage.getItem('autoSave')
      if (savedAutoSave) {
        autoSave.value = savedAutoSave === 'true'
      }
    })

    return {
      theme,
      autoSave,
      toggleTheme,
      saveSettings,
      closeSettings
    }
  }
}
</script>

<style scoped>
.settings-container {
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.settings-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.close-btn:hover {
  background-color: var(--bg-tertiary);
}

.settings-content {
  padding: 2rem;
  overflow-y: auto;
  height: calc(100vh - 80px);
}

.settings-section {
  margin-bottom: 2rem;
}

.settings-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-info label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.setting-description {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.setting-control {
  margin-left: 1rem;
}

.theme-toggle-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 500;
}

.theme-toggle-btn:hover {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-tertiary);
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accent-primary);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.about-info {
  padding: 1rem;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.app-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.app-info p {
  margin: 0.25rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-header {
    padding: 1rem;
  }
  
  .settings-content {
    padding: 1rem;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .setting-control {
    margin-left: 0;
    align-self: flex-end;
  }
}
</style>
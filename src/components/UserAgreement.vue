<template>
  <div id="app">
    <div :class="['container', theme]">
      <!-- 协议同意按钮 -->
      <button v-if="showAgreeButton" class="agree-button" :class="{ 'show-animation': isAnimationReady }" @click="agreeWithTerms">
        ✅ 我已阅读并同意协议
      </button>

      <!-- 主题切换按钮 -->
      <button class="theme-toggle" @click="toggleTheme">
        <span v-if="theme === 'dark'">☀️ 切换明亮</span>
        <span v-else>🌙 切换暗色</span>
      </button>

      <!-- 页面头部 -->
      <header class="header">
        <div class="header-content">
          <h1>启明星管理软件用户协议</h1>
          <p>版本 1.0 - 最后更新：2025年9月</p>
        </div>
      </header>

      <!-- 协议内容 -->
      <main class="content">
        <section v-for="(section, index) in sections" 
                 :key="index"
                 class="section">
          <h2>{{ section.title }}</h2>
          <div v-html="section.content"></div>
        </section>
      </main>

      <!-- 页脚 -->
      <footer class="footer">
        <p>© 2025 启明星科技有限公司. 保留所有权利.</p>
        <p>本协议文本使用标准商业格式编写</p>
      </footer>

      <!-- 返回顶部按钮 -->
      <button v-if="showScrollButton" class="scroll-top" @click="scrollToTop">
        ↑ 返回顶部
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BusinessAgreement',
  data() {
    return {
      theme: 'light', // 默认主题改为明亮
      showScrollButton: false,
      showAgreeButton: false,
      agreeTimer: null,
      isAnimationReady: false,
      agreeInProgress: false,
      sections: [
        {
          title: '1. 协议概述',
          content: '欢迎使用<code>启明星管理软件</code>（以下简称"本软件"）。本协议适用于所有用户及企业客户，在使用本软件及相关服务前，请您仔细阅读以下条款。'
        },
        {
          title: '2. 软件许可',
          content: '本软件采用<code>商业授权协议</code>，您可在遵守协议的前提下：<ul><li>在企业内部使用本软件</li><li>获得官方技术支持服务</li><li>访问完整的软件功能模块</li></ul>'
        },
        {
          title: '3. 使用条款',
          content: '当使用本软件时，您需遵守以下规定：<ol><li>不得逆向工程或破解软件</li><li>不得用于非法商业用途</li><li>不得干扰软件正常运行</li><li>需定期更新软件版本</li></ol>'
        },
        {
          title: '4. 责任声明',
          content: '本软件按"原样"提供，开发者对以下情况不承担责任：<ul><li>因使用本软件导致的业务中断</li><li>数据丢失或损坏</li><li>软件与第三方系统的兼容性问题</li></ul>'
        },
        {
          title: '5. 数据隐私',
          content: '我们承诺保护您的数据安全：<ul><li>严格遵守GDPR数据保护条例</li><li>加密存储所有用户数据</li><li>未经许可不会共享任何商业信息</li></ul>'
        },
        {
          title: '6. 协议变更',
          content: '我们保留随时修改本协议的权利，重大变更将通过官方渠道提前30天通知。'
        }
      ]
    }
  },
  mounted() {
    this.initializeTheme()
    window.addEventListener('scroll', this.handleScroll)
    this.checkCurrentTheme()

    this.agreeTimer = setTimeout(() => {
      this.showAgreeButton = true
      this.$nextTick(() => {
        this.isAnimationReady = true
      })
    }, 1000)
  },
  methods: {
    initializeTheme() {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.theme = savedTheme
      } else {
        // 默认使用明亮主题
        this.theme = 'light'
      }
    },
    
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', this.theme)
      this.checkCurrentTheme()
    },
    
    handleScroll() {
      this.showScrollButton = window.pageYOffset > 300
    },
    
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    
    checkCurrentTheme() {
      document.documentElement.classList.remove('dark-theme', 'light-theme')
      document.documentElement.classList.add(this.theme + '-theme')
      
      // 更新body背景色
      document.body.style.backgroundColor = this.theme === 'dark' ? '#1e1e2f' : '#f5f5f5'
    },

    agreeWithTerms() {
      if (this.agreeInProgress) return
      this.agreeInProgress = true
      
      // 保存同意状态
      localStorage.setItem('agreedToTerms', 'true')
      
      const btn = this.$el.querySelector('.agree-button')
      if (btn) btn.innerText = '✅ 正在处理...'

      setTimeout(() => {
        this.showAgreeButton = false
        this.openMainWindow()
        this.agreeInProgress = true
      }, 800)
    },

    async openMainWindow() {
      try {
        document.body.classList.add('transition-out')
        
        // Tauri特定代码保留
        if (window.__TAURI__) {
          const { invoke } = window.__TAURI__.tauri
          await invoke('open_main_window')
          // 关闭当前协议窗口
          const { getCurrentWindow } = window.__TAURI__.window
          await getCurrentWindow().close()
        } else {
          // 开发环境下的处理
          alert('感谢您的同意！即将进入启明星管理软件主界面')
          // 重新加载应用显示主界面
          location.reload()
        }
        
      } catch (error) {
        console.error('打开主窗口失败:', error)
        alert('感谢您的同意！主应用启动失败，请重试。')
      }
    }
  },
  beforeUmount() {
    window.removeEventListener('scroll', this.handleScroll)
    if (this.agreeTimer) {
      clearTimeout(this.agreeTimer)
    }
  }
}
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #f5f5f5;
  color: var(--text-color);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow-x: hidden;
  transition: background-color 0.3s ease-in-out;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* === 统一CSS变量定义 === */
:root {
  /* 默认明亮主题 */
  --bg-color: #ffffff;
  --bg-color-deep: #f0f0f0;
  --text-color: #333333;
  --text-muted: #666666;
  --accent-color: #2196f3;
  --border-color: #dddddd;
  --accent-light: #e3f2fd;
  --glow-color: rgba(33, 150, 243, 0.05);
  --bg-pattern: none;
}

:root.dark-theme {
  --bg-color: #1e1e2f;
  --bg-color-deep: #121221;
  --text-color: #ffffff;
  --text-muted: #aaaaaa;
  --accent-color: #3f51b5;
  --border-color: #333333;
  --accent-light: #2e2e3f;
  --glow-color: rgba(63, 81, 181, 0.05);
  --bg-pattern: none;
}

/* === 基础样式 === */
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
  min-height: 100vh;
  transition: all 0.3s ease-in-out;
  position: relative;
  z-index: 2;
}

/* 通用样式 */
.header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px 20px;
  background: var(--bg-color);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid var(--border-color);
}

.header-content {
  position: relative;
  z-index: 1;
}

.header h1 {
  margin: 0;
  font-size: 2.2em;
  margin-bottom: 10px;
  color: var(--text-color);
  transition: color 0.3s ease;
}

.header p {
  color: var(--text-muted);
  font-size: 1em;
  transition: color 0.3s ease;
}

.content {
  animation: fadeIn 0.5s ease-in;
  position: relative;
}

.section {
  padding: 25px 30px;
  margin-bottom: 25px;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
  background-color: var(--bg-color-deep);
  border-radius: 6px;
}

.section h2 {
  color: var(--text-color);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 8px;
  margin-top: 0;
  transition: color 0.3s ease;
  margin-bottom: 15px;
}

.footer {
  text-align: center;
  padding: 30px 20px;
  font-size: 0.9em;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  margin-top: 40px;
  transition: all 0.3s ease;
  background: var(--bg-color-deep);
  border-radius: 6px;
  margin-bottom: 40px;
}

/* 滚动按钮 */
.scroll-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 10px 14px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: all 0.2s ease;
  z-index: 99;
  font-weight: 500;
}

.scroll-top:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

/* 主题切换按钮 */
.theme-toggle {
  position: fixed;
  top: 30px;
  right: 30px;
  padding: 8px 12px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: all 0.2s ease;
  z-index: 100;
  font-weight: 500;
  font-size: 0.9em;
}

.theme-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

/* 协议同意按钮样式 */
.agree-button {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
  transition: all 0.2s ease;
  font-size: 15px;
  z-index: 101;
  opacity: 0;
  animation: none;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.agree-button.show-animation {
  animation: fadeInUp 0.3s ease forwards;
}

.agree-button:hover {
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 0 5px 12px rgba(0,0,0,0.2);
}

/* 动画 */
@keyframes fadeIn {
  from {opacity: 0;}
  to {opacity: 1;}
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(33, 150, 243, 0); }
  100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
}

ul, ol {
  padding-left: 20px;
  margin: 1em 0;
}

li {
  margin-bottom: 0.5em;
}

code {
  background-color: var(--accent-light);
  color: var(--accent-color);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid rgba(0,0,0,0.05);
}

/* 响应式设计 */
@media (max-width: 600px) {
  .container {
    padding: 15px;
  }
  
  .header {
    padding: 20px 15px;
  }
  
  .header h1 {
    font-size: 1.6rem;
  }
  
  .agree-button {
    width: 90%;
    padding: 10px 18px;
    bottom: 30px;
    font-size: 0.9rem;
  }
  
  .theme-toggle {
    top: 15px;
    right: 15px;
    padding: 6px 10px;
    font-size: 0.8rem;
  }
  
  .scroll-top {
    bottom: 90px;
    right: 20px;
    padding: 8px 12px;
    font-size: 0.8rem;
  }
}
</style>

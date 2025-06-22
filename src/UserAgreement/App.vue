<template>
  <div :class="['container', theme]">
    <!-- 主题切换按钮 -->
    <button class="theme-toggle" @click="toggleTheme">
      <span v-if="theme === 'dark'">🌕 切换明亮</span>
      <span v-else>🌑 切换暗黑</span>
    </button>

    <!-- 页面头部 -->
    <header class="header">
      <h1>暗夜守护者用户协议</h1>
      <p class="version-info">版本 1.0 - 最后更新：2023年10月</p>
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
      <p>© 2023 暗夜联盟. 保留最后的光.</p>
      <p>本协议文本使用<code>#000000</code>纯黑墨水撰写于羊皮卷</p>
    </footer>

    <!-- 返回顶部按钮 -->
    <button v-if="showScrollButton" class="scroll-top" @click="scrollToTop">
      ↑ 返回顶部
    </button>
  </div>
</template>

<script>
export default {
  name: 'UserAgreement',
  data() {
    return {
      theme: 'dark', // 默认主题
      showScrollButton: false,
      sections: [
        {
          title: '1. 协议概述',
          content: '欢迎使用<code>暗夜守护者</code>开源软件（以下简称"本软件"）。本协议适用于所有用户及贡献者，在使用本软件源代码、文档及衍生作品前，请您仔细阅读以下条款。'
        },
        {
          title: '2. 开源许可',
          content: '本软件采用<code>MIT License</code>协议授权，除非另有书面说明。您可在遵守协议的前提下：<ul><li>自由复制、修改本软件</li><li>在商业产品中使用本软件</li><li>创建衍生作品并分发</li></ul>'
        },
        {
          title: '3. 黑暗条款',
          content: '当使用本软件时，您默认接受以下特殊约定：<ol><li>禁止在光照充足环境下运行本软件</li><li>必须使用暗色系主题界面</li><li>禁止向日葵等趋光性生物接触本代码库</li><li>每次提交代码需附带一句哥特诗歌</li></ol>'
        },
        {
          title: '4. 责任豁免',
          content: '本软件按"原样"提供，开发者不对以下情况负责：<ul><li>因使用本软件导致的显示器永久性变暗</li><li>夜间使用引起的眼部不适</li><li>代码中潜藏的阴影bug</li></ul>'
        },
        {
          title: '5. 贡献者协议',
          content: '提交PR即表示同意以下条款：<ul><li>您的代码必须通过黑夜lint检查</li><li>提交信息需使用加密的base16格式</li><li>承诺不在满月夜提交代码</li></ul>'
        },
        {
          title: '6. 协议变更',
          content: '我们保留随时修改本协议的权利，重大变更将通过暗网公告。'
        }
      ]
    }
  },
  mounted() {
    // 初始化主题
    this.initializeTheme()
    
    // 监听滚动事件
    window.addEventListener('scroll', this.handleScroll)
    
    // 检查当前主题样式是否存在
    this.checkCurrentTheme()
  },
  methods: {
    // 初始化主题设置
    initializeTheme() {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.theme = savedTheme
      } else {
        // 根据系统偏好设置
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        this.theme = prefersDark ? 'dark' : 'light'
      }
    },
    
    // 切换主题
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', this.theme)
      this.checkCurrentTheme()
    },
    
    // 滚动监听
    handleScroll() {
      this.showScrollButton = window.pageYOffset > 300
    },
    
    // 返回顶部
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    
    // 检查当前主题并应用样式
    checkCurrentTheme() {
      document.documentElement.className = this.theme
    }
  },
  beforeUnmount() {
    // 移除事件监听
    window.removeEventListener('scroll', this.handleScroll)
  }
}
</script>

<style>
/* 基础样式 */
.container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  transition: all 0.5s ease-in-out;
}

/* 暗黑主题 */
.dark {
  background-color: #121212;
  color: #e0e0e0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.dark code {
  background-color: #333;
  color: #4caf50;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}

.dark .section {
  background-color: #1e1e1e;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

/* 明亮主题 */
.light {
  background-color: #ffffff;
  color: #333333;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.light code {
  background-color: #f0f0f0;
  color: #2196f3;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
}

.light .section {
  background-color: #f8f8f8;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

/* 通用样式 */
.header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 20px;
  background: linear-gradient(145deg, var(--accent-color), var(--bg-color));
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  border-radius: 10px;
  transition: all 0.5s ease;
}

.header h1 {
  margin: 0;
  font-size: 2.5em;
  margin-bottom: 10px;
  color: var(--text-color);
  transition: color 0.5s ease;
}

.version-info {
  color: var(--text-muted);
  font-size: 1.1em;
  transition: color 0.5s ease;
}

.header p {
  color: rgba(255,255,255,0.8);
  font-size: 1.1em;
  transition: color 0.5s ease;
}

.content {
  animation: fadeIn 1s ease-in;
}

.section {
  padding: 25px 30px;
  margin-bottom: 25px;
  transition: all 0.5s ease;
}

.section h2 {
  color: var(--text-color);
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 8px;
  margin-top: 0;
  transition: color 0.5s ease;
}

.footer {
  text-align: center;
  padding: 40px 20px;
  font-size: 0.9em;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  margin-top: 40px;
  transition: all 0.5s ease;
}

/* 滚动按钮 */
.scroll-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 12px 16px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: opacity 0.3s, transform 0.3s;
  z-index: 100;
}

.scroll-top:hover {
  transform: scale(1.05);
}

/* 主题切换按钮 */
.theme-toggle {
  position: fixed;
  top: 30px;
  right: 30px;
  padding: 10px 15px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
  z-index: 100;
}

.theme-toggle:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

/* 动画 */
@keyframes fadeIn {
  from {opacity: 0;}
  to {opacity: 1;}
}

:deep(ul), :deep(ol) {
  padding-left: 20px;
  margin: 1em 0;
}

:deep(li) {
  margin-bottom: 0.5em;
}

/* 响应式设计 */
@media (max-width: 600px) {
  .container {
    padding: 15px;
  }
  
  .header {
    padding: 20px 15px;
  }
}

/* CSS变量 */
.dark {
  --bg-color: #121212;
  --text-color: #ffffff;
  --text-muted: #666;
  --accent-color: #212121;
  --border-color: #333;
}

.dark .header {
  background: linear-gradient(145deg, #1a1a1a, #121212);
}

.light {
  --bg-color: #ffffff;
  --text-color: #333;
  --text-muted: #666;
  --accent-color: #2196f3;
  --border-color: #ddd;
}

.light .header {
  background: linear-gradient(145deg, #f0f0f0, #ffffff);
}
</style>
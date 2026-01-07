<template>
  <div id="app">
    <div :class="['container', themeClass]">
      <!-- 协议同意按钮 -->
      <button
        v-if="showAgreeButton"
        class="agree-button"
        :class="{ 'show-animation': isAnimationReady }"
        @click="agreeWithTerms"
      >
        ✅ 我已阅读并同意协议
      </button>

      <!-- 主题切换按钮 -->
      <button class="theme-toggle" @click="toggleTheme">
        <span v-if="appStore.theme === 'dark'">☀️ 切换明亮</span>
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
        <section
          v-for="(section, index) in sections"
          :key="index"
          class="section"
        >
          <h2>{{ section.title }}</h2>
          <div class="section-content" v-html="sanitizeContent(section.content)"></div>
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

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, type Ref } from 'vue';
import { useAppStore } from '../stores/app';

interface Section {
  title: string;
  content: string;
}

const appStore = useAppStore();
const showScrollButton: Ref<boolean> = ref(false);
const showAgreeButton: Ref<boolean> = ref(false);
const agreeTimer: Ref<number | null> = ref(null);
const isAnimationReady: Ref<boolean> = ref(false);
const agreeInProgress: Ref<boolean> = ref(false);

// 计算属性：获取当前主题类名
const themeClass = computed(() => appStore.theme);

const sections: Section[] = [
  {
    title: '1. 协议概述',
    content:
      '欢迎使用<code>启明星管理软件</code>（以下简称"本软件"）。本协议适用于所有用户及企业客户，在使用本软件及相关服务前，请您仔细阅读以下条款。',
  },
  {
    title: '2. 软件许可',
    content:
      '本软件采用<code>商业授权协议</code>，您可在遵守协议的前提下：<ul><li>在企业内部使用本软件</li><li>获得官方技术支持服务</li><li>访问完整的软件功能模块</li></ul>',
  },
  {
    title: '3. 使用条款',
    content:
      '当使用本软件时，您需遵守以下规定：<ol><li>不得逆向工程或破解软件</li><li>不得用于非法商业用途</li><li>不得干扰软件正常运行</li><li>需定期更新软件版本</li></ol>',
  },
  {
    title: '4. 责任声明',
    content:
      '本软件按"原样"提供，开发者对以下情况不承担责任：<ul><li>因使用本软件导致的业务中断</li><li>数据丢失或损坏</li><li>软件与第三方系统的兼容性问题</li></ul>',
  },
  {
    title: '5. 数据隐私',
    content:
      '我们承诺保护您的数据安全：<ul><li>严格遵守GDPR数据保护条例</li><li>加密存储所有用户数据</li><li>未经许可不会共享任何商业信息</li></ul>',
  },
  {
    title: '6. 协议变更',
    content:
      '我们保留随时修改本协议的权利，重大变更将通过官方渠道提前30天通知。',
  },
];

const toggleTheme = (): void => {
  const newTheme = appStore.theme === 'dark' ? 'light' : 'dark';
  appStore.setTheme(newTheme);
  updateBodyBackground();
};

const handleScroll = (): void => {
  showScrollButton.value = window.pageYOffset > 300;
};

const scrollToTop = (): void => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const updateBodyBackground = (): void => {
  document.body.style.backgroundColor =
    appStore.theme === 'dark' ? '#1e1e2f' : '#f5f5f5';
};

const agreeWithTerms = (): void => {
  if (agreeInProgress.value) return;
  agreeInProgress.value = true;

  try { localStorage.setItem('qmx_agreed_to_terms', 'true'); } catch {}

  const btn = document.querySelector('.agree-button') as HTMLButtonElement;
  if (btn) btn.innerText = '✅ 正在处理...';

  setTimeout(() => {
    showAgreeButton.value = false;
    openMainWindow();
    agreeInProgress.value = true;
  }, 800);
};

const sanitizeContent = (content: string): string => {
  // 安全的HTML净化函数，防止XSS攻击
  const allowedTags = ['ul', 'ol', 'li', 'code', 'strong', 'em', 'br', 'p'];
  const allowedAttributes = ['class', 'aria-label'];
  
  // 严格拒绝不在白名单中的标签、属性和协议
  const tempDiv = document.createElement('div');
  
  // 使用textContent先转义所有HTML，然后只允许特定标签
  const escapedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // 只允许特定的安全标签重新解析（严格白名单）
  let safeContent = escapedContent;
  allowedTags.forEach(tag => {
    const openTagRegex = new RegExp(`&lt;${tag}(&gt;|\\s[^&gt;]*&gt;)`, 'gi');
    const closeTagRegex = new RegExp(`&lt;/${tag}&gt;`, 'gi');
    
    safeContent = safeContent
      .replace(openTagRegex, (match) => {
        // 只保留class属性
        const cleanMatch = match.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const hasClass = /class\s*=\s*["'][^"']*["']/.test(cleanMatch);
        if (hasClass) {
          return cleanMatch
            .replace(/\s+(?!class|aria-label)[a-zA-Z-]+\s*=\s*["'][^"']*["']/g, '')
            .replace(/on\w+\s*=\s*['"][^'"]*['"]/gi, '');
        }
        return `<${tag}>`;
      })
      .replace(closeTagRegex, `</${tag}>`);
  });
  
  // 验证最终内容的安全性
  tempDiv.innerHTML = safeContent;
  
  // 递归清理所有不安全的属性和脚本
  const cleanElement = (element: Element): void => {
    Array.from(element.children).forEach(child => {
      // 移除所有事件处理属性和危险属性
      Array.from(child.attributes).forEach(attr => {
        if (!allowedAttributes.includes(attr.name.toLowerCase()) || 
            attr.name.toLowerCase().startsWith('on') || 
            /\bjavascript:/i.test(attr.value) ||
            /^data:/i.test(attr.value)) {
          child.removeAttribute(attr.name);
        }
      });
      cleanElement(child);
    });
  };
  
  cleanElement(tempDiv);
  
  // 最终安全检查：移除任何可能的脚本内容
  const finalContent = tempDiv.innerHTML
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*['"][^'"]*['"]/gi, '')
    .replace(/\sstyle\s*=\s*['"][^'"]*['"]/gi, '')
    .replace(/\s(src|href)\s*=\s*['"][^'"]*['"]/gi, (m) => (/javascript:|^data:/i.test(m) ? '' : m));
  
  return finalContent;
};

const openMainWindow = async (): Promise<void> => {
  try {
    document.body.classList.add('transition-out');

    if ((window as any).__TAURI__) {
      const { invoke } = (window as any).__TAURI__.tauri;
      await invoke('open_main_window');
      const { getCurrentWindow } = (window as any).__TAURI__.window;
      await getCurrentWindow().close();
    } else {
      console.log('感谢您的同意！即将进入启明星管理软件主界面');
      location.reload();
    }
  } catch (error) {
    if (import.meta.env?.MODE !== 'production') console.error('打开主窗口失败:', error);
    // 在Web环境下使用页面内通知替代alert
    const notice = document.createElement('div');
    notice.textContent = '感谢您的同意！主应用启动失败，请重试。';
    notice.style.position = 'fixed';
    notice.style.bottom = '20px';
    notice.style.left = '50%';
    notice.style.transform = 'translateX(-50%)';
    notice.style.background = '#f44336';
    notice.style.color = '#fff';
    notice.style.padding = '8px 12px';
    notice.style.borderRadius = '6px';
    notice.style.zIndex = '1000';
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 2000);
  }
};

onMounted(() => {
  // 初始化主题（如果还没初始化）
  if (!localStorage.getItem('theme')) {
    appStore.initTheme();
  }
  updateBodyBackground();

  window.addEventListener('scroll', handleScroll);

  agreeTimer.value = window.setTimeout(() => {
    showAgreeButton.value = true;
    nextTick(() => {
      isAnimationReady.value = true;
    });
  }, 1000);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  if (agreeTimer.value) {
    window.clearTimeout(agreeTimer.value);
  }
});
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
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
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
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
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
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
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.2);
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
  0% {
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(33, 150, 243, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
  }
}

ul,
ol {
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
  border: 1px solid rgba(0, 0, 0, 0.05);
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
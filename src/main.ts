import { createApp, defineAsyncComponent } from 'vue';
import { createPinia } from 'pinia';
import MainApp from './MainApp.vue';
import pinia from './stores';

const KEY_AGREED = 'qmx_agreed_to_terms';

let agreedToTerms = 'false';
try {
  agreedToTerms = localStorage.getItem(KEY_AGREED) || 'false';
} catch {}

if (agreedToTerms === 'true') {
  const app = createApp(MainApp);
  app.use(pinia);
  app.mount('#app');
} else {
  // UserAgreement 懒加载（首次访问时才加载）
  const UserAgreement = defineAsyncComponent(() => import('./components/UserAgreement.vue'));
  const app = createApp(UserAgreement);
  app.use(createPinia()); // 为协议页面也创建Pinia实例
  app.mount('#app');
}

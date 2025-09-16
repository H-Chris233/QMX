import { createApp } from 'vue';
import UserAgreement from './components/UserAgreement.vue';
import MainApp from './MainApp.vue';

const KEY_AGREED = 'qmx_agreed_to_terms';

let agreedToTerms = 'false';
try {
  agreedToTerms = localStorage.getItem(KEY_AGREED) || 'false';
} catch {}

if (agreedToTerms === 'true') {
  createApp(MainApp).mount('#app');
} else {
  createApp(UserAgreement).mount('#app');
}

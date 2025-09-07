import { createApp } from "vue";
import Useragent from "./components/UserAgreement.vue";
import MainApp from "./MainApp.vue";

// 检查是否已经同意协议
const agreedToTerms = localStorage.getItem('agreedToTerms');

if (agreedToTerms === 'true') {
  // 已同意协议，显示主应用
  createApp(MainApp).mount("#app");
} else {
  // 未同意协议，显示协议页面
  createApp(Useragent).mount("#app");
}

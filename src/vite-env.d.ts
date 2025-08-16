/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Tauri API 类型定义
declare interface Window {
  __TAURI__?: {
    tauri: {
      invoke: (command: string, args?: any) => Promise<any>;
    };
  };
}

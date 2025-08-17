// Tauri API 类型声明
interface TauriWindow {
  __TAURI__: {
    tauri: {
      invoke: (command: string, args?: any) => Promise<any>
    }
  }
}

declare global {
  interface Window extends TauriWindow {}
}

export {};
import { jestGlobalSetup } from './setupBackend';

export default async function globalSetup() {
  console.log('🚀 Jest 全局测试环境初始化...');
  await jestGlobalSetup();
}
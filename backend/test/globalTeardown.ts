import { jestGlobalTeardown } from './setupBackend';

export default async function globalTeardown() {
  console.log('🧹 Jest 全局测试环境清理...');
  await jestGlobalTeardown();
}
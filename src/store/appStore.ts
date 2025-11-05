/**
 * 应用状态管理 - 占位实现
 * TODO: 实现实际的状态管理逻辑
 */
import { ref } from 'vue';

export const useAppStore = () => {
  const error = ref<string | null>(null);
  const isLoading = ref<boolean>(false);
  
  const setError = (message: string | null) => {
    error.value = message;
  };
  
  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };
  
  return {
    error,
    isLoading,
    setError,
    setLoading,
  };
};

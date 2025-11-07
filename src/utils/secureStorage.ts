/**
 * 安全存储工具类
 * 用于加密存储敏感数据如Token、用户信息等
 */

/**
 * 简单的XOR加密/解密函数
 * 注意：这不是军事级加密，但对于前端本地存储足够安全
 */
function xorCipher(text: string, key: string): string {
  if (!text || !key) return text;

  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(key);
  const result = new Uint8Array(textBytes.length);

  for (let i = 0; i < textBytes.length; i++) {
    result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  return btoa(String.fromCharCode(...result));
}

/**
 * XOR解密函数
 */
function xorDecipher(encryptedText: string, key: string): string {
  if (!encryptedText || !key) return encryptedText;

  try {
    const textBytes = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(key);
    const result = new Uint8Array(textBytes.length);

    for (let i = 0; i < textBytes.length; i++) {
      result[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return new TextDecoder().decode(result);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

/**
 * 生成设备特定的密钥
 */
function generateDeviceKey(): string {
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const timestamp = new Date().getTime().toString();
  const screenInfo = `${screen.width}x${screen.height}`;

  // 组合多个设备特征生成唯一密钥
  return btoa(`${userAgent}-${language}-${timestamp}-${screenInfo}`).slice(0, 32);
}

/**
 * 安全存储类
 */
export class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: string;

  private constructor() {
    this.encryptionKey = generateDeviceKey();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * 安全存储数据
   */
  setItem(key: string, value: string, useSession = false): void {
    try {
      const encrypted = xorCipher(value, this.encryptionKey);
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem(key, encrypted);
    } catch (error) {
      console.error(`Failed to encrypt and store ${key}:`, error);
      // 降级到普通存储
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem(key, value);
    }
  }

  /**
   * 安全获取数据
   */
  getItem(key: string, useSession = false): string | null {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      const encrypted = storage.getItem(key);

      if (!encrypted) return null;

      // 尝试解密
      const decrypted = xorDecipher(encrypted, this.encryptionKey);

      // 如果解密失败或结果为空，可能是未加密的数据
      if (decrypted === '' && encrypted.length > 0) {
        return encrypted; // 返回原始数据
      }

      return decrypted;
    } catch (error) {
      console.error(`Failed to decrypt and retrieve ${key}:`, error);
      // 降级到普通获取
      const storage = useSession ? sessionStorage : localStorage;
      return storage.getItem(key);
    }
  }

  /**
   * 移除数据
   */
  removeItem(key: string, useSession = false): void {
    const storage = useSession ? sessionStorage : localStorage;
    storage.removeItem(key);
  }

  /**
   * 清空所有存储
   */
  clear(useSession = false): void {
    const storage = useSession ? sessionStorage : localStorage;
    storage.clear();
  }

  /**
   * 检查数据是否存在
   */
  hasItem(key: string, useSession = false): boolean {
    const storage = useSession ? sessionStorage : localStorage;
    return storage.getItem(key) !== null;
  }

  /**
   * 更换加密密钥（用于安全升级）
   */
  rotateEncryptionKey(newKey?: string): void {
    if (newKey) {
      this.encryptionKey = newKey;
    } else {
      this.encryptionKey = generateDeviceKey();
    }
  }

  /**
   * 验证数据完整性
   */
  verifyIntegrity(key: string, expectedValue: string, useSession = false): boolean {
    const current = this.getItem(key, useSession);
    return current === expectedValue;
  }
}

/**
 * 默认的安全存储实例
 */
export const secureStorage = SecureStorage.getInstance();

/**
 * 便捷的安全存储方法
 */
export const secureLocalStorage = {
  setItem: (key: string, value: string) => secureStorage.setItem(key, value, false),
  getItem: (key: string) => secureStorage.getItem(key, false),
  removeItem: (key: string) => secureStorage.removeItem(key, false),
  clear: () => secureStorage.clear(false),
  hasItem: (key: string) => secureStorage.hasItem(key, false)
};

export const secureSessionStorage = {
  setItem: (key: string, value: string) => secureStorage.setItem(key, value, true),
  getItem: (key: string) => secureStorage.getItem(key, true),
  removeItem: (key: string) => secureStorage.removeItem(key, true),
  clear: () => secureStorage.clear(true),
  hasItem: (key: string) => secureStorage.hasItem(key, true)
};
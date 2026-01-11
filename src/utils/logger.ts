/**
 * 前端日志工具
 * 统一管理日志输出，生产环境禁用 console
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel[];
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    // 开发环境启用所有日志，生产环境仅保留 error 和 warn
    this.config = {
      enabled: import.meta.env.DEV,
      level: import.meta.env.PROD ? ['error', 'warn'] : ['log', 'info', 'warn', 'error', 'debug']
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && this.config.level.includes(level);
  }

  log(...args: any[]): void {
    if (this.shouldLog('log')) {
      console.log(...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...args);
    }
  }

  /**
   * 组：开始一个日志组
   */
  group(label: string): void {
    if (this.config.enabled && import.meta.env.DEV) {
      console.group(label);
    }
  }

  /**
   * 组：结束一个日志组
   */
  groupEnd(): void {
    if (this.config.enabled && import.meta.env.DEV) {
      console.groupEnd();
    }
  }
}

// 导出单例
export const logger = new Logger();
export default logger;

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '@/config';

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// 控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// 创建日志传输器
const transports: winston.transport[] = [];

// 如果使用标准输出（Docker/生产环境）
if (config.logging.useStdout) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
} else {
  // 否则使用文件输出（开发环境）
  // 确保日志目录存在
  const logDir = path.dirname(config.logging.file);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // 错误日志文件
  transports.push(
    new winston.transports.File({
      filename: config.logging.file.replace('.log', '-error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // 所有日志文件
  transports.push(
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// 创建logger实例
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'qmx-backend' },
  transports,
});

// 开发环境额外输出到控制台（如果不是使用标准输出模式）
if (config.server.nodeEnv !== 'production' && !config.logging.useStdout) {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// 生产环境错误处理（仅在文件模式下）
if (config.server.nodeEnv === 'production' && !config.logging.useStdout) {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: config.logging.file.replace('.log', '-exceptions.log'),
    })
  );
}

export default logger;
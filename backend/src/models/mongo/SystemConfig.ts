import mongoose, { Schema, Document } from 'mongoose';
import logger from '@/utils/logger';

// 系统配置接口定义
export interface ISystemConfigDoc extends Document {
  key: string;
  value: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  
  // 方法
  getNumberValue(): number | null;
  getBooleanValue(): boolean;
  getJsonValue(): any;
  getArrayValue(): string[];
  getObjectValue(): Record<string, any>;
}

// 系统配置Schema
const SystemConfigSchema = new Schema<ISystemConfigDoc>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    comment: '配置键名'
  },
  value: {
    type: String,
    required: true,
    trim: true,
    comment: '配置值'
  },
  description: {
    type: String,
    default: null,
    trim: true,
    comment: '配置描述'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'system_configs',
  versionKey: false
});

// 实例方法：获取数字值
SystemConfigSchema.methods.getNumberValue = function(): number | null {
  const value = parseFloat(this.value);
  return isNaN(value) ? null : value;
};

// 实例方法：获取布尔值
SystemConfigSchema.methods.getBooleanValue = function(): boolean {
  const value = this.value.toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
};

// 实例方法：获取JSON值
SystemConfigSchema.methods.getJsonValue = function(): any | null {
  try {
    return JSON.parse(this.value);
  } catch (e) {
    return null;
  }
};

// 实例方法：获取数组值
SystemConfigSchema.methods.getArrayValue = function(): string[] {
  try {
    const parsed = JSON.parse(this.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // 如果不是JSON，尝试按逗号分割
    return this.value ? this.value.split(',').map(v => v.trim()).filter(v => v) : [];
  }
};

// 实例方法：获取对象值
SystemConfigSchema.methods.getObjectValue = function(): Record<string, any> {
  try {
    const parsed = JSON.parse(this.value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    return {};
  }
};

// 静态方法：获取配置值
SystemConfigSchema.statics.getConfig = function(key: string, defaultValue: any = null) {
  return this.findOne({ key }).then(config => {
    if (!config) return defaultValue;
    
    // 尝试自动解析类型
    if (config.value === 'true') return true;
    if (config.value === 'false') return false;
    if (!isNaN(Number(config.value)) && config.value !== '') return Number(config.value);
    
    try {
      return JSON.parse(config.value);
    } catch {
      return config.value;
    }
  });
};

// 静态方法：设置配置值
SystemConfigSchema.statics.setConfig = function(key: string, value: any, description?: string) {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  
  return this.findOneAndUpdate(
    { key },
    { 
      value: stringValue,
      description: description || null,
      updated_at: new Date()
    },
    { upsert: true, new: true }
  );
};

// 静态方法：删除配置
SystemConfigSchema.statics.deleteConfig = function(key: string) {
  return this.deleteOne({ key });
};

// 静态方法：获取所有配置
SystemConfigSchema.statics.getAllConfigs = function() {
  return this.find().sort({ key: 1 });
};

// 静态方法：初始化默认配置
SystemConfigSchema.statics.initDefaults = async function() {
  const defaults = [
    { key: 'app.name', value: 'QMX学生管理系统', description: '应用名称' },
    { key: 'app.version', value: '1.0.0', description: '应用版本' },
    { key: 'membership.default_days', value: '30', description: '默认会员天数' },
    { key: 'installment.default_frequency', value: 'monthly', description: '默认分期频率' },
    { key: 'notification.days_before_expiry', value: '7', description: '会员到期提醒天数' },
    { key: 'score.max_records', value: '20', description: '最大成绩记录数' },
  ];
  
  for (const config of defaults) {
    await this.setConfig(config.key, config.value, config.description);
  }
  
  logger.info('系统默认配置初始化完成');
};

// 中间件：数据验证和清理
SystemConfigSchema.pre('save', function(next) {
  if (this.isModified('key')) {
    this.key = this.key.trim();
  }
  if (this.isModified('value')) {
    this.value = this.value.trim();
  }
  if (this.isModified('description') && this.description) {
    this.description = this.description.trim();
  }
  next();
});

// 导出模型
const SystemConfig = mongoose.models.SystemConfig || mongoose.model<ISystemConfigDoc>('SystemConfig', SystemConfigSchema);
export default SystemConfig;
import mongoose, { Schema, Document } from 'mongoose';

// 系统配置接口定义
export interface ISystemConfigDoc extends Document {
  key: string;
  value: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
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

// 确保虚拟字段包含在JSON中
SystemConfigSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model<ISystemConfigDoc>('SystemConfig', SystemConfigSchema);
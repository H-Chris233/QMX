import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemConfigDoc extends Document {
  key: string;
  value: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

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

SystemConfigSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    const { _id: _omitId, __v: _omitVersion, ...rest } = ret;
    return rest;
  }
});

const SystemConfig: Model<ISystemConfigDoc> = (mongoose.models.SystemConfig as Model<ISystemConfigDoc> | undefined)
  ?? mongoose.model<ISystemConfigDoc>('SystemConfig', SystemConfigSchema);
export default SystemConfig;

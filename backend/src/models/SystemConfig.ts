import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';

// 系统配置模型
interface ISystemConfig {
  key: string;
  value: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface ISystemConfigCreationAttributes extends Optional<ISystemConfig, 'created_at' | 'updated_at'> {}

export class SystemConfig 
  extends Model<ISystemConfig, ISystemConfigCreationAttributes> 
  implements ISystemConfig {
  
  public key!: string;
  public value!: string;
  public description?: string;

  // 时间戳
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// 初始化模型
SystemConfig.init({
  key: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'system_configs',
  modelName: 'SystemConfig',
  timestamps: true,
  paranoid: false,
});

export default SystemConfig;
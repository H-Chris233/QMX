import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { 
  IInstallmentPlan, 
  PaymentFrequency 
} from '@/types';

// 分期付款计划创建属性类型
export type IInstallmentPlanCreationAttributes = Optional<IInstallmentPlan, 'plan_id' | 'created_at' | 'updated_at'>;

// 分期付款计划模型
export class InstallmentPlan 
  extends Model<IInstallmentPlan, IInstallmentPlanCreationAttributes> 
  implements IInstallmentPlan {
  
  public plan_id!: number;
  public total_amount!: number;
  public total_installments!: number;
  public frequency!: PaymentFrequency;
  public custom_days!: number | null;

  // 时间戳
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 实例方法
  public getInstallmentAmount(): number {
    return Number((this.total_amount / this.total_installments).toFixed(2));
  }

  public getFrequencyText(): string {
    switch (this.frequency) {
      case PaymentFrequency.WEEKLY:
        return '每周';
      case PaymentFrequency.MONTHLY:
        return '每月';
      case PaymentFrequency.QUARTERLY:
        return '每季度';
      case PaymentFrequency.CUSTOM:
        return `每${this.custom_days || 0}天`;
      default:
        return '未知';
    }
  }
}

// 初始化模型
InstallmentPlan.init({
  plan_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  total_amount: {
    type: DataTypes.BIGINT,
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: '总金额不能为负数',
      },
    },
    field: 'total_amount',
  },
  total_installments: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: '总期数至少为1',
      },
    },
    field: 'total_installments',
  },
  frequency: {
    type: DataTypes.ENUM(...Object.values(PaymentFrequency)),
    allowNull: false,
  },
  custom_days: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    validate: {
      min: 1,
      max: 365,
    },
    field: 'custom_days',
  },
}, {
  sequelize,
  tableName: 'installment_plans',
  modelName: 'InstallmentPlan',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['plan_id'],
    },
  ],
});

export default InstallmentPlan;
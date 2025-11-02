import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { 
  IInstallment, 
  IInstallmentCreationAttributes,
  InstallmentStatus,
  PaymentFrequency 
} from '@/types';

// 分期付款详情模型
export class Installment 
  extends Model<IInstallment, IInstallmentCreationAttributes> 
  implements IInstallment {
  
  public uid!: number;
  public plan_id!: number;
  public total_amount!: number;
  public total_installments!: number;
  public current_installment!: number;
  public frequency!: PaymentFrequency;
  public custom_days!: number | null;
  public due_date!: Date;
  public status!: InstallmentStatus;
  public createdAt!: Date;

  // 时间戳
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

  public getStatusText(): string {
    switch (this.status) {
      case InstallmentStatus.PENDING:
        return '待支付';
      case InstallmentStatus.PAID:
        return '已支付';
      case InstallmentStatus.OVERDUE:
        return '已逾期';
      case InstallmentStatus.CANCELLED:
        return '已取消';
      default:
        return '未知';
    }
  }

  public isOverdue(): boolean {
    return this.status === InstallmentStatus.PENDING && new Date() > this.due_date;
  }

  public getDaysOverdue(): number {
    if (!this.isOverdue()) {
      return 0;
    }
    const now = new Date();
    const diffTime = now.getTime() - this.due_date.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getProgress(): number {
    return Number(((this.current_installment / this.total_installments) * 100).toFixed(1));
  }
}

// 初始化模型
Installment.init({
  uid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'installment_plans',
      key: 'plan_id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    field: 'plan_id',
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
  current_installment: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: '当前期数至少为1',
      },
    },
    field: 'current_installment',
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
  due_date: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'due_date',
  },
  status: {
    type: DataTypes.ENUM(...Object.values(InstallmentStatus)),
    allowNull: false,
    defaultValue: InstallmentStatus.PENDING,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'createdAt',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updatedAt',
  },
}, {
  sequelize,
  tableName: 'installments',
  modelName: 'Installment',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['uid'],
    },
    {
      fields: ['plan_id'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['due_date'],
    },
    {
      fields: ['plan_id', 'current_installment'],
    },
  ],
});

export default Installment;
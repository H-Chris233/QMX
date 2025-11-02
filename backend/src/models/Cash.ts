import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { 
  ICash, 
  ICashCreationAttributes 
} from '@/types';

// 交易记录模型
export class Cash 
  extends Model<ICash, ICashCreationAttributes> 
  implements ICash {
  
  public uid!: number;
  public student_id!: number | null;
  public cash!: number;
  public note!: string | null;
  public created_at!: Date;

  // 时间戳
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 实例方法
  public getAmount(): number {
    return this.cash;
  }

  public isIncome(): boolean {
    return this.cash > 0;
  }

  public isExpense(): boolean {
    return this.cash < 0;
  }

  public getFormattedAmount(): string {
    const absAmount = Math.abs(this.cash);
    const prefix = this.cash >= 0 ? '+' : '-';
    return `${prefix}¥${absAmount.toFixed(2)}`;
  }

  public hasInstallment(): boolean {
    // 这个方法会在关联分期付款后实现
    return false; // 暂时返回false，后续关联分期付款表
  }
}

// 初始化模型
Cash.init({
  uid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'students',
      key: 'uid',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    field: 'student_id',
  },
  cash: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
    comment: '金额（分为单位，正数表示收入，负数表示支出）',
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  sequelize,
  tableName: 'cash_transactions',
  modelName: 'Cash',
  timestamps: true,
  paranoid: false,
  indexes: [
    {
      unique: true,
      fields: ['uid'],
    },
    {
      fields: ['student_id'],
    },
    {
      fields: ['cash'],
    },
    {
      fields: ['created_at'],
    },
    {
      fields: ['student_id', 'created_at'],
    },
  ],
});

export default Cash;
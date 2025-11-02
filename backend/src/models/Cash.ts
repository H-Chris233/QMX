import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { 
  ICash, 
  ICashCreationAttributes,
  Installment,
  InstallmentPlan
} from '@/models';

// 交易记录模型
export class Cash 
  extends Model<ICash, ICashCreationAttributes> 
  implements ICash {
  
  public uid!: number;
  public student_id!: number | null;
  public cash!: number;
  public note!: string | null;
  public createdAt!: Date;

  // 时间戳
  public readonly updatedAt!: Date;

  // 关联属性
  public student?: any;
  public installment?: any;
  public installment_plan?: any;

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
    return this.installment !== undefined && this.installment !== null;
  }

  public getInstallmentPlan(): any {
    return this.installment_plan;
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
  tableName: 'cash_transactions',
  modelName: 'Cash',
  timestamps: true,
  paranoid: false,
  hooks: {
    afterFind: (instances: any) => {
      // 为分期付款关联的现金记录设置关联
      const processInstance = (instance: any) => {
        if (instance && instance.note && typeof instance.note === 'string') {
          try {
            const noteData = JSON.parse(instance.note);
            if (noteData.installment_id) {
              instance.installment = { plan_id: noteData.installment_id };
            }
          } catch (e) {
            // 不是JSON格式的note，忽略
          }
        }
      };

      if (Array.isArray(instances)) {
        instances.forEach(processInstance);
      } else if (instances) {
        processInstance(instances);
      }
    }
  },
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
      fields: ['createdAt'],
    },
    {
      fields: ['student_id', 'createdAt'],
    },
  ],
}) as any;

// 注意：由于原有设计将分期信息嵌入在note字段中，我们通过虚拟关联实现
Object.defineProperty(Cash.prototype, 'installment_plan', {
  get: function(this: any) {
    if (this.note && typeof this.note === 'string') {
      try {
        const noteData = JSON.parse(this.note);
        if (noteData.installment_id) {
          return {
            plan_id: noteData.installment_id,
            installment_number: noteData.installment_number
          };
        }
      } catch (e) {
        // 解析失败，返回undefined
      }
    }
    return undefined;
  }
});

export default Cash;
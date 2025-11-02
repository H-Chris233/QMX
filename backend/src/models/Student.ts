import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { 
  IStudent, 
  IStudentCreationAttributes, 
  ClassType, 
  SubjectType 
} from '@/types';

// 学生模型
export class Student 
  extends Model<IStudent, IStudentCreationAttributes> 
  implements IStudent {
  
  public uid!: number;
  public age!: number | null;
  public name!: string;
  public phone!: string;
  public lesson_left!: number | null;
  public class!: ClassType;
  public subject!: SubjectType;
  public rings!: number[];
  public note!: string;
  public membership_start_date!: Date | null;
  public membership_end_date!: Date | null;

  // 时间戳
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // 实例方法
  public getFullName(): string {
    return this.name;
  }

  public getAge(): number | null {
    return this.age;
  }

  public getDisplayName(): string {
    return `${this.name} (${this.phone})`;
  }

  public hasMembership(): boolean {
    if (!this.membership_start_date || !this.membership_end_date) {
      return false;
    }
    const now = new Date();
    return now >= this.membership_start_date && now <= this.membership_end_date;
  }

  public getMembershipDaysRemaining(): number | null {
    if (!this.membership_end_date) {
      return null;
    }
    const now = new Date();
    if (now > this.membership_end_date) {
      return 0;
    }
    const diffTime = this.membership_end_date.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public getAverageScore(): number {
    if (this.rings.length === 0) {
      return 0;
    }
    const sum = this.rings.reduce((acc, score) => acc + score, 0);
    return Number((sum / this.rings.length).toFixed(1));
  }

  public getMaxScore(): number {
    if (this.rings.length === 0) {
      return 0;
    }
    return Math.max(...this.rings);
  }

  public getMinScore(): number {
    if (this.rings.length === 0) {
      return 0;
    }
    return Math.min(...this.rings);
  }

  public addScore(score: number): void {
    this.rings.push(score);
    this.changed('rings', true);
  }

  public removeScore(index: number): void {
    if (index >= 0 && index < this.rings.length) {
      this.rings.splice(index, 1);
      this.changed('rings', true);
    }
  }

  public updateScore(index: number, newScore: number): void {
    if (index >= 0 && index < this.rings.length) {
      this.rings[index] = newScore;
      this.changed('rings', true);
    }
  }
}

// 初始化模型
Student.init({
  uid: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  age: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: true,
    validate: {
      min: 0,
      max: 120,
    },
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: '学员姓名不能为空',
      },
      len: {
        args: [1, 50],
        msg: '学员姓名长度必须在1-50字符之间',
      },
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '未填写',
    validate: {
      is: {
        args: /^1[3-9]\d{9}$|^未填写$/,
        msg: '手机号格式不正确',
      },
    },
  },
  lesson_left: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    validate: {
      min: 0,
    },
    field: 'lesson_left',
  },
  class: {
    type: DataTypes.ENUM(...Object.values(ClassType)),
    allowNull: false,
    defaultValue: ClassType.OTHERS,
  },
  subject: {
    type: DataTypes.ENUM(...Object.values(SubjectType)),
    allowNull: false,
    defaultValue: SubjectType.OTHERS,
  },
  rings: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    get() {
      const value = this.getDataValue('rings');
      return Array.isArray(value) ? value : [];
    },
    set(value: number[]) {
      this.setDataValue('rings', Array.isArray(value) ? value : []);
    },
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '',
  },
  membership_start_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'membership_start_date',
  },
  membership_end_date: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'membership_end_date',
  },
}, {
  sequelize,
  tableName: 'students',
  modelName: 'Student',
  timestamps: true,
  paranoid: false, // 不使用软删除
  indexes: [
    {
      unique: true,
      fields: ['uid'],
    },
    {
      fields: ['name'],
    },
    {
      fields: ['phone'],
    },
    {
      fields: ['class'],
    },
    {
      fields: ['subject'],
    },
    {
      fields: ['membership_start_date', 'membership_end_date'],
    },
  ],
});

export default Student;
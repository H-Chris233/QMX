import { Document, Schema, model } from 'mongoose';

export interface ICounterDoc extends Document {
  _id: string;
  sequence_name: string;
  sequence_value: number;
}

export const COUNTER_SEQUENCES = {
  STUDENT: 'studentId',
  CASH: 'cashId',
  INSTALLMENT: 'installmentId',
  INSTALLMENT_PLAN: 'installmentPlanId'
} as const;

export type SequenceName = typeof COUNTER_SEQUENCES[keyof typeof COUNTER_SEQUENCES];

const CounterSchema = new Schema<ICounterDoc>({
  _id: {
    type: String,
    required: true
  },
  sequence_name: {
    type: String,
    required: true
  },
  sequence_value: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  collection: 'counters',
  versionKey: false
});

CounterSchema.index({ sequence_name: 1 }, { unique: true });

const CounterModel = model<ICounterDoc>('Counter', CounterSchema);

const buildCounterError = (sequence: string, error: unknown): Error => {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`计数器序列「${sequence}」操作失败: ${detail}`);
};

export const getNextSequence = async (sequence: string): Promise<number> => {
  try {
    const counter = await CounterModel.findOneAndUpdate(
      { _id: sequence },
      {
        $inc: { sequence_value: 1 },
        $setOnInsert: {
          sequence_name: sequence,
          sequence_value: 0
        }
      },
      {
        new: true,
        upsert: true
      }
    ).exec();

    if (!counter) {
      throw new Error('计数器返回值为空');
    }

    return counter.sequence_value;
  } catch (error) {
    throw buildCounterError(sequence, error);
  }
};

export const resetSequence = async (sequence: string, value = 0): Promise<number> => {
  try {
    const counter = await CounterModel.findOneAndUpdate(
      { _id: sequence },
      {
        $set: {
          sequence_name: sequence,
          sequence_value: value
        }
      },
      {
        new: true,
        upsert: true
      }
    ).exec();

    if (!counter) {
      throw new Error('计数器返回值为空');
    }

    return counter.sequence_value;
  } catch (error) {
    throw buildCounterError(sequence, error);
  }
};

export const {
  STUDENT: STUDENT_SEQUENCE_NAME,
  CASH: CASH_SEQUENCE_NAME,
  INSTALLMENT: INSTALLMENT_SEQUENCE_NAME,
  INSTALLMENT_PLAN: INSTALLMENT_PLAN_SEQUENCE_NAME
} = COUNTER_SEQUENCES;

export default CounterModel;

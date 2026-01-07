-- QMX PostgreSQL 初始化迁移
-- 根据 MongoDB Schema 转换为 PostgreSQL

BEGIN;

-- ============================================
-- 1. 创建更新时间触发器函数
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 2. 创建 students 表
-- ============================================
CREATE TABLE "students" (
    "uid" SERIAL PRIMARY KEY,

    -- 基本信息
    "name" VARCHAR(50) NOT NULL,
    "age" SMALLINT,
    "phone" VARCHAR(20) NOT NULL,

    -- 分类信息
    "class_type" VARCHAR(20) NOT NULL DEFAULT 'TEN_TRY',
    "subject" VARCHAR(20) NOT NULL DEFAULT 'SHOOTING',

    -- 课程信息
    "lesson_left" INTEGER DEFAULT 0,

    -- 成绩数组 (PostgreSQL 原生数组)
    "rings" REAL[] DEFAULT '{}',

    -- 备注
    "note" TEXT,

    -- 会员信息
    "membership_start_date" DATE,
    "membership_end_date" DATE,

    -- 时间戳
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT "valid_class_type" CHECK (class_type IN ('TEN_TRY', 'MONTH', 'YEAR', 'OTHERS')),
    CONSTRAINT "valid_subject" CHECK (subject IN ('SHOOTING', 'ARCHERY', 'OTHERS')),
    CONSTRAINT "valid_membership_dates" CHECK (
        membership_end_date IS NULL OR
        membership_start_date IS NULL OR
        membership_end_date >= membership_start_date
    )
);

-- students 表索引
CREATE INDEX "idx_students_name" ON "students"("name");
CREATE INDEX "idx_students_phone" ON "students"("phone");
CREATE INDEX "idx_students_class_type" ON "students"("class_type");
CREATE INDEX "idx_students_subject" ON "students"("subject");
CREATE INDEX "idx_students_membership_end" ON "students"("membership_end_date");
CREATE INDEX "idx_students_created_at" ON "students"("created_at");

-- 更新时间触发器
CREATE TRIGGER "update_students_updated_at"
    BEFORE UPDATE ON "students"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. 创建 cash_transactions 表
-- ============================================
CREATE TABLE "cash_transactions" (
    "uid" SERIAL PRIMARY KEY,

    -- 关联学员 (可为空，表示非学员交易)
    "student_id" INTEGER REFERENCES "students"("uid") ON DELETE SET NULL,

    -- 金额 (单位：分，正数收入，负数支出)
    "amount" BIGINT NOT NULL,

    -- 备注
    "note" TEXT,

    -- 分期快照 (JSONB 存储嵌入式文档)
    "installment_snapshot" JSONB,

    -- 时间戳
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT "valid_amount" CHECK (amount >= -999999999999 AND amount <= 999999999999)
);

-- cash_transactions 表索引
CREATE INDEX "idx_cash_student_id" ON "cash_transactions"("student_id");
CREATE INDEX "idx_cash_amount" ON "cash_transactions"("amount");
CREATE INDEX "idx_cash_created_at" ON "cash_transactions"("created_at");
CREATE INDEX "idx_cash_installment" ON "cash_transactions"
    USING GIN ("installment_snapshot")
    WHERE "installment_snapshot" IS NOT NULL;

-- 更新时间触发器
CREATE TRIGGER "update_cash_updated_at"
    BEFORE UPDATE ON "cash_transactions"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. 创建 installment_plans 表
-- ============================================
CREATE TABLE "installment_plans" (
    "uid" SERIAL PRIMARY KEY,

    -- 关联学员
    "student_id" INTEGER NOT NULL REFERENCES "students"("uid") ON DELETE RESTRICT,

    -- 金额信息 (单位：分)
    "total_amount" BIGINT NOT NULL,
    "down_payment" BIGINT DEFAULT 0,

    -- 分期信息
    "total_installments" SMALLINT NOT NULL,
    "frequency" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "custom_days" INTEGER,

    -- 状态
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    -- 备注
    "note" TEXT,

    -- 时间戳
    "start_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT "valid_frequency" CHECK (frequency IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM')),
    CONSTRAINT "valid_plan_status" CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT "valid_total_amount" CHECK (total_amount > 0),
    CONSTRAINT "valid_total_installments" CHECK (total_installments > 0)
);

-- installment_plans 表索引
CREATE INDEX "idx_plans_student_id" ON "installment_plans"("student_id");
CREATE INDEX "idx_plans_status" ON "installment_plans"("status");
CREATE INDEX "idx_plans_created_at" ON "installment_plans"("created_at");

-- 更新时间触发器
CREATE TRIGGER "update_plans_updated_at"
    BEFORE UPDATE ON "installment_plans"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 创建 installments 表
-- ============================================
CREATE TABLE "installments" (
    "uid" SERIAL PRIMARY KEY,

    -- 关联分期计划
    "plan_id" INTEGER NOT NULL REFERENCES "installment_plans"("uid") ON DELETE CASCADE,

    -- 关联学员 (冗余字段，便于查询)
    "student_id" INTEGER NOT NULL REFERENCES "students"("uid") ON DELETE RESTRICT,

    -- 关联交易记录 (支付后关联)
    "cash_uid" INTEGER REFERENCES "cash_transactions"("uid") ON DELETE SET NULL,

    -- 分期信息
    "installment_number" SMALLINT NOT NULL,
    "installment_amount" BIGINT NOT NULL,
    "paid_amount" BIGINT DEFAULT 0,

    -- 日期
    "due_date" DATE NOT NULL,
    "paid_date" DATE,

    -- 状态
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    -- 备注
    "note" TEXT,

    -- 时间戳
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT "valid_installment_status" CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
    CONSTRAINT "valid_installment_amount" CHECK (installment_amount > 0),
    CONSTRAINT "valid_paid_amount" CHECK (paid_amount >= 0),
    CONSTRAINT "unique_plan_installment" UNIQUE ("plan_id", "installment_number")
);

-- installments 表索引
CREATE INDEX "idx_installments_plan_id" ON "installments"("plan_id");
CREATE INDEX "idx_installments_student_id" ON "installments"("student_id");
CREATE INDEX "idx_installments_status" ON "installments"("status");
CREATE INDEX "idx_installments_due_date" ON "installments"("due_date");
CREATE INDEX "idx_installments_cash_uid" ON "installments"("cash_uid");

-- 逾期分期查询优化索引
CREATE INDEX "idx_installments_overdue" ON "installments"("due_date", "status")
    WHERE status = 'PENDING';

-- 更新时间触发器
CREATE TRIGGER "update_installments_updated_at"
    BEFORE UPDATE ON "installments"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. 创建 system_configs 表
-- ============================================
CREATE TABLE "system_configs" (
    "key" VARCHAR(100) PRIMARY KEY,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 更新时间触发器
CREATE TRIGGER "update_configs_updated_at"
    BEFORE UPDATE ON "system_configs"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. 创建迁移记录表 (Drizzle 默认)
-- ============================================
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    "id" SERIAL PRIMARY KEY,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "name" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_by" VARCHAR(255) NOT NULL
);

CREATE SCHEMA IF NOT EXISTS "drizzle";

COMMIT;

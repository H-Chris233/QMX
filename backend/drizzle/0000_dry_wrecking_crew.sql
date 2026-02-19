CREATE TABLE "students" (
	"uid" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"age" smallint,
	"phone" varchar(11) NOT NULL,
	"class_type" varchar(20) DEFAULT 'TEN_TRY' NOT NULL,
	"subject" varchar(20) DEFAULT 'SHOOTING' NOT NULL,
	"lesson_left" integer DEFAULT 0,
	"rings" real[] DEFAULT '{}',
	"note" text,
	"membership_start_date" date,
	"membership_end_date" date,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "valid_class_type" CHECK ("students"."class_type" IN ('TEN_TRY', 'MONTH', 'YEAR', 'OTHERS')),
	CONSTRAINT "valid_subject" CHECK ("students"."subject" IN ('SHOOTING', 'ARCHERY', 'SHOOTING_ARCHERY', 'OTHERS')),
	CONSTRAINT "valid_membership_dates" CHECK (("students"."membership_end_date" IS NULL OR "students"."membership_start_date" IS NULL OR "students"."membership_end_date" >= "students"."membership_start_date"))
);
--> statement-breakpoint
CREATE TABLE "cash_transactions" (
	"uid" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"amount" bigint NOT NULL,
	"note" text,
	"installment_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "valid_amount" CHECK ("cash_transactions"."amount" >= -999999999999 AND "cash_transactions"."amount" <= 999999999999)
);
--> statement-breakpoint
CREATE TABLE "installment_plans" (
	"uid" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"total_amount" bigint NOT NULL,
	"down_payment" bigint DEFAULT 0,
	"total_installments" smallint NOT NULL,
	"frequency" varchar(20) DEFAULT 'MONTHLY' NOT NULL,
	"custom_days" integer,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"note" text,
	"start_date" date DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "valid_frequency" CHECK ("installment_plans"."frequency" IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'CUSTOM')),
	CONSTRAINT "valid_plan_status" CHECK ("installment_plans"."status" IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
	CONSTRAINT "valid_total_amount" CHECK ("installment_plans"."total_amount" > 0),
	CONSTRAINT "valid_total_installments" CHECK ("installment_plans"."total_installments" > 0)
);
--> statement-breakpoint
CREATE TABLE "installments" (
	"uid" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"cash_uid" integer,
	"installment_number" smallint NOT NULL,
	"installment_amount" bigint NOT NULL,
	"paid_amount" bigint DEFAULT 0,
	"due_date" date NOT NULL,
	"paid_date" date,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "installments_plan_id_installment_number_unique" UNIQUE("plan_id","installment_number"),
	CONSTRAINT "valid_installment_status" CHECK ("installments"."status" IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
	CONSTRAINT "valid_installment_amount" CHECK ("installments"."installment_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "system_configs" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_student_id_students_uid_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("uid") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_student_id_students_uid_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_plan_id_installment_plans_uid_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."installment_plans"("uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_student_id_students_uid_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("uid") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_cash_uid_cash_transactions_uid_fk" FOREIGN KEY ("cash_uid") REFERENCES "public"."cash_transactions"("uid") ON DELETE set null ON UPDATE no action;
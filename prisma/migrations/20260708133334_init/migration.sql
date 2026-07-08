-- CreateTable
CREATE TABLE "Academy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "owner_id" TEXT NOT NULL,
    "subscription_plan" TEXT NOT NULL DEFAULT 'free',
    "subscription_status" TEXT NOT NULL DEFAULT 'active',
    "subscription_expires" TEXT,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "Academy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "branch_id" TEXT,
    "branch_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "photo_url" TEXT,
    "joining_date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branch_code" TEXT,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "working_hours" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TEXT NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "alt_mobile" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "dob" TEXT,
    "gender" TEXT,
    "admission_date" TEXT,
    "branch_id" TEXT NOT NULL,
    "batch" TEXT NOT NULL DEFAULT '',
    "course" TEXT NOT NULL DEFAULT '',
    "photo_url" TEXT,
    "emergency_contact" TEXT NOT NULL DEFAULT '',
    "medical_notes" TEXT NOT NULL DEFAULT '',
    "monthly_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "join_date" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TEXT NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "marked_by" TEXT NOT NULL,
    "marked_at" TEXT NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT NOT NULL DEFAULT '',
    "marked_by" TEXT NOT NULL,
    "marked_at" TEXT NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fee" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'monthly',
    "amount" DOUBLE PRECISION NOT NULL,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TEXT NOT NULL,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "fee_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "paid_date" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "recorded_by" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "trainer_id" TEXT,
    "title" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TEXT NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "academy_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_academy_id_role_idx" ON "User"("academy_id", "role");

-- CreateIndex
CREATE INDEX "Branch_academy_id_idx" ON "Branch"("academy_id");

-- CreateIndex
CREATE INDEX "Student_academy_id_branch_id_idx" ON "Student"("academy_id", "branch_id");

-- CreateIndex
CREATE INDEX "Student_academy_id_status_idx" ON "Student"("academy_id", "status");

-- CreateIndex
CREATE INDEX "Attendance_academy_id_branch_id_date_idx" ON "Attendance"("academy_id", "branch_id", "date");

-- CreateIndex
CREATE INDEX "Attendance_academy_id_marked_by_date_idx" ON "Attendance"("academy_id", "marked_by", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_academy_id_branch_id_date_key" ON "ClassSession"("academy_id", "branch_id", "date");

-- CreateIndex
CREATE INDEX "Fee_academy_id_student_id_idx" ON "Fee"("academy_id", "student_id");

-- CreateIndex
CREATE INDEX "Payment_academy_id_student_id_idx" ON "Payment"("academy_id", "student_id");

-- CreateIndex
CREATE INDEX "Schedule_academy_id_branch_id_idx" ON "Schedule"("academy_id", "branch_id");

-- CreateIndex
CREATE INDEX "Schedule_academy_id_trainer_id_idx" ON "Schedule"("academy_id", "trainer_id");

-- CreateIndex
CREATE INDEX "AuditLog_academy_id_created_at_idx" ON "AuditLog"("academy_id", "created_at");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_fee_id_fkey" FOREIGN KEY ("fee_id") REFERENCES "Fee"("id") ON DELETE CASCADE ON UPDATE CASCADE;


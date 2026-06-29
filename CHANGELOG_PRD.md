# AM 360 — PRD alignment (this build)

## Implemented in this pass (business logic, same stack)
DATA MODEL (Prisma/Postgres) expanded to the PRD:
- Branch: branch_code, working_hours, status (active/inactive)
- Trainer(User): username, address, photo_url, joining_date, status, must_change_password
- Student: parent_name, alt_mobile, address, dob, gender, admission_date, batch, course,
  photo_url, emergency_contact, medical_notes, status
- Fee: type (monthly/admission), paid_amount, due_date  +  Payment model (payment history)
- AuditLog model
- Academy: subscription_plan / status / expires

BUSINESS LOGIC / APIs:
- Schedule conflict detection — a trainer cannot be booked in overlapping time on the
  same weekday across any branch (returns "Trainer is already assigned during this time.")
- Password reset by owner -> temp password + forced change on next login
  (POST /api/trainers/[id]/reset-password, /api/auth/change-password, redirect wired)
- Activate / deactivate (soft delete via status) for branches, trainers, students;
  list endpoints hide inactive by default (?include_inactive=1 to show)
- Transfer student between branches (POST /api/students/[id]/transfer) + trainer transfer (audited)
- Audit logging on all key mutations + owner viewer (/admin/audit, GET /api/audit)
- Fee payment history: each payment recorded, paid_amount accumulates, status recomputed
- Student search & filter: ?q= , ?batch= , ?course= , ?branch_id=
- Cloudinary image storage (URLs only, no base64): POST /api/uploads/sign + uploadImage()
  helper; logo and attendance photos now upload to Cloudinary
- Dashboard: added classes_today and monthly_revenue

## Still TODO (Phase 2/3 — recommend a fresh chat)
- Reports + PDF/Excel export (daily/monthly attendance, fee collection, trainer performance)
- Full UI forms for all new student/trainer fields (DOB, gender, batch, course, photo, etc.)
- Deactivate / transfer / reset-password BUTTONS on admin lists (APIs are ready)
- Attendance photo gallery + fullscreen viewer; attendance history browser
- Subscription management UI; notification stubs (WhatsApp/SMS/push)
- Pagination UI on long lists (API supports skip/limit on audit; extend to students)

## Setup note
- Set CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET (see .env.example) for image uploads.
- Run `npx prisma db push` after setting DATABASE_URL to create the new tables.

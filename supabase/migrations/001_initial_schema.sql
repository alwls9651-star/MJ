create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.students (
  id uuid primary key default gen_random_uuid(), academic_year integer not null,
  grade integer not null constraint students_grade_check check (grade between 1 and 3),
  department text not null,
  student_number integer not null constraint students_number_check check (student_number >= 1),
  name text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint students_identity_unique unique (academic_year, grade, department, student_number)
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null, role text not null constraint teachers_role_check check (role in ('admin','teacher')),
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(), academic_year integer not null, sequence integer not null, subject text not null,
  lecture_start_date date not null, lecture_end_date date not null, lecture_days text, eligibility text not null,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  capacity integer not null constraint courses_capacity_check check (capacity > 0), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint courses_date_range_check check (lecture_end_date >= lecture_start_date),
  constraint courses_year_sequence_unique unique (academic_year, sequence)
);

create table public.application_settings (
  id uuid primary key default gen_random_uuid(), academic_year integer not null,
  application_start timestamptz not null, application_end timestamptz not null, is_open boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint application_settings_range_check check (application_end > application_start)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  status text not null default 'applied' constraint applications_status_check check (status in ('applied','cancelled')),
  applied_at timestamptz not null default now(), cancelled_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint applications_cancelled_at_check check ((status='applied' and cancelled_at is null) or (status='cancelled' and cancelled_at is not null))
);

create unique index application_settings_one_open_per_year_idx on public.application_settings (academic_year) where is_open=true;
create unique index applications_one_active_per_student_idx on public.applications (student_id) where status='applied';
create index students_lookup_idx on public.students (academic_year,grade,department,student_number);
create index courses_year_active_idx on public.courses (academic_year,is_active);
create index courses_teacher_idx on public.courses (teacher_id);
create index applications_student_idx on public.applications (student_id);
create index applications_course_idx on public.applications (course_id);
create index applications_status_idx on public.applications (status);
create index applications_applied_at_idx on public.applications (applied_at);
create index applications_course_roster_idx on public.applications (course_id,status,applied_at);

create trigger students_set_updated_at before update on public.students for each row execute function public.set_updated_at();
create trigger teachers_set_updated_at before update on public.teachers for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger application_settings_set_updated_at before update on public.application_settings for each row execute function public.set_updated_at();
create trigger applications_set_updated_at before update on public.applications for each row execute function public.set_updated_at();

comment on table public.courses is '학생용 API에서는 teacher_id 및 교사 정보를 노출하지 않는다.';
comment on table public.application_settings is '신청 시간은 브라우저 시간이 아닌 PostgreSQL now()로 판정한다.';
comment on table public.applications is '실제 신청은 추후 transaction과 course row lock을 사용하는 RPC로만 처리한다.';

-- RLS는 인증/정책을 함께 구현하는 다음 단계까지 비활성으로 둔다.
-- 무정책 RLS로 현재 개발 접근을 전부 차단하지 않기 위한 결정이다.

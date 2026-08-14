create or replace function public.is_student_eligible(p_grade integer, p_eligibility text)
returns boolean
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select case p_eligibility
    when '전학년' then p_grade between 1 and 3
    when '1학년' then p_grade = 1
    when '2학년' then p_grade = 2
    when '3학년' then p_grade = 3
    when '1~2학년' then p_grade in (1, 2)
    when '2~3학년' then p_grade in (2, 3)
    else false
  end;
$$;

create or replace function public.apply_for_course(
  p_student_id uuid,
  p_course_id uuid,
  p_academic_year integer
)
returns table(
  success boolean,
  code text,
  application_id uuid,
  applied_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_student_grade integer;
  v_student_year integer;
  v_must_change_password boolean;
  v_password_updated_at timestamptz;
  v_course_year integer;
  v_course_active boolean;
  v_course_eligibility text;
  v_course_capacity integer;
  v_setting_start timestamptz;
  v_setting_end timestamptz;
  v_setting_open boolean;
  v_applied_count bigint;
  v_application_id uuid;
  v_applied_at timestamptz;
begin
  -- Every application request uses the same lock order: student, then course.
  select s.grade, s.academic_year, s.must_change_password, s.password_updated_at
    into v_student_grade, v_student_year, v_must_change_password, v_password_updated_at
  from public.students s
  where s.id = p_student_id
  for update;

  if not found then
    return query select false, 'STUDENT_NOT_FOUND'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_must_change_password or v_password_updated_at is null then
    return query select false, 'PASSWORD_CHANGE_REQUIRED'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select c.academic_year, c.is_active, c.eligibility, c.capacity
    into v_course_year, v_course_active, v_course_eligibility, v_course_capacity
  from public.courses c
  where c.id = p_course_id
  for update;

  if not found then
    return query select false, 'COURSE_NOT_FOUND'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_student_year <> p_academic_year or v_course_year <> p_academic_year or v_student_year <> v_course_year then
    return query select false, 'INVALID_YEAR'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if not v_course_active then
    return query select false, 'COURSE_INACTIVE'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select a.application_start, a.application_end, a.is_open
    into v_setting_start, v_setting_end, v_setting_open
  from public.application_settings a
  where a.academic_year = p_academic_year
  order by a.updated_at desc
  limit 1;

  if not found
     or not v_setting_open
     or now() < v_setting_start
     or now() >= v_setting_end then
    return query select false, 'NOT_OPEN'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if not public.is_student_eligible(v_student_grade, v_course_eligibility) then
    return query select false, 'NOT_ELIGIBLE'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if exists (
    select 1 from public.applications a
    where a.student_id = p_student_id and a.status = 'applied'
  ) then
    return query select false, 'ALREADY_APPLIED'::text, null::uuid, null::timestamptz;
    return;
  end if;

  -- This count happens only after the course row lock is acquired.
  select count(*) into v_applied_count
  from public.applications a
  where a.course_id = p_course_id and a.status = 'applied';

  if v_applied_count >= v_course_capacity then
    return query select false, 'FULL'::text, null::uuid, null::timestamptz;
    return;
  end if;

  begin
    insert into public.applications (student_id, course_id, status, applied_at)
    values (p_student_id, p_course_id, 'applied', now())
    returning id, applications.applied_at into v_application_id, v_applied_at;
  exception
    when unique_violation then
      return query select false, 'ALREADY_APPLIED'::text, null::uuid, null::timestamptz;
      return;
  end;

  return query select true, 'APPLIED'::text, v_application_id, v_applied_at;
end;
$$;

revoke all on function public.is_student_eligible(integer, text) from public, anon, authenticated;
revoke all on function public.apply_for_course(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.is_student_eligible(integer, text) to service_role;
grant execute on function public.apply_for_course(uuid, uuid, integer) to service_role;

-- Browser roles cannot read or mutate applications directly. Server service-role
-- helpers and the guarded RPC remain the only student application path.
revoke all on table public.applications from public, anon, authenticated;

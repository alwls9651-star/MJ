create or replace function public.cancel_course_application(
  p_student_id uuid,
  p_academic_year integer
)
returns table(
  success boolean,
  code text,
  application_id uuid,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_student_year integer;
  v_must_change_password boolean;
  v_password_updated_at timestamptz;
  v_application_id uuid;
  v_course_id uuid;
  v_course_year integer;
  v_setting_start timestamptz;
  v_setting_end timestamptz;
  v_setting_open boolean;
  v_cancelled_at timestamptz;
begin
  -- Keep the same lock order as apply_for_course: student, then course.
  select s.academic_year, s.must_change_password, s.password_updated_at
    into v_student_year, v_must_change_password, v_password_updated_at
  from public.students s
  where s.id = p_student_id
  for update;

  if not found then
    return query select false, 'STUDENT_NOT_FOUND'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_student_year <> p_academic_year then
    return query select false, 'INVALID_YEAR'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_must_change_password or v_password_updated_at is null then
    return query select false, 'PASSWORD_CHANGE_REQUIRED'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select a.id, a.course_id
    into v_application_id, v_course_id
  from public.applications a
  where a.student_id = p_student_id and a.status = 'applied'
  limit 1;

  if not found then
    return query select false, 'NO_ACTIVE_APPLICATION'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select c.academic_year into v_course_year
  from public.courses c
  where c.id = v_course_id
  for update;

  if not found or v_course_year <> p_academic_year or v_course_year <> v_student_year then
    return query select false, 'INVALID_YEAR'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select s.application_start, s.application_end, s.is_open
    into v_setting_start, v_setting_end, v_setting_open
  from public.application_settings s
  where s.academic_year = p_academic_year
  order by s.updated_at desc
  limit 1;

  if not found
     or not v_setting_open
     or now() < v_setting_start
     or now() >= v_setting_end then
    return query select false, 'NOT_OPEN'::text, null::uuid, null::timestamptz;
    return;
  end if;

  update public.applications a
  set status = 'cancelled', cancelled_at = now()
  where a.id = v_application_id
    and a.student_id = p_student_id
    and a.status = 'applied'
  returning a.cancelled_at into v_cancelled_at;

  if not found then
    return query select false, 'NO_ACTIVE_APPLICATION'::text, null::uuid, null::timestamptz;
    return;
  end if;

  return query select true, 'CANCELLED'::text, v_application_id, v_cancelled_at;
end;
$$;

revoke all on function public.cancel_course_application(uuid, integer) from public, anon, authenticated;
grant execute on function public.cancel_course_application(uuid, integer) to service_role;

-- Preserve Task 07's direct table access restriction.
revoke all on table public.applications from public, anon, authenticated;

create extension if not exists pgcrypto;

alter table public.students
  add column password_hash text,
  add column must_change_password boolean not null default true,
  add column password_updated_at timestamptz;

alter table public.teachers
  add column email text;

alter table public.teachers
  add constraint teachers_email_normalized_check
  check (email is null or (email = lower(btrim(email)) and length(email) > 3));

create unique index teachers_email_unique_idx
  on public.teachers (lower(email)) where email is not null;

create or replace function public.verify_student_credentials(
  p_academic_year integer,
  p_grade integer,
  p_department text,
  p_student_number integer,
  p_name text,
  p_password text
) returns table(student_id uuid, must_change_password boolean)
language sql security definer
set search_path = pg_catalog, public, extensions
as $$
  select s.id, s.must_change_password
  from public.students s
  where s.academic_year = p_academic_year
    and s.grade = p_grade
    and s.department = btrim(p_department)
    and s.student_number = p_student_number
    and s.name = btrim(p_name)
    and s.password_hash is not null
    and s.password_hash = crypt(p_password, s.password_hash)
  limit 1;
$$;

create or replace function public.set_student_temporary_password(
  p_student_id uuid,
  p_temporary_password text
) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if length(p_temporary_password) < 8
     or p_temporary_password !~ '[[:alpha:]]'
     or p_temporary_password !~ '[[:digit:]]' then
    raise exception 'password_policy_violation' using errcode = '22023';
  end if;
  update public.students
  set password_hash = crypt(p_temporary_password, gen_salt('bf', 12)),
      must_change_password = true,
      password_updated_at = now()
  where id = p_student_id;
  return found;
end;
$$;

create or replace function public.change_student_password(
  p_student_id uuid,
  p_current_password text,
  p_new_password text
) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, extensions
as $$
declare target public.students%rowtype;
begin
  if length(p_new_password) < 8
     or p_new_password !~ '[[:alpha:]]'
     or p_new_password !~ '[[:digit:]]' then
    return false;
  end if;
  select * into target from public.students where id = p_student_id for update;
  if not found or target.password_hash is null then return false; end if;
  if not target.must_change_password
     and (p_current_password is null or target.password_hash <> crypt(p_current_password, target.password_hash)) then
    return false;
  end if;
  update public.students
  set password_hash = crypt(p_new_password, gen_salt('bf', 12)),
      must_change_password = false,
      password_updated_at = now()
  where id = p_student_id;
  return true;
end;
$$;

revoke all on function public.verify_student_credentials(integer,integer,text,integer,text,text) from public, anon, authenticated;
revoke all on function public.set_student_temporary_password(uuid,text) from public, anon, authenticated;
revoke all on function public.change_student_password(uuid,text,text) from public, anon, authenticated;
grant execute on function public.verify_student_credentials(integer,integer,text,integer,text,text) to service_role;
grant execute on function public.set_student_temporary_password(uuid,text) to service_role;
grant execute on function public.change_student_password(uuid,text,text) to service_role;

comment on column public.students.password_hash is 'pgcrypto crypt() bcrypt hash only; plaintext passwords are never stored.';
comment on function public.set_student_temporary_password(uuid,text) is '관리자가 암호학적으로 무작위 생성한 임시 비밀번호를 설정할 때 service_role로 호출한다.';

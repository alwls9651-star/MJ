create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_teacher_id uuid not null references public.teachers(id) on delete restrict,
  action text not null check (action in ('student_password_reset')),
  target_type text not null check (target_type in ('student')),
  target_id uuid not null,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_admin_created_idx on public.admin_audit_logs (admin_teacher_id, created_at desc);
create index admin_audit_logs_target_idx on public.admin_audit_logs (target_type, target_id, created_at desc);

create or replace function public.initialize_student_password(p_student_id uuid, p_new_password text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
begin
  if length(p_new_password) < 8 or p_new_password !~ '[[:alpha:]]' or p_new_password !~ '[[:digit:]]' then return false; end if;
  update public.students set password_hash=crypt(p_new_password,gen_salt('bf',12)), must_change_password=false, password_updated_at=now()
  where id=p_student_id and password_hash is null;
  return found;
end; $$;

create or replace function public.admin_reset_student_password(p_admin_teacher_id uuid, p_student_id uuid, p_temporary_password text)
returns boolean language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
begin
  if not exists(select 1 from public.teachers where id=p_admin_teacher_id and role='admin' and is_active=true) then return false; end if;
  if length(p_temporary_password) < 10 or p_temporary_password !~ '[[:alpha:]]' or p_temporary_password !~ '[[:digit:]]' then return false; end if;
  update public.students set password_hash=crypt(p_temporary_password,gen_salt('bf',12)), must_change_password=true, password_updated_at=now() where id=p_student_id;
  if not found then return false; end if;
  insert into public.admin_audit_logs(admin_teacher_id,action,target_type,target_id) values(p_admin_teacher_id,'student_password_reset','student',p_student_id);
  return true;
end; $$;

revoke all on table public.admin_audit_logs from anon, authenticated;
revoke all on function public.initialize_student_password(uuid,text) from public, anon, authenticated;
revoke all on function public.admin_reset_student_password(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.initialize_student_password(uuid,text) to service_role;
grant execute on function public.admin_reset_student_password(uuid,uuid,text) to service_role;

drop function if exists public.initialize_student_password(uuid, text);

alter table public.admin_audit_logs drop constraint if exists admin_audit_logs_action_check;
alter table public.admin_audit_logs add constraint admin_audit_logs_action_check
  check (action in ('student_temporary_password_issued', 'student_password_reset'));

create or replace function public.admin_reset_student_password(
  p_admin_teacher_id uuid,
  p_student_id uuid,
  p_temporary_password text
) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, extensions as $$
declare had_password boolean;
begin
  if not exists(select 1 from public.teachers where id=p_admin_teacher_id and role='admin' and is_active=true) then return false; end if;
  if length(p_temporary_password) < 10 or p_temporary_password !~ '[[:alpha:]]' or p_temporary_password !~ '[[:digit:]]' then return false; end if;
  select password_hash is not null into had_password from public.students where id=p_student_id for update;
  if not found then return false; end if;
  update public.students set password_hash=crypt(p_temporary_password,gen_salt('bf',12)), must_change_password=true, password_updated_at=now() where id=p_student_id;
  insert into public.admin_audit_logs(admin_teacher_id,action,target_type,target_id)
  values(p_admin_teacher_id,case when had_password then 'student_password_reset' else 'student_temporary_password_issued' end,'student',p_student_id);
  return true;
end; $$;

revoke all on function public.admin_reset_student_password(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.admin_reset_student_password(uuid,uuid,text) to service_role;

revoke all on function public.verify_student_credentials(integer,integer,text,integer,text,text) from public, anon, authenticated;
revoke all on function public.set_student_temporary_password(uuid,text) from public, anon, authenticated;
revoke all on function public.change_student_password(uuid,text,text) from public, anon, authenticated;
grant execute on function public.verify_student_credentials(integer,integer,text,integer,text,text) to service_role;
grant execute on function public.set_student_temporary_password(uuid,text) to service_role;
grant execute on function public.change_student_password(uuid,text,text) to service_role;

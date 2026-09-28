-- Stable certificate identity for completed learning records.
-- Completion remains authoritative in course_enrollments; this only snapshots issuance metadata.

alter table public.course_enrollments
  add column if not exists certificate_number text,
  add column if not exists certificate_issued_at timestamptz;

create unique index if not exists course_enrollments_certificate_number_uidx
  on public.course_enrollments(certificate_number)
  where certificate_number is not null;

create or replace function private.assign_learning_certificate_identity()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if coalesce(new.credential_earned,false)=true and new.certificate_number is null then
    new.certificate_number:='KN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
    new.certificate_issued_at:=coalesce(new.completed_at,now());
  end if;
  return new;
end;
$$;

revoke all on function private.assign_learning_certificate_identity() from public,anon,authenticated;

drop trigger if exists trg_assign_learning_certificate_identity on public.course_enrollments;
create trigger trg_assign_learning_certificate_identity
before insert or update of credential_earned,completed_at on public.course_enrollments
for each row execute function private.assign_learning_certificate_identity();

update public.course_enrollments
set certificate_number='KN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
    certificate_issued_at=coalesce(completed_at,now())
where credential_earned=true and certificate_number is null;

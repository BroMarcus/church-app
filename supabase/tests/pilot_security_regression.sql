-- Kingdom Network live-schema regression harness.
-- Run from the Supabase SQL editor or a privileged CI test connection.
-- Every fixture is created inside one transaction and rolled back.

begin;

create temporary table kn_test_ctx as
select
  (select cm.church_id from public.church_memberships cm where cm.status='active' and cm.role in ('pastor','church_admin') order by cm.created_at limit 1) as church_a,
  (select cm.user_id from public.church_memberships cm where cm.status='active' and cm.role in ('pastor','church_admin') order by cm.created_at limit 1) as admin_a,
  (select cm.user_id from public.church_memberships cm where cm.status='active' and cm.role='member' order by cm.created_at limit 1) as member_a,
  (select u.id from auth.users u where not exists (select 1 from public.church_memberships cm where cm.user_id=u.id and cm.status='active') order by u.created_at desc limit 1) as user_b;

grant select on kn_test_ctx to authenticated;

-- Fail early if the test environment cannot supply safe identities.
do $$
begin
  if exists(select 1 from kn_test_ctx where church_a is null or admin_a is null or member_a is null or user_b is null) then
    raise exception 'Security regression prerequisites are missing';
  end if;
end $$;

insert into public.churches(id,name,slug)
values('44444444-4444-4444-8444-444444444444','Rollback Security Church B','rollback-security-church-b');

insert into public.church_memberships(church_id,user_id,role,status,relationship_status,relationship_source)
select '44444444-4444-4444-8444-444444444444',user_b,'church_admin','active','member','leadership_review'
from kn_test_ctx;

insert into public.outreach_contacts(id,church_id,created_by,first_name)
select '81000000-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444',user_b,'Rollback Outreach'
from kn_test_ctx;

insert into public.groups(id,church_id,name,leader_id)
select '81000000-0000-4000-8000-000000000002','44444444-4444-4444-8444-444444444444','Rollback Group',user_b
from kn_test_ctx;

insert into public.events(id,church_id,created_by,title,starts_at)
select '81000000-0000-4000-8000-000000000003','44444444-4444-4444-8444-444444444444',user_b,'Rollback Event',now()+interval '1 day'
from kn_test_ctx;

insert into public.fundraising_campaigns(id,church_id,created_by,title,goal_amount,raised_amount,campaign_type,status)
select '81000000-0000-4000-8000-000000000004','44444444-4444-4444-8444-444444444444',user_b,'Rollback Campaign',100,0,'general','active'
from kn_test_ctx;

insert into public.courses(id,church_id,title,slug,published,created_by)
select '81000000-0000-4000-8000-000000000005','44444444-4444-4444-8444-444444444444','Rollback Course','rollback-security-course',false,user_b
from kn_test_ctx;

-- Exercise RLS as Church A admin.
set local role authenticated;
select set_config('request.jwt.claim.sub',(select admin_a::text from kn_test_ctx),true);

do $$
begin
  if (select count(*) from public.outreach_contacts where id='81000000-0000-4000-8000-000000000001') <> 0 then raise exception 'Cross-church outreach read leaked'; end if;
  if (select count(*) from public.groups where id='81000000-0000-4000-8000-000000000002') <> 0 then raise exception 'Cross-church group read leaked'; end if;
  if (select count(*) from public.events where id='81000000-0000-4000-8000-000000000003') <> 0 then raise exception 'Cross-church event read leaked'; end if;
  if (select count(*) from public.fundraising_campaigns where id='81000000-0000-4000-8000-000000000004') <> 0 then raise exception 'Cross-church fundraising read leaked'; end if;
  if (select count(*) from public.courses where id='81000000-0000-4000-8000-000000000005') <> 0 then raise exception 'Cross-church course read leaked'; end if;
  if (select count(*) from public.member_milestones where church_id='44444444-4444-4444-8444-444444444444') <> 0 then raise exception 'Cross-church milestone read leaked'; end if;
end $$;

-- Direct writes by the wrong church must affect zero rows.
do $$
declare n integer;
begin
  update public.outreach_contacts set first_name=first_name where id='81000000-0000-4000-8000-000000000001'; get diagnostics n=row_count; if n<>0 then raise exception 'Cross-church outreach update leaked'; end if;
  update public.groups set name=name where id='81000000-0000-4000-8000-000000000002'; get diagnostics n=row_count; if n<>0 then raise exception 'Cross-church group update leaked'; end if;
  update public.events set title=title where id='81000000-0000-4000-8000-000000000003'; get diagnostics n=row_count; if n<>0 then raise exception 'Cross-church event update leaked'; end if;
  update public.fundraising_campaigns set raised_amount=raised_amount where id='81000000-0000-4000-8000-000000000004'; get diagnostics n=row_count; if n<>0 then raise exception 'Cross-church fundraising update leaked'; end if;
  update public.courses set title=title where id='81000000-0000-4000-8000-000000000005'; get diagnostics n=row_count; if n<>0 then raise exception 'Cross-church course update leaked'; end if;
end $$;

-- A normal member must not read another member's private details.
select set_config('request.jwt.claim.sub',(select member_a::text from kn_test_ctx),true);
do $$
begin
  if (select count(*) from public.member_private_details d where d.user_id<>(select member_a from kn_test_ctx)) <> 0 then
    raise exception 'Member private details leaked to another member';
  end if;
end $$;

rollback;

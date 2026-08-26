-- Package 1 disposable-local runtime proof.
-- Runs only after the CI baseline + Package 1 migrations have been applied.
-- All fixtures live inside one transaction and are rolled back.

begin;

-- Deterministic fake identities used only in the disposable local database.
insert into auth.users(id,aud,role,email,created_at,updated_at) values
('10000000-0000-4000-8000-000000000001','authenticated','authenticated','admin-a@example.test',now(),now()),
('10000000-0000-4000-8000-000000000002','authenticated','authenticated','member-a@example.test',now(),now()),
('10000000-0000-4000-8000-000000000003','authenticated','authenticated','leader-a@example.test',now(),now()),
('10000000-0000-4000-8000-000000000004','authenticated','authenticated','leader-b@example.test',now(),now()),
('10000000-0000-4000-8000-000000000005','authenticated','authenticated','member-other@example.test',now(),now()),
('10000000-0000-4000-8000-000000000006','authenticated','authenticated','outreach-manager@example.test',now(),now()),
('10000000-0000-4000-8000-000000000007','authenticated','authenticated','admin-b@example.test',now(),now());

insert into public.profiles(id,display_name) select id,email from auth.users where id::text like '10000000-%';

insert into public.churches(id,name,slug,timezone) values
('20000000-0000-4000-8000-000000000001','Package One Church A','package-one-a','America/Los_Angeles'),
('20000000-0000-4000-8000-000000000002','Package One Church B','package-one-b','America/Los_Angeles');

insert into public.church_memberships(church_id,user_id,role,status,relationship_status) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','church_admin','active','member'),
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','member','active','member'),
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','group_leader','active','member'),
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','group_leader','active','member'),
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000005','member','active','member'),
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000006','member','active','member'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000007','church_admin','active','member');

insert into public.church_roles(id,church_id,name,slug,permissions,active,created_by) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Outreach Manager','outreach-manager','{"manage_outreach":true}'::jsonb,true,'10000000-0000-4000-8000-000000000001');
insert into public.church_role_assignments(church_id,role_id,user_id,assigned_by) values
('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001');

insert into public.groups(id,church_id,name,leader_id,meeting_day,meeting_time) values
('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Friendship Group A','10000000-0000-4000-8000-000000000003','Tuesday','19:00'),
('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Friendship Group B','10000000-0000-4000-8000-000000000004','Tuesday','19:00');
insert into public.group_memberships(group_id,user_id,role) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','leader'),
('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','leader'),
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','member');

create temporary table kn_p1_ctx(k text primary key,v text);
grant select,insert,update,delete on kn_p1_ctx to authenticated,anon;

-- Ordinary member: personal invite is allowed.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
insert into kn_p1_ctx(k,v)
select 'member_token',token from public.create_outreach_source_link(
  '20000000-0000-4000-8000-000000000001','member_invite',null,null,'Personal invitation','en'
);

-- Ordinary member can share a group they belong to, but not another group's link.
insert into kn_p1_ctx(k,v)
select 'group_a_token',token from public.create_outreach_source_link(
  '20000000-0000-4000-8000-000000000001','friendship_group','40000000-0000-4000-8000-000000000001',null,'Friendship Group A','en'
);

do $$
declare denied boolean:=false;
begin
  begin
    perform * from public.create_outreach_source_link(
      '20000000-0000-4000-8000-000000000001','church_service',null,null,'Sunday','en'
    );
  exception when others then denied:=true;
  end;
  if not denied then raise exception 'Ordinary member created a leadership-only church-service link'; end if;
end $$;

do $$
declare denied boolean:=false;
begin
  begin
    perform * from public.create_outreach_source_link(
      '20000000-0000-4000-8000-000000000001','friendship_group','40000000-0000-4000-8000-000000000002',null,'Friendship Group B','en'
    );
  exception when others then denied:=true;
  end;
  if not denied then raise exception 'Member created a link for an unrelated Friendship Group'; end if;
end $$;

-- Direct private Outreach creation by an ordinary member is denied by RLS.
do $$
declare denied boolean:=false;
begin
  begin
    insert into public.outreach_contacts(church_id,created_by,first_name)
    values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Should Fail');
  exception when others then denied:=true;
  end;
  if not denied then raise exception 'Ordinary member direct-inserted a private Outreach record'; end if;
end $$;

-- Anonymous first connection: one contact, one attributed interaction, explicit
-- Outreach manager owns the private follow-up rather than the ordinary inviter.
set local role anon;
select set_config('request.jwt.claim.sub','',true);
insert into kn_p1_ctx(k,v)
select 'first_result',result from public.submit_outreach_connection(
  (select v from kn_p1_ctx where k='member_token'),
  '50000000-0000-4000-8000-000000000001',
  'Guest','One','559-555-0101','guest.one@example.test','en',false,false,true,true,null
);

reset role;
do $$
begin
  if (select v from kn_p1_ctx where k='first_result')<>'connected' then raise exception 'First anonymous connection did not connect'; end if;
  if (select count(*) from public.outreach_contacts where church_id='20000000-0000-4000-8000-000000000001' and email_normalized='guest.one@example.test')<>1 then raise exception 'First connection did not create exactly one contact'; end if;
  if (select count(*) from public.outreach_interactions where church_id='20000000-0000-4000-8000-000000000001' and source_key='connect:50000000-0000-4000-8000-000000000001')<>1 then raise exception 'First connection did not create exactly one attributed interaction'; end if;
  if (select assigned_to from public.outreach_contacts where email_normalized='guest.one@example.test')<>'10000000-0000-4000-8000-000000000006'::uuid then raise exception 'Ordinary inviter became private follow-up owner instead of explicit Outreach authority'; end if;
end $$;

-- Retry same request is idempotent.
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select * from public.submit_outreach_connection(
  (select v from kn_p1_ctx where k='member_token'),
  '50000000-0000-4000-8000-000000000001',
  'Guest','One','559-555-0101','guest.one@example.test','en',false,false,true,true,null
);
reset role;
do $$
begin
  if (select count(*) from public.outreach_contacts where email_normalized='guest.one@example.test')<>1 then raise exception 'Retry duplicated the contact'; end if;
  if (select count(*) from public.outreach_interactions where source_key='connect:50000000-0000-4000-8000-000000000001')<>1 then raise exception 'Retry duplicated the interaction'; end if;
end $$;

-- Same person returns through Friendship Group A: reuse canonical person + append a
-- second attributed interaction. Original acquisition source stays original.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
insert into kn_p1_ctx(k,v)
select 'return_result',result from public.record_friendship_group_outreach_visit(
  (select v from kn_p1_ctx where k='group_a_token'),
  '50000000-0000-4000-8000-000000000002',
  'Guest','One','559-555-0101','guest.one@example.test','en',2,current_date
);
reset role;
do $$
begin
  if (select v from kn_p1_ctx where k='return_result')<>'connected' then raise exception 'Return Friendship Group visit did not connect'; end if;
  if (select count(*) from public.outreach_contacts where email_normalized='guest.one@example.test')<>1 then raise exception 'Return visit duplicated the person'; end if;
  if (select count(*) from public.outreach_interactions oi join public.outreach_contacts o on o.id=oi.contact_id where o.email_normalized='guest.one@example.test')<>2 then raise exception 'Return visit did not append history'; end if;
  if (select count(*) from public.outreach_interactions oi join public.outreach_contacts o on o.id=oi.contact_id where o.email_normalized='guest.one@example.test' and oi.source_group_id='40000000-0000-4000-8000-000000000001' and oi.visit_ordinal=2)<>1 then raise exception 'Friendship Group visit ordinal/source was not preserved'; end if;
  if (select source_type from public.outreach_contacts where email_normalized='guest.one@example.test')<>'member_invite' then raise exception 'Return visit overwrote original acquisition source'; end if;
end $$;

-- RLS: ordinary inviter still cannot read the private guest; the group leader who
-- actually received the attributed visit can; unrelated group leader cannot;
-- explicit Outreach manager and Pastor/Admin can.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
do $$ begin if (select count(*) from public.outreach_contacts where email_normalized='guest.one@example.test')<>0 then raise exception 'Ordinary inviter gained private guest access'; end if; end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$ begin if (select count(*) from public.outreach_contacts where email_normalized='guest.one@example.test')<>1 then raise exception 'Own-group leader cannot read attributed group guest'; end if; end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
do $$ begin if (select count(*) from public.outreach_contacts where email_normalized='guest.one@example.test')<>0 then raise exception 'Unrelated group leader can browse private Outreach'; end if; end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
do $$ begin if (select count(*) from public.outreach_contacts where email_normalized='guest.one@example.test')<>1 then raise exception 'Explicit Outreach manager cannot read assigned guest'; end if; end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$ begin if (select count(*) from public.outreach_contacts where email_normalized='guest.one@example.test')<>1 then raise exception 'Church Admin cannot read church Outreach'; end if; end $$;

-- Cross-church Admin sees zero.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000007',true);
do $$ begin if (select count(*) from public.outreach_contacts where email_normalized='guest.one@example.test')<>0 then raise exception 'Cross-church Outreach read leaked'; end if; end $$;

-- A scoped group leader cannot use reassignment to grant private guest access to an
-- arbitrary member. Church-wide authority may intentionally delegate one contact.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
do $$
declare denied boolean:=false;
begin
  begin
    update public.outreach_contacts set assigned_to='10000000-0000-4000-8000-000000000005' where email_normalized='guest.one@example.test';
  exception when others then denied:=true;
  end;
  if not denied then raise exception 'Scoped group leader reassigned private guest to arbitrary member'; end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
update public.outreach_contacts set assigned_to='10000000-0000-4000-8000-000000000005' where email_normalized='guest.one@example.test';
update public.outreach_contacts set assigned_to='10000000-0000-4000-8000-000000000006' where email_normalized='guest.one@example.test';
reset role;

-- One request UUID cannot be reused against another source link.
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
declare denied boolean:=false;
begin
  begin
    perform * from public.submit_outreach_connection(
      (select v from kn_p1_ctx where k='group_a_token'),
      '50000000-0000-4000-8000-000000000001',
      'Guest','One','559-555-0101','guest.one@example.test','en',false,false,false,false,null
    );
  exception when others then denied:=true;
  end;
  if not denied then raise exception 'Request UUID was reusable against another source'; end if;
end $$;
reset role;

-- Paused Outreach intake fails at the write boundary.
insert into public.church_feature_settings(church_id,feature_key,enabled)
values('20000000-0000-4000-8000-000000000001','outreach',false);
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
declare denied boolean:=false;
begin
  begin
    perform * from public.submit_outreach_connection(
      (select v from kn_p1_ctx where k='member_token'),
      '50000000-0000-4000-8000-000000000003',
      'Paused','Guest','559-555-0199','paused@example.test','en',false,false,false,false,null
    );
  exception when others then denied:=true;
  end;
  if not denied then raise exception 'Paused Outreach intake accepted a new public connection'; end if;
end $$;
reset role;
delete from public.church_feature_settings where church_id='20000000-0000-4000-8000-000000000001' and feature_key='outreach';

-- Anonymous exact match to an established linked member fails closed to central
-- identity review rather than mutating member history.
select set_config('request.jwt.claim.sub','',true);
insert into public.outreach_contacts(church_id,created_by,assigned_to,first_name,last_name,email,member_user_id,stage)
values(
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Linked','Member','linked.member@example.test','10000000-0000-4000-8000-000000000005','connected'
);
set local role anon;
insert into kn_p1_ctx(k,v)
select 'linked_result',result from public.submit_outreach_connection(
  (select v from kn_p1_ctx where k='member_token'),
  '50000000-0000-4000-8000-000000000004',
  'Linked','Member',null,'linked.member@example.test','en',false,false,false,false,null
);
reset role;
do $$
begin
  if (select v from kn_p1_ctx where k='linked_result')<>'needs_review' then raise exception 'Linked-member anonymous match did not fail closed'; end if;
  if (select count(*) from public.outreach_connection_reviews where request_key='50000000-0000-4000-8000-000000000004' and status='pending')<>1 then raise exception 'Linked-member review record was not created'; end if;
end $$;

-- Current Friendship Group report bridge: stable report+slot request key, no weak
-- name-only identity creation, and repeat calls cannot duplicate a source touch.
insert into public.group_reports(id,group_id,submitted_by,meeting_date)
values('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',current_date);

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
insert into kn_p1_ctx(k,v)
select 'report_no_identity',result from public.record_group_report_guest_outreach(
  '60000000-0000-4000-8000-000000000001',1,'Name','Only',null,null,'en'
);
insert into kn_p1_ctx(k,v)
select 'report_guest_result',result from public.record_group_report_guest_outreach(
  '60000000-0000-4000-8000-000000000001',2,'Report','Guest','559-555-0123','report.guest@example.test','en'
);
select * from public.record_group_report_guest_outreach(
  '60000000-0000-4000-8000-000000000001',2,'Report','Guest','559-555-0123','report.guest@example.test','en'
);
reset role;

do $$
declare report_key uuid:=md5('60000000-0000-4000-8000-000000000001:guest:2')::uuid;
begin
  if (select v from kn_p1_ctx where k='report_no_identity')<>'needs_identity' then raise exception 'Name-only report guest created weak identity evidence'; end if;
  if (select v from kn_p1_ctx where k='report_guest_result')<>'connected' then raise exception 'Identified report guest did not connect to Outreach'; end if;
  if (select count(*) from public.outreach_interactions where source_key='connect:'||report_key::text)<>1 then raise exception 'Group report retry duplicated the Outreach touch'; end if;
  if (select count(*) from public.outreach_interactions where source_key='connect:'||report_key::text and visit_ordinal=1 and source_group_id='40000000-0000-4000-8000-000000000001')<>1 then raise exception 'Group report did not preserve first-visit group metadata'; end if;
end $$;

-- Church Health reads the same canonical interaction history rather than a summary
-- table. Validate that first and return signals are queryable by authorized leaders.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
do $$
declare first_count bigint;return_count bigint;touch_count bigint;
begin
  select value into first_count from public.church_health_snapshot_base('20000000-0000-4000-8000-000000000001',30) where metric_key='first_source_connections';
  select value into return_count from public.church_health_snapshot_base('20000000-0000-4000-8000-000000000001',30) where metric_key='return_source_connections';
  select value into touch_count from public.church_health_snapshot_base('20000000-0000-4000-8000-000000000001',30) where metric_key='attributed_source_touches';
  if coalesce(first_count,0)<1 then raise exception 'Church Health did not derive first connections'; end if;
  if coalesce(return_count,0)<1 then raise exception 'Church Health did not derive return connections'; end if;
  if coalesce(touch_count,0)<2 then raise exception 'Church Health did not derive attributed source touches'; end if;
end $$;
reset role;

rollback;

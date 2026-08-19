do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='private' and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated',r.sig);
  end loop;
end $$;

grant execute on function private.can_manage_member_private_details(uuid) to authenticated;
grant execute on function private.can_manage_member_tasks(uuid) to authenticated;
grant execute on function private.can_message_target(uuid,uuid,uuid) to authenticated;
grant execute on function private.can_view_member(uuid) to authenticated;
grant execute on function private.group_join_request_manager(uuid) to authenticated;
grant execute on function private.has_church_permission(uuid,text) to authenticated;
grant execute on function private.has_church_role(uuid,text[]) to authenticated;
grant execute on function private.has_group_role(uuid,text[]) to authenticated;
grant execute on function private.is_church_member(uuid) to authenticated;
grant execute on function private.is_district_admin(uuid) to authenticated;
grant execute on function private.is_district_member(uuid) to authenticated;
grant execute on function private.is_organization_admin(uuid) to authenticated;
grant execute on function private.is_organization_member(uuid) to authenticated;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated',r.sig);
  end loop;
end $$;

grant execute on function public.get_invite_preview(uuid) to anon,authenticated;
grant execute on function public.get_public_friendship_group_join(text,uuid) to anon,authenticated;
grant execute on function public.get_public_signup_status() to anon,authenticated;
grant execute on function public.get_public_signup_status_for_church(text) to anon,authenticated;
grant execute on function public.validate_invite_email(uuid,text) to anon,authenticated;

grant execute on function public.church_directory_member(uuid,uuid) to authenticated;
grant execute on function public.church_directory_members(uuid) to authenticated;
grant execute on function public.church_growth_funnel_readiness(uuid) to authenticated;
grant execute on function public.church_health_snapshot(uuid,integer) to authenticated;
grant execute on function public.church_health_snapshot_base(uuid,integer) to authenticated;
grant execute on function public.church_member_relationship_confidence(uuid) to authenticated;
grant execute on function public.church_member_relationship_readiness(uuid) to authenticated;
grant execute on function public.church_onboarding_health(uuid) to authenticated;
grant execute on function public.church_pilot_readiness(uuid) to authenticated;
grant execute on function public.church_pilot_readiness_base(uuid) to authenticated;
grant execute on function public.church_relationship_metrics(uuid) to authenticated;
grant execute on function public.church_relationship_verification_queue(uuid) to authenticated;
grant execute on function public.church_reporting_period_summary(uuid,date,date) to authenticated;
grant execute on function public.configure_resend_email_provider(uuid,text,text,text,boolean) to authenticated;
grant execute on function public.create_known_person_invitation(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.current_user_has_church_permission(uuid,text) to authenticated;
grant execute on function public.current_user_in_household(uuid) to authenticated;
grant execute on function public.district_church_metrics(uuid) to authenticated;
grant execute on function public.friendship_group_growth_metrics(uuid,integer) to authenticated;
grant execute on function public.organization_district_metrics(uuid) to authenticated;
grant execute on function public.process_church_import_batch(uuid) to authenticated;
grant execute on function public.review_shared_journey_entry(uuid,text) to authenticated;
grant execute on function public.update_member_relationship_status(uuid,uuid,text) to authenticated;

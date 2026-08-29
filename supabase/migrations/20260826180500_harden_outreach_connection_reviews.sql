-- Ambiguous identity matching may expose multiple candidate identities.
-- Keep that review central to explicit church-wide Outreach authority rather than
-- exposing candidate ids/details to a Friendship Group operator.

drop policy if exists outreach_connection_reviews_read on public.outreach_connection_reviews;
create policy outreach_connection_reviews_read on public.outreach_connection_reviews
for select to authenticated
using (
  private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
);

create or replace function public.resolve_outreach_connection_review(
  p_review_id uuid,
  p_contact_id uuid,
  p_dismiss boolean default false
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid:=auth.uid();
  v_review record;
  v_link record;
  v_interaction_id uuid;
  v_allowed boolean:=false;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select * into v_review
  from public.outreach_connection_reviews
  where id=p_review_id and status='pending'
  for update;
  if v_review.id is null then raise exception 'Connection review is not available'; end if;

  v_allowed:=private.has_church_role(v_review.church_id,array['pastor','church_admin'])
    or private.has_church_permission(v_review.church_id,'manage_outreach');
  if not v_allowed then raise exception 'You do not have permission to resolve this connection review'; end if;

  if p_dismiss then
    update public.outreach_connection_reviews
    set status='dismissed',resolved_by=v_user,resolved_at=now(),updated_at=now()
    where id=v_review.id;
    return true;
  end if;

  if p_contact_id is null or not (p_contact_id=any(v_review.candidate_ids)) then
    raise exception 'Choose one of the matched Outreach records';
  end if;

  if not exists(select 1 from public.outreach_contacts o where o.id=p_contact_id and o.church_id=v_review.church_id) then
    raise exception 'Matched Outreach record is no longer available';
  end if;

  select * into v_link from public.outreach_source_links where id=v_review.source_link_id;
  if v_link.id is null then raise exception 'Connection source is no longer available'; end if;

  v_interaction_id:=private.apply_outreach_source_touch(
    p_contact_id,v_link.id,v_review.request_key,v_review.submitted_email,v_review.submitted_phone,v_review.communication_language,
    v_review.email_consent,v_review.sms_consent,v_review.bible_study_interest,v_review.first_steps_interest,v_review.prayer_request
  );

  update public.outreach_connection_reviews
  set status='resolved',resolved_contact_id=p_contact_id,resolved_by=v_user,resolved_at=now(),updated_at=now()
  where id=v_review.id;

  update public.outreach_connection_receipts
  set contact_id=p_contact_id,interaction_id=v_interaction_id,result='connected',updated_at=now()
  where request_key=v_review.request_key;

  return true;
end
$function$;

revoke all on function public.resolve_outreach_connection_review(uuid,uuid,boolean) from public, anon;
grant execute on function public.resolve_outreach_connection_review(uuid,uuid,boolean) to authenticated,service_role;

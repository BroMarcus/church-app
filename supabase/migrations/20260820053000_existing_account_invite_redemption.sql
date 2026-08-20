-- Allow an already-authenticated Kingdom Network account to redeem a valid
-- church invitation without weakening membership RLS or authority protections.

create or replace function private.tag_new_membership_relationship_source()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_meta jsonb;
  v_invite_id uuid;
  v_creator uuid;
begin
  -- Explicitly-tagged memberships (for example, the authenticated invitation
  -- redemption RPC below) are authoritative. Metadata inference is only for
  -- legacy/default inserts such as handle_new_user().
  if new.relationship_source is distinct from 'legacy_backfill' then
    return new;
  end if;

  select u.raw_user_meta_data into v_meta
  from auth.users u
  where u.id=new.user_id;

  if coalesce(v_meta->>'public_signup','false')='true' then
    new.relationship_source:='public_join';
    new.relationship_verified_at:=null;
    new.relationship_verified_by:=null;
  else
    begin
      v_invite_id:=nullif(v_meta->>'invite_id','')::uuid;
    exception when invalid_text_representation then
      v_invite_id:=null;
    end;
    if v_invite_id is not null then
      select i.created_by into v_creator
      from public.church_invites i
      where i.id=v_invite_id and i.church_id=new.church_id;
      new.relationship_source:='private_invite';
      new.relationship_verified_at:=now();
      new.relationship_verified_by:=v_creator;
    end if;
  end if;
  return new;
end
$function$;

create or replace function public.redeem_invite_for_current_user(p_invite_id uuid)
returns table(church_id uuid, church_name text, role text)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_invite public.church_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select lower(trim(u.email)) into v_email
  from auth.users u
  where u.id=v_user_id;

  if v_email is null or v_email='' then
    raise exception 'A verified account email is required';
  end if;

  select i.* into v_invite
  from public.church_invites i
  where i.id=p_invite_id
  for update;

  if not found
     or v_invite.revoked_at is not null
     or v_invite.redeemed_at is not null
     or v_invite.expires_at<=now()
     or lower(trim(v_invite.email))<>v_email then
    raise exception 'Invitation is no longer valid for this account';
  end if;

  -- Invitation records must never be usable to self-grant pastor/admin or
  -- organization-level authority, even if a future schema change loosens a
  -- table check constraint.
  if v_invite.role not in ('member','group_leader','ministry_leader','minister') then
    raise exception 'Invitation role is not allowed';
  end if;

  -- Do not bypass the existing membership-authority trigger. If a record
  -- already exists for this church (including inactive/pending), leadership
  -- must reactivate or change it through the normal audited admin workflow.
  if exists(
    select 1 from public.church_memberships cm
    where cm.church_id=v_invite.church_id and cm.user_id=v_user_id
  ) then
    raise exception 'This account already has a church membership record; ask a church leader to update it';
  end if;

  insert into public.church_memberships(
    church_id,user_id,role,status,relationship_status,
    relationship_source,relationship_verified_at,relationship_verified_by
  ) values (
    v_invite.church_id,v_user_id,v_invite.role,'active','member',
    'private_invite',now(),v_invite.created_by
  );

  update public.church_invites
  set redeemed_by=v_user_id,redeemed_at=now()
  where id=v_invite.id;

  return query
  select c.id,c.name,v_invite.role
  from public.churches c
  where c.id=v_invite.church_id;
end
$function$;

revoke all on function public.redeem_invite_for_current_user(uuid) from public;
revoke all on function public.redeem_invite_for_current_user(uuid) from anon;
grant execute on function public.redeem_invite_for_current_user(uuid) to authenticated;

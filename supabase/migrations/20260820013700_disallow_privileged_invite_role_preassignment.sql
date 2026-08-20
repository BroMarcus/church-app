create or replace function public.create_known_person_invitation(
  p_church_id uuid,
  p_email text,
  p_first_name text default null,
  p_last_name text default null,
  p_phone text default null,
  p_role text default 'member'
)
returns table(invite_id uuid,email text,first_name text,last_name text,phone text,role text,expires_at timestamptz)
language plpgsql
security definer
set search_path to 'public','private'
as $function$
declare
  v_actor uuid:=auth.uid();
  v_actor_role text;
  v_email text:=lower(trim(coalesce(p_email,'')));
  v_role text:=coalesce(nullif(trim(p_role),''),'member');
  v_existing uuid;
  v_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  select cm.role into v_actor_role from public.church_memberships cm where cm.church_id=p_church_id and cm.user_id=v_actor and cm.status='active';
  if v_actor_role is null then raise exception 'Church membership required'; end if;
  if not (v_actor_role in ('pastor','church_admin') or private.has_church_permission(p_church_id,'manage_members')) then raise exception 'Member invitation access required'; end if;
  if v_email='' or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Enter a valid email address'; end if;
  if v_role not in ('member','group_leader','ministry_leader','minister') then raise exception 'Privileged pastor/admin roles must be assigned after the account is verified'; end if;
  if v_role<>'member' and v_actor_role not in ('pastor','church_admin') then raise exception 'Only Pastor/Admin can preassign leadership access'; end if;
  if exists(select 1 from public.member_private_details d join public.church_memberships cm on cm.user_id=d.user_id where cm.church_id=p_church_id and cm.status='active' and lower(trim(d.email))=v_email) then raise exception 'This email already belongs to an active church account'; end if;

  select i.id into v_existing
  from public.church_invites i
  where i.church_id=p_church_id
    and lower(trim(i.email))=v_email
    and i.redeemed_at is null
    and i.revoked_at is null
  order by i.created_at desc
  limit 1
  for update;

  if v_existing is not null then
    update public.church_invites
    set first_name=nullif(trim(coalesce(p_first_name,'')),''),
        last_name=nullif(trim(coalesce(p_last_name,'')),''),
        phone=nullif(trim(coalesce(p_phone,'')),''),
        role=v_role,
        expires_at=now()+interval '7 days'
    where id=v_existing;
    v_id:=v_existing;
  else
    insert into public.church_invites(church_id,email,first_name,last_name,phone,role,created_by,expires_at)
    values(p_church_id,v_email,nullif(trim(coalesce(p_first_name,'')),''),nullif(trim(coalesce(p_last_name,'')),''),nullif(trim(coalesce(p_phone,'')),''),v_role,v_actor,now()+interval '7 days')
    returning id into v_id;
  end if;
  return query select i.id,i.email,i.first_name,i.last_name,i.phone,i.role,i.expires_at from public.church_invites i where i.id=v_id;
end
$function$;

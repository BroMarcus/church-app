-- Package 1 final scoped-history closure.
-- A person may first connect through one source and later visit a Friendship Group.
-- That later attributed group visit must give the group operator access to the person
-- they are actually responsible for without changing the person's original source.
-- Use a SECURITY DEFINER helper so contact/interactions RLS do not recurse into each
-- other while evaluating that historical group relationship.

create or replace function private.can_operate_outreach_contact_group_history(
  p_contact_id uuid,
  p_church_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists(
    select 1
    from public.outreach_interactions oi
    where oi.contact_id=p_contact_id
      and oi.church_id=p_church_id
      and oi.source_group_id is not null
      and private.can_operate_group(oi.source_group_id)
  );
$function$;

revoke all on function private.can_operate_outreach_contact_group_history(uuid,uuid) from public,anon;
grant execute on function private.can_operate_outreach_contact_group_history(uuid,uuid) to authenticated;

-- CONTACT READ -------------------------------------------------------------
drop policy if exists outreach_read on public.outreach_contacts;
create policy outreach_read on public.outreach_contacts
for select to authenticated
using (
  assigned_to=auth.uid()
  or created_by=auth.uid()
  or (source_group_id is not null and private.can_operate_group(source_group_id))
  or private.can_operate_outreach_contact_group_history(id,church_id)
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
);

-- CONTACT UPDATE -----------------------------------------------------------
drop policy if exists outreach_update on public.outreach_contacts;
create policy outreach_update on public.outreach_contacts
for update to authenticated
using (
  assigned_to=auth.uid()
  or created_by=auth.uid()
  or (source_group_id is not null and private.can_operate_group(source_group_id))
  or private.can_operate_outreach_contact_group_history(id,church_id)
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
)
with check (
  private.is_church_member(church_id)
  and (
    assigned_to=auth.uid()
    or created_by=auth.uid()
    or (source_group_id is not null and private.can_operate_group(source_group_id))
    or private.can_operate_outreach_contact_group_history(id,church_id)
    or private.has_church_role(church_id,array['pastor','church_admin'])
    or private.has_church_permission(church_id,'manage_outreach')
  )
);

-- INTERACTION READ ---------------------------------------------------------
drop policy if exists outreach_interactions_read on public.outreach_interactions;
create policy outreach_interactions_read on public.outreach_interactions
for select to authenticated
using (
  exists(
    select 1
    from public.outreach_contacts o
    where o.id=outreach_interactions.contact_id
      and o.church_id=outreach_interactions.church_id
      and (
        o.assigned_to=auth.uid()
        or o.created_by=auth.uid()
        or (o.source_group_id is not null and private.can_operate_group(o.source_group_id))
        or private.can_operate_outreach_contact_group_history(o.id,o.church_id)
        or private.has_church_role(o.church_id,array['pastor','church_admin'])
        or private.has_church_permission(o.church_id,'manage_outreach')
      )
  )
);

-- INTERACTION INSERT -------------------------------------------------------
drop policy if exists outreach_interactions_insert on public.outreach_interactions;
create policy outreach_interactions_insert on public.outreach_interactions
for insert to authenticated
with check (
  recorded_by=auth.uid()
  and exists(
    select 1
    from public.outreach_contacts o
    where o.id=outreach_interactions.contact_id
      and o.church_id=outreach_interactions.church_id
      and (
        o.assigned_to=auth.uid()
        or o.created_by=auth.uid()
        or (o.source_group_id is not null and private.can_operate_group(o.source_group_id))
        or private.can_operate_outreach_contact_group_history(o.id,o.church_id)
        or private.has_church_role(o.church_id,array['pastor','church_admin'])
        or private.has_church_permission(o.church_id,'manage_outreach')
      )
  )
);

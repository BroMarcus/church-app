-- Package 1 security closure: make the scoped Outreach authority model apply to
-- every direct authenticated read/write path, not only SELECT.
-- Ordinary members use source-aware Share / Connect links; they do not gain a
-- private Outreach workspace merely by holding an active church membership.

-- CONTACT READ -------------------------------------------------------------
drop policy if exists outreach_read on public.outreach_contacts;
create policy outreach_read on public.outreach_contacts
for select to authenticated
using (
  assigned_to=auth.uid()
  or created_by=auth.uid()
  or (source_group_id is not null and private.can_operate_group(source_group_id))
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
);

-- CONTACT INSERT -----------------------------------------------------------
-- General leader entry requires church-wide Outreach authority. A scoped group
-- operator may create a record only when it is explicitly attached to that group.
-- The public Share / Connect capture uses reviewed SECURITY DEFINER functions and
-- is intentionally separate from this direct-table policy.
drop policy if exists outreach_insert on public.outreach_contacts;
create policy outreach_insert on public.outreach_contacts
for insert to authenticated
with check (
  created_by=auth.uid()
  and private.is_church_member(church_id)
  and (member_user_id is null or member_user_id=auth.uid())
  and (
    private.has_church_role(church_id,array['pastor','church_admin'])
    or private.has_church_permission(church_id,'manage_outreach')
    or (source_group_id is not null and private.can_operate_group(source_group_id))
  )
);

-- CONTACT UPDATE -----------------------------------------------------------
-- Creator/chosen owner can maintain the person they are responsible for; group
-- operators can maintain their own group-sourced people; church-wide access is
-- permission-based. Existing triggers keep church_id and created_by immutable and
-- require assigned_to to be an active member of the same church.
drop policy if exists outreach_update on public.outreach_contacts;
create policy outreach_update on public.outreach_contacts
for update to authenticated
using (
  assigned_to=auth.uid()
  or created_by=auth.uid()
  or (source_group_id is not null and private.can_operate_group(source_group_id))
  or private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
)
with check (
  private.is_church_member(church_id)
  and (
    assigned_to=auth.uid()
    or created_by=auth.uid()
    or (source_group_id is not null and private.can_operate_group(source_group_id))
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
        or private.has_church_role(o.church_id,array['pastor','church_admin'])
        or private.has_church_permission(o.church_id,'manage_outreach')
      )
  )
);

-- INTERACTION DELETE -------------------------------------------------------
-- History is ministry accountability. A normal owner/group leader corrects a bad
-- entry by adding a correction, not silently erasing the record. Destructive
-- correction remains limited to explicit church-wide Outreach authority.
drop policy if exists outreach_interactions_delete on public.outreach_interactions;
create policy outreach_interactions_delete on public.outreach_interactions
for delete to authenticated
using (
  private.has_church_role(church_id,array['pastor','church_admin'])
  or private.has_church_permission(church_id,'manage_outreach')
);

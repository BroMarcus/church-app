drop policy if exists profiles_update_church_admin on public.profiles;
create policy profiles_update_church_admin
on public.profiles for update to authenticated
using (private.can_manage_member_private_details(id))
with check (private.can_manage_member_private_details(id));

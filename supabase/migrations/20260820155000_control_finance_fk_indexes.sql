create index if not exists church_schedules_ministry_church_fk_idx
  on public.church_schedules(ministry_id,church_id)
  where ministry_id is not null;
create index if not exists church_schedules_created_by_fk_idx
  on public.church_schedules(created_by);

create index if not exists ministry_team_members_ministry_church_fk_idx
  on public.ministry_team_members(ministry_id,church_id);
create index if not exists ministry_team_members_church_user_fk_idx
  on public.ministry_team_members(church_id,user_id);

create index if not exists schedule_items_schedule_church_fk_idx
  on public.schedule_items(schedule_id,church_id);
create index if not exists schedule_items_created_by_fk_idx
  on public.schedule_items(created_by);

create index if not exists church_finance_accounts_created_by_fk_idx
  on public.church_finance_accounts(created_by);

create index if not exists church_finance_transactions_account_church_fk_idx
  on public.church_finance_transactions(account_id,church_id)
  where account_id is not null;
create index if not exists church_finance_transactions_created_by_fk_idx
  on public.church_finance_transactions(created_by);
create index if not exists church_finance_transactions_updated_by_fk_idx
  on public.church_finance_transactions(updated_by)
  where updated_by is not null;

create index if not exists church_contribution_batches_account_church_fk_idx
  on public.church_contribution_batches(account_id,church_id)
  where account_id is not null;
create index if not exists church_contribution_batches_created_by_fk_idx
  on public.church_contribution_batches(created_by);
create index if not exists church_contribution_batches_updated_by_fk_idx
  on public.church_contribution_batches(updated_by)
  where updated_by is not null;

create index if not exists church_bills_account_church_fk_idx
  on public.church_bills(account_id,church_id)
  where account_id is not null;
create index if not exists church_bills_created_by_fk_idx
  on public.church_bills(created_by);
create index if not exists church_bills_updated_by_fk_idx
  on public.church_bills(updated_by)
  where updated_by is not null;
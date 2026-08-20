create table if not exists public.church_finance_accounts(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  name text not null check(length(btrim(name)) between 1 and 100),
  account_type text not null default 'checking' check(account_type in ('checking','savings','cash','other')),
  opening_balance numeric(14,2) not null default 0,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(church_id,name)
);

create unique index if not exists church_finance_accounts_id_church_uidx
  on public.church_finance_accounts(id,church_id);
create index if not exists church_finance_accounts_church_active_idx
  on public.church_finance_accounts(church_id,active,name);

create table if not exists public.church_finance_transactions(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  account_id uuid,
  direction text not null check(direction in ('income','expense')),
  category text not null check(length(btrim(category)) between 1 and 80),
  amount numeric(14,2) not null check(amount>=0),
  occurred_on date not null,
  counterparty text,
  memo text,
  transaction_status text not null default 'posted' check(transaction_status in ('posted','void')),
  source_type text not null default 'manual' check(source_type in ('manual','contribution_batch','bill')),
  source_id uuid,
  source_line text not null default 'main' check(length(btrim(source_line)) between 1 and 60),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_finance_transactions_account_church_fkey
    foreign key(account_id,church_id) references public.church_finance_accounts(id,church_id) on delete restrict
);

create index if not exists church_finance_transactions_church_date_idx
  on public.church_finance_transactions(church_id,occurred_on desc);
create index if not exists church_finance_transactions_account_date_idx
  on public.church_finance_transactions(account_id,occurred_on desc) where account_id is not null;
create unique index if not exists church_finance_transactions_source_uidx
  on public.church_finance_transactions(church_id,source_type,source_id,source_line)
  where source_id is not null;

create table if not exists public.church_contribution_batches(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  account_id uuid,
  received_on date not null,
  service_label text,
  tithe_amount numeric(14,2) not null default 0 check(tithe_amount>=0),
  offering_amount numeric(14,2) not null default 0 check(offering_amount>=0),
  missions_amount numeric(14,2) not null default 0 check(missions_amount>=0),
  building_amount numeric(14,2) not null default 0 check(building_amount>=0),
  other_amount numeric(14,2) not null default 0 check(other_amount>=0),
  notes text,
  status text not null default 'posted' check(status in ('posted','void')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_contribution_batches_account_church_fkey
    foreign key(account_id,church_id) references public.church_finance_accounts(id,church_id) on delete restrict
);

create index if not exists church_contribution_batches_church_date_idx
  on public.church_contribution_batches(church_id,received_on desc);

create table if not exists public.church_bills(
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  account_id uuid,
  vendor text not null check(length(btrim(vendor)) between 1 and 120),
  category text not null default 'other' check(length(btrim(category)) between 1 and 80),
  amount numeric(14,2) not null check(amount>0),
  due_on date not null,
  status text not null default 'open' check(status in ('open','paid','cancelled')),
  recurrence text not null default 'none' check(recurrence in ('none','weekly','monthly','quarterly','annual','other')),
  paid_on date,
  paid_amount numeric(14,2) check(paid_amount is null or paid_amount>=0),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_bills_paid_fields_check check(
    (status='paid' and paid_on is not null)
    or (status<>'paid')
  ),
  constraint church_bills_account_church_fkey
    foreign key(account_id,church_id) references public.church_finance_accounts(id,church_id) on delete restrict
);

create index if not exists church_bills_church_due_idx
  on public.church_bills(church_id,status,due_on);

create table if not exists public.church_finance_audit_log(
  id bigint generated always as identity primary key,
  church_id uuid not null references public.churches(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check(action in ('insert','update','delete')),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb
);

create index if not exists church_finance_audit_church_time_idx
  on public.church_finance_audit_log(church_id,changed_at desc);
create index if not exists church_finance_audit_entity_idx
  on public.church_finance_audit_log(entity_type,entity_id,changed_at desc);

alter table public.church_finance_accounts enable row level security;
alter table public.church_finance_transactions enable row level security;
alter table public.church_contribution_batches enable row level security;
alter table public.church_bills enable row level security;
alter table public.church_finance_audit_log enable row level security;

create or replace function private.pastor_finance_access(p_church_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_temp
as $$
  select auth.uid() is not null
    and private.has_church_role(p_church_id,array['pastor','church_admin']);
$$;

revoke all on function private.pastor_finance_access(uuid) from public,anon,authenticated;
grant execute on function private.pastor_finance_access(uuid) to authenticated;

drop policy if exists church_finance_accounts_pastor_admin on public.church_finance_accounts;
create policy church_finance_accounts_pastor_admin on public.church_finance_accounts
for all to authenticated
using(private.pastor_finance_access(church_id))
with check(private.pastor_finance_access(church_id));

drop policy if exists church_finance_transactions_pastor_admin on public.church_finance_transactions;
create policy church_finance_transactions_pastor_admin on public.church_finance_transactions
for all to authenticated
using(private.pastor_finance_access(church_id))
with check(private.pastor_finance_access(church_id));

drop policy if exists church_contribution_batches_pastor_admin on public.church_contribution_batches;
create policy church_contribution_batches_pastor_admin on public.church_contribution_batches
for all to authenticated
using(private.pastor_finance_access(church_id))
with check(private.pastor_finance_access(church_id));

drop policy if exists church_bills_pastor_admin on public.church_bills;
create policy church_bills_pastor_admin on public.church_bills
for all to authenticated
using(private.pastor_finance_access(church_id))
with check(private.pastor_finance_access(church_id));

drop policy if exists church_finance_audit_log_pastor_admin on public.church_finance_audit_log;
create policy church_finance_audit_log_pastor_admin on public.church_finance_audit_log
for select to authenticated
using(private.pastor_finance_access(church_id));

create or replace function private.upsert_finance_source_line(
  p_church_id uuid,
  p_account_id uuid,
  p_direction text,
  p_category text,
  p_amount numeric,
  p_occurred_on date,
  p_counterparty text,
  p_memo text,
  p_status text,
  p_source_type text,
  p_source_id uuid,
  p_source_line text,
  p_actor uuid
) returns void
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  insert into public.church_finance_transactions(
    church_id,account_id,direction,category,amount,occurred_on,counterparty,memo,
    transaction_status,source_type,source_id,source_line,created_by,updated_by,updated_at
  ) values(
    p_church_id,p_account_id,p_direction,btrim(p_category),greatest(coalesce(p_amount,0),0),p_occurred_on,
    nullif(btrim(coalesce(p_counterparty,'')),''),nullif(btrim(coalesce(p_memo,'')),''),p_status,
    p_source_type,p_source_id,p_source_line,p_actor,p_actor,now()
  )
  on conflict(church_id,source_type,source_id,source_line) where source_id is not null
  do update set
    account_id=excluded.account_id,
    direction=excluded.direction,
    category=excluded.category,
    amount=excluded.amount,
    occurred_on=excluded.occurred_on,
    counterparty=excluded.counterparty,
    memo=excluded.memo,
    transaction_status=excluded.transaction_status,
    updated_by=excluded.updated_by,
    updated_at=now();
end $$;

revoke all on function private.upsert_finance_source_line(uuid,uuid,text,text,numeric,date,text,text,text,text,uuid,text,uuid)
  from public,anon,authenticated;

create or replace function private.sync_contribution_batch_finance()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_actor uuid:=coalesce(auth.uid(),new.updated_by,new.created_by);
  v_status text:=case when new.status='posted' then 'posted' else 'void' end;
begin
  perform private.upsert_finance_source_line(new.church_id,new.account_id,'income','tithes',case when new.status='posted' then new.tithe_amount else 0 end,new.received_on,null,new.service_label,v_status,'contribution_batch',new.id,'tithes',v_actor);
  perform private.upsert_finance_source_line(new.church_id,new.account_id,'income','offerings',case when new.status='posted' then new.offering_amount else 0 end,new.received_on,null,new.service_label,v_status,'contribution_batch',new.id,'offerings',v_actor);
  perform private.upsert_finance_source_line(new.church_id,new.account_id,'income','missions',case when new.status='posted' then new.missions_amount else 0 end,new.received_on,null,new.service_label,v_status,'contribution_batch',new.id,'missions',v_actor);
  perform private.upsert_finance_source_line(new.church_id,new.account_id,'income','building',case when new.status='posted' then new.building_amount else 0 end,new.received_on,null,new.service_label,v_status,'contribution_batch',new.id,'building',v_actor);
  perform private.upsert_finance_source_line(new.church_id,new.account_id,'income','other_income',case when new.status='posted' then new.other_amount else 0 end,new.received_on,null,new.service_label,v_status,'contribution_batch',new.id,'other',v_actor);
  new.updated_at:=now();
  new.updated_by:=v_actor;
  return new;
end $$;

revoke all on function private.sync_contribution_batch_finance() from public,anon,authenticated;

drop trigger if exists church_contribution_batches_sync_finance on public.church_contribution_batches;
create trigger church_contribution_batches_sync_finance
before insert or update on public.church_contribution_batches
for each row execute function private.sync_contribution_batch_finance();

create or replace function private.sync_bill_finance()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_actor uuid:=coalesce(auth.uid(),new.updated_by,new.created_by);
  v_status text:=case when new.status='paid' then 'posted' else 'void' end;
  v_amount numeric:=case when new.status='paid' then coalesce(new.paid_amount,new.amount) else 0 end;
  v_date date:=coalesce(new.paid_on,new.due_on);
begin
  perform private.upsert_finance_source_line(
    new.church_id,new.account_id,'expense',new.category,v_amount,v_date,new.vendor,new.notes,
    v_status,'bill',new.id,'main',v_actor
  );
  new.updated_at:=now();
  new.updated_by:=v_actor;
  return new;
end $$;

revoke all on function private.sync_bill_finance() from public,anon,authenticated;

drop trigger if exists church_bills_sync_finance on public.church_bills;
create trigger church_bills_sync_finance
before insert or update on public.church_bills
for each row execute function private.sync_bill_finance();

create or replace function private.audit_church_finance_row()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_church_id uuid;
  v_entity_id uuid;
begin
  if tg_op='INSERT' then
    v_before:=null;
    v_after:=to_jsonb(new);
  elsif tg_op='UPDATE' then
    v_before:=to_jsonb(old);
    v_after:=to_jsonb(new);
  else
    v_before:=to_jsonb(old);
    v_after:=null;
  end if;

  v_church_id:=coalesce(nullif(v_after->>'church_id',''),nullif(v_before->>'church_id',''))::uuid;
  v_entity_id:=coalesce(nullif(v_after->>'id',''),nullif(v_before->>'id',''))::uuid;

  insert into public.church_finance_audit_log(
    church_id,entity_type,entity_id,action,changed_by,before_data,after_data
  ) values(
    v_church_id,tg_table_name,v_entity_id,lower(tg_op),auth.uid(),v_before,v_after
  );

  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

revoke all on function private.audit_church_finance_row() from public,anon,authenticated;

drop trigger if exists audit_church_finance_accounts on public.church_finance_accounts;
create trigger audit_church_finance_accounts
after insert or update or delete on public.church_finance_accounts
for each row execute function private.audit_church_finance_row();

drop trigger if exists audit_church_finance_transactions on public.church_finance_transactions;
create trigger audit_church_finance_transactions
after insert or update or delete on public.church_finance_transactions
for each row execute function private.audit_church_finance_row();

drop trigger if exists audit_church_contribution_batches on public.church_contribution_batches;
create trigger audit_church_contribution_batches
after insert or update or delete on public.church_contribution_batches
for each row execute function private.audit_church_finance_row();

drop trigger if exists audit_church_bills on public.church_bills;
create trigger audit_church_bills
after insert or update or delete on public.church_bills
for each row execute function private.audit_church_finance_row();

create or replace function public.pastor_finance_snapshot(
  p_church_id uuid,
  p_start_on date,
  p_end_on date
) returns table(
  total_income numeric,
  tithes numeric,
  offerings numeric,
  missions_income numeric,
  building_income numeric,
  other_income numeric,
  total_expense numeric,
  net_change numeric,
  open_bills_amount numeric,
  due_next_30_amount numeric,
  overdue_bills_amount numeric,
  current_account_balance numeric
)
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  if auth.uid() is null or not private.pastor_finance_access(p_church_id) then
    raise exception 'Pastor or church admin access required';
  end if;
  if p_start_on is null or p_end_on is null or p_end_on<p_start_on then
    raise exception 'Invalid finance reporting period';
  end if;

  return query
  with period_tx as(
    select * from public.church_finance_transactions
    where church_id=p_church_id
      and transaction_status='posted'
      and occurred_on between p_start_on and p_end_on
  ),
  all_account_tx as(
    select coalesce(sum(case when t.direction='income' then t.amount else -t.amount end),0) as delta
    from public.church_finance_transactions t
    join public.church_finance_accounts a on a.id=t.account_id and a.church_id=t.church_id
    where t.church_id=p_church_id
      and t.transaction_status='posted'
      and a.active=true
  ),
  opening as(
    select coalesce(sum(opening_balance),0) as amount
    from public.church_finance_accounts
    where church_id=p_church_id and active=true
  )
  select
    coalesce(sum(amount) filter(where direction='income'),0),
    coalesce(sum(amount) filter(where direction='income' and category='tithes'),0),
    coalesce(sum(amount) filter(where direction='income' and category='offerings'),0),
    coalesce(sum(amount) filter(where direction='income' and category='missions'),0),
    coalesce(sum(amount) filter(where direction='income' and category='building'),0),
    coalesce(sum(amount) filter(where direction='income' and category not in ('tithes','offerings','missions','building')),0),
    coalesce(sum(amount) filter(where direction='expense'),0),
    coalesce(sum(case when direction='income' then amount else -amount end),0),
    coalesce((select sum(b.amount) from public.church_bills b where b.church_id=p_church_id and b.status='open'),0),
    coalesce((select sum(b.amount) from public.church_bills b where b.church_id=p_church_id and b.status='open' and b.due_on between current_date and current_date+30),0),
    coalesce((select sum(b.amount) from public.church_bills b where b.church_id=p_church_id and b.status='open' and b.due_on<current_date),0),
    coalesce((select amount from opening),0)+coalesce((select delta from all_account_tx),0)
  from period_tx;
end $$;

revoke all on function public.pastor_finance_snapshot(uuid,date,date) from public,anon;
grant execute on function public.pastor_finance_snapshot(uuid,date,date) to authenticated;

revoke all on public.church_finance_accounts from anon;
revoke all on public.church_finance_transactions from anon;
revoke all on public.church_contribution_batches from anon;
revoke all on public.church_bills from anon;
revoke all on public.church_finance_audit_log from anon;

grant select,insert,update on public.church_finance_accounts to authenticated;
grant select,insert,update on public.church_finance_transactions to authenticated;
grant select,insert,update on public.church_contribution_batches to authenticated;
grant select,insert,update on public.church_bills to authenticated;
grant select on public.church_finance_audit_log to authenticated;
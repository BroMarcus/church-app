-- Kingdom Network Supabase schema drift check.
-- Expected hashes are recorded in supabase/schema_contract.json.
-- Run against the production project after every DDL/RLS/function/trigger change.

with
cols as (
  select md5(string_agg(format('%s.%s|%s|%s|%s|%s',table_schema,table_name,ordinal_position,column_name,data_type,coalesce(is_nullable,'')), E'\n' order by table_schema,table_name,ordinal_position)) h
  from information_schema.columns where table_schema='public'
),
cons as (
  select md5(string_agg(format('%s|%s',conrelid::regclass::text,pg_get_constraintdef(oid)), E'\n' order by conrelid::regclass::text,conname)) h
  from pg_constraint where connamespace='public'::regnamespace
),
funcs as (
  select md5(string_agg(format('%s|%s|%s|%s',p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,pg_get_functiondef(p.oid)), E'\n' order by p.proname,pg_get_function_identity_arguments(p.oid))) h
  from pg_proc p where p.pronamespace='public'::regnamespace
),
pols as (
  select md5(string_agg(format('%s|%s|%s|%s|%s|%s',tablename,policyname,cmd,roles,coalesce(qual,''),coalesce(with_check,'')), E'\n' order by tablename,policyname)) h
  from pg_policies where schemaname='public'
),
trigs as (
  select md5(string_agg(format('%s|%s|%s',event_object_table,trigger_name,action_statement), E'\n' order by event_object_table,trigger_name)) h
  from information_schema.triggers where trigger_schema='public'
), actual as (
  select (select h from cols) columns_md5,(select h from cons) constraints_md5,(select h from funcs) functions_md5,(select h from pols) policies_md5,(select h from trigs) triggers_md5
)
select case when columns_md5='190942531841bef85e145849668fe7b4'
 and constraints_md5='e194174a2ffe91e08881de19519a9053'
 and functions_md5='239fa86cf1b68054f6f1731bb21d68c1'
 and policies_md5='a9c26e90332760b3862c797bd19945a6'
 and triggers_md5='6193c30c4e78d4ed8389ac5262c39f40'
 then 'schema_contract_passed' else 'schema_contract_drifted' end result,
 * from actual;

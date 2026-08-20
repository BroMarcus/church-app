-- Restore the intended client-callable assessment authoring bridge without
-- replacing or weakening the guarded SECURITY DEFINER implementations.
--
-- The public functions are SECURITY INVOKER wrappers. The private helpers
-- perform auth.uid(), church-role/permission, and attempted-assessment guards,
-- but a prior hardening migration revoked authenticated EXECUTE on those
-- helpers. Because the private schema is not exposed through the Data API,
-- granting these specific helpers to authenticated lets only the public bridge
-- resolve while keeping the internal functions off the public RPC surface.

revoke all on function private.create_assessment_question_impl(uuid,text,text,jsonb,jsonb,integer,text) from public, anon;
revoke all on function private.update_assessment_question_impl(uuid,text,text,jsonb,jsonb,integer,text) from public, anon;
revoke all on function private.delete_assessment_question_impl(uuid) from public, anon;

grant execute on function private.create_assessment_question_impl(uuid,text,text,jsonb,jsonb,integer,text) to authenticated, service_role;
grant execute on function private.update_assessment_question_impl(uuid,text,text,jsonb,jsonb,integer,text) to authenticated, service_role;
grant execute on function private.delete_assessment_question_impl(uuid) to authenticated, service_role;

revoke all on function public.create_assessment_question(uuid,text,text,jsonb,jsonb,integer,text) from public, anon;
revoke all on function public.update_assessment_question(uuid,text,text,jsonb,jsonb,integer,text) from public, anon;
revoke all on function public.delete_assessment_question(uuid) from public, anon;

grant execute on function public.create_assessment_question(uuid,text,text,jsonb,jsonb,integer,text) to authenticated, service_role;
grant execute on function public.update_assessment_question(uuid,text,text,jsonb,jsonb,integer,text) to authenticated, service_role;
grant execute on function public.delete_assessment_question(uuid) to authenticated, service_role;

-- Lock down SECURITY DEFINER RPCs so only edge functions (service_role) can call them.
-- Without this, anyone with the anon key can call these with an arbitrary user_id
-- and burn through another user's daily code-execution or tutor limits.

REVOKE EXECUTE ON FUNCTION public.increment_code_execution_usage(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_code_execution_usage(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.increment_tutor_usage(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_tutor_usage(uuid) TO service_role;

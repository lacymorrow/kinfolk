-- Enable Row Level Security on all public schema tables
-- These tables were created by Drizzle without RLS, leaving them exposed
-- to direct access via the Supabase anon key.
--
-- With RLS enabled and no permissive policies, only the service role
-- (used by server actions / API routes) can access these tables.
-- Add specific policies later if client-side (anon key) access is needed.

ALTER TABLE public.db_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_address ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_api_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_authenticator ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_contact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_credit_transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_event_person ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_family ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_kinfolk_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_kinfolk_photo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_kinfolk_photo_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_kinfolk_post ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_person ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_post ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_project ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_project_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_relationship ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_role_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_team_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_temporary_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_user_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_user_file ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."db_verificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_waitlist_entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_webhook_event ENABLE ROW LEVEL SECURITY;

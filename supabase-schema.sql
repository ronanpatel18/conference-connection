-- =============================================
-- ATTENDEES TABLE SCHEMA
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- This creates the main table for conference attendees

-- Create attendees table
CREATE TABLE IF NOT EXISTS public.attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  linkedin_url TEXT,
  job_title TEXT,
  company TEXT,
  about TEXT,
  ai_summary TEXT,
  industry_tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS attendees_email_idx ON public.attendees(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS attendees_created_at_idx ON public.attendees(created_at DESC);

-- Create index on user_id for profile lookups
CREATE INDEX IF NOT EXISTS attendees_user_id_idx ON public.attendees(user_id);

-- Ensure each auth user has a single attendee profile
CREATE UNIQUE INDEX IF NOT EXISTS attendees_user_id_unique ON public.attendees(user_id);

-- Create index on industry_tags for filtering
CREATE INDEX IF NOT EXISTS attendees_industry_tags_idx ON public.attendees USING GIN(industry_tags);

-- Create index on sort_order for admin sorting
CREATE INDEX IF NOT EXISTS attendees_sort_order_idx ON public.attendees(sort_order ASC);

-- Create index on is_pinned for pinned attendees
CREATE INDEX IF NOT EXISTS attendees_is_pinned_idx ON public.attendees(is_pinned DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable Row Level Security
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to read all attendee profiles
CREATE POLICY "Allow authenticated read access"
  ON public.attendees
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Allow authenticated users to insert their own attendee profile
CREATE POLICY "Allow authenticated insert access"
  ON public.attendees
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow users to update their own records
-- For MVP, we'll allow updates based on email matching
-- In production, you'd want proper authentication
CREATE POLICY "Allow users to update own record"
  ON public.attendees
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- HELPER FUNCTION: Update updated_at timestamp
-- =============================================

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS set_updated_at ON public.attendees;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- HELPER FUNCTION: Delete auth user when attendee is deleted
-- =============================================

-- WARNING: This will permanently remove the auth account when a profile row is deleted.
-- Requires the function to run as SECURITY DEFINER so it can delete from auth.users.
CREATE OR REPLACE FUNCTION public.delete_auth_user_for_attendee()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS delete_auth_user_on_attendee_delete ON public.attendees;
CREATE TRIGGER delete_auth_user_on_attendee_delete
  AFTER DELETE ON public.attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_auth_user_for_attendee();

-- =============================================
-- OPTIONAL: Sample data for testing
-- =============================================

-- =============================================
-- MIGRATION: Add about column to existing table
-- =============================================
-- Run this if your attendees table already exists and you need to add the new field.
-- ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS about TEXT;

-- MIGRATION: Add user_id column + index for existing table
-- =============================================
-- ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
-- CREATE INDEX IF NOT EXISTS attendees_user_id_idx ON public.attendees(user_id);
-- CREATE UNIQUE INDEX IF NOT EXISTS attendees_user_id_unique ON public.attendees(user_id);

-- MIGRATION: Delete auth users when attendee row is deleted
-- =============================================
-- CREATE OR REPLACE FUNCTION public.delete_auth_user_for_attendee()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF OLD.user_id IS NOT NULL THEN
--     DELETE FROM auth.users WHERE id = OLD.user_id;
--   END IF;
--   RETURN OLD;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
-- DROP TRIGGER IF EXISTS delete_auth_user_on_attendee_delete ON public.attendees;
-- CREATE TRIGGER delete_auth_user_on_attendee_delete
--   AFTER DELETE ON public.attendees
--   FOR EACH ROW
--   EXECUTE FUNCTION public.delete_auth_user_for_attendee();

-- Uncomment to insert sample data
-- INSERT INTO public.attendees (name, email, linkedin_url, job_title, company, industry_tags) VALUES
-- ('John Doe', 'john@example.com', 'https://linkedin.com/in/johndoe', 'Software Engineer', 'Tech Corp', ARRAY['Technology', 'Software']),
-- ('Jane Smith', 'jane@example.com', 'https://linkedin.com/in/janesmith', 'Product Manager', 'Innovation Inc', ARRAY['Product', 'Management']);

-- =============================================
-- MIGRATION: Add sort_order and is_pinned columns for admin sorting
-- =============================================
-- Run this if your attendees table already exists and you need sorting features.
-- ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
-- ALTER TABLE public.attendees ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
-- CREATE INDEX IF NOT EXISTS attendees_sort_order_idx ON public.attendees(sort_order ASC);
-- CREATE INDEX IF NOT EXISTS attendees_is_pinned_idx ON public.attendees(is_pinned DESC);

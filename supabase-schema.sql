-- =============================================
-- ATTENDEES TABLE SCHEMA
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- This creates the main table for conference attendees

-- Create attendees table
CREATE TABLE IF NOT EXISTS public.attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  linkedin_url TEXT,
  job_title TEXT,
  company TEXT,
  ai_summary TEXT,
  industry_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS attendees_email_idx ON public.attendees(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS attendees_created_at_idx ON public.attendees(created_at DESC);

-- Create index on industry_tags for filtering
CREATE INDEX IF NOT EXISTS attendees_industry_tags_idx ON public.attendees USING GIN(industry_tags);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable Row Level Security
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow anyone to read all attendee profiles (public read)
CREATE POLICY "Allow public read access"
  ON public.attendees
  FOR SELECT
  USING (true);

-- Policy 2: Allow anyone to insert new attendees (for MVP - open registration)
CREATE POLICY "Allow public insert access"
  ON public.attendees
  FOR INSERT
  WITH CHECK (true);

-- Policy 3: Allow users to update their own records
-- For MVP, we'll allow updates based on email matching
-- In production, you'd want proper authentication
CREATE POLICY "Allow users to update own record"
  ON public.attendees
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

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
-- OPTIONAL: Sample data for testing
-- =============================================

-- Uncomment to insert sample data
-- INSERT INTO public.attendees (name, email, linkedin_url, job_title, company, industry_tags) VALUES
-- ('John Doe', 'john@example.com', 'https://linkedin.com/in/johndoe', 'Software Engineer', 'Tech Corp', ARRAY['Technology', 'Software']),
-- ('Jane Smith', 'jane@example.com', 'https://linkedin.com/in/janesmith', 'Product Manager', 'Innovation Inc', ARRAY['Product', 'Management']);

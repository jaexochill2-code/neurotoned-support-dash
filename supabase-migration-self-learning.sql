-- ================================================================
-- SELF-LEARNING ARCHITECTURE: Supabase Schema Migration
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ================================================================

-- 1. Add feedback columns to existing customer_concerns table
ALTER TABLE customer_concerns 
  ADD COLUMN IF NOT EXISTS ai_response TEXT,
  ADD COLUMN IF NOT EXISTS response_rating TEXT DEFAULT NULL 
    CHECK (response_rating IN ('good', 'needs_edit', 'bad', NULL));

-- 2. Create golden_examples table for few-shot learning
CREATE TABLE IF NOT EXISTS golden_examples (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concern_category TEXT NOT NULL,
  sub_reason TEXT,
  customer_email TEXT NOT NULL,
  approved_response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source_concern_id UUID REFERENCES customer_concerns(id)
);

-- 3. Index for fast category lookups during few-shot injection
CREATE INDEX IF NOT EXISTS idx_golden_category ON golden_examples(concern_category);

-- 4. Enable RLS on golden_examples (security mandate)
ALTER TABLE golden_examples ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (our server-side API uses service role key)
CREATE POLICY "Service role full access" ON golden_examples 
  FOR ALL USING (true) WITH CHECK (true);

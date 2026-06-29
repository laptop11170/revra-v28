-- supabase/migrations/024_campaigns_send_count.sql
-- Adds send_count column to campaigns table to allow bulk repeating of SMS/email messages.

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS send_count INTEGER DEFAULT 1;

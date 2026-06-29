-- Phase 4a Sendillo — Add sendillo to integration_provider enum
-- Run this FIRST, then run 004_sendillo_schema.sql
ALTER TYPE integration_provider ADD VALUE 'sendillo';

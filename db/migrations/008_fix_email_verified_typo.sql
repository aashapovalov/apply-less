-- Fix typo from migration 007
ALTER TABLE users RENAME COLUMN email_verifies TO email_verified;
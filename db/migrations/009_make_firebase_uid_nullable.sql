-- Make firebase_uid nullable for custom JWT auth (not using Firebase)
ALTER TABLE users ALTER COLUMN firebase_uid DROP NOT NULL;
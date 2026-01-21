-- Auth tables for JWT verification

-- Update user table (add auth fields alongside firebase_uid)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verifies BOOLEAN DEFAULT FALSE;

-- Make email unique if not already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
    ) THEN
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
END IF;
END $$;

-- Refresh tokens (for JWT refresh flow)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON verification_tokens(user_id);

- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    attempts INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
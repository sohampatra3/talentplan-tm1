CREATE TABLE IF NOT EXISTS connection_profile (
  session_id UUID PRIMARY KEY,
  encrypted_profile TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

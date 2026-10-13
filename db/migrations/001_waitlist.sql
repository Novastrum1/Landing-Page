-- Waitlist sign-ups from the landing page form.
CREATE TABLE IF NOT EXISTS waitlist (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text NOT NULL,
  first_name  text NOT NULL,
  country     text,
  whatsapp    text,
  markets     text[] NOT NULL DEFAULT '{}',
  experience  text,
  broker      text,
  consent_at  timestamptz NOT NULL,
  welcome_sent_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One sign-up per address, regardless of letter case.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_key ON waitlist (lower(email));

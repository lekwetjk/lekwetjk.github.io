CREATE TABLE IF NOT EXISTS member_companies (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS member_company_users (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES member_users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES member_companies(id)
);
CREATE INDEX IF NOT EXISTS member_company_users_company_idx ON member_company_users(company_id);
INSERT INTO member_companies (id, name)
SELECT id, name FROM member_users WHERE role = 'member'
ON CONFLICT(id) DO NOTHING;
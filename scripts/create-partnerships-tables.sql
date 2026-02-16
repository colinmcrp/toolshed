-- MCR Pathways Relationship Hub: Partnership Tables
-- Run this migration against your Supabase database

-- Partners table
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  types TEXT[] NOT NULL DEFAULT '{}',
  heat INTEGER NOT NULL DEFAULT 50,
  last_contact TIMESTAMPTZ,
  summary TEXT,
  volunteer_hours INTEGER NOT NULL DEFAULT 0,
  mentors_count INTEGER NOT NULL DEFAULT 0,
  pipeline_registered INTEGER NOT NULL DEFAULT 0,
  pipeline_interviewed INTEGER NOT NULL DEFAULT 0,
  pipeline_trained INTEGER NOT NULL DEFAULT 0,
  pipeline_approved INTEGER NOT NULL DEFAULT 0,
  pipeline_matched INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partner domains: maps email domains to partner orgs
CREATE TABLE IF NOT EXISTS partner_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add partner_id to profiles for partner-role users
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

-- Update profiles role to include 'partner'
-- Note: If using a CHECK constraint, you'll need to drop and recreate it.
-- Supabase typically uses text type so we just document the valid values.

-- Emails (communication log)
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  recipient TEXT,
  subject TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('draft', 'sent', 'received', 'opened')),
  thread_id TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Completed')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Final', 'Expired')),
  file_url TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Commitments
CREATE TABLE IF NOT EXISTS commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Active', 'Fulfilled', 'Planned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target INTEGER NOT NULL,
  current INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_domains_domain ON partner_domains(domain);
CREATE INDEX IF NOT EXISTS idx_emails_partner_id ON emails(partner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_partner_id ON tasks(partner_id);
CREATE INDEX IF NOT EXISTS idx_documents_partner_id ON documents(partner_id);
CREATE INDEX IF NOT EXISTS idx_commitments_partner_id ON commitments(partner_id);
CREATE INDEX IF NOT EXISTS idx_goals_partner_id ON goals(partner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_id ON profiles(partner_id);

-- RLS Policies
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Staff/manager/admin: full access to all partnership tables
CREATE POLICY "Staff full access to partners" ON partners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('staff', 'manager', 'admin'))
  );

CREATE POLICY "Staff full access to partner_domains" ON partner_domains
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('staff', 'manager', 'admin'))
  );

CREATE POLICY "Staff full access to emails" ON emails
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('staff', 'manager', 'admin'))
  );

CREATE POLICY "Staff full access to tasks" ON tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('staff', 'manager', 'admin'))
  );

CREATE POLICY "Staff full access to documents" ON documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('staff', 'manager', 'admin'))
  );

CREATE POLICY "Staff full access to commitments" ON commitments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('staff', 'manager', 'admin'))
  );

CREATE POLICY "Staff full access to goals" ON goals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('staff', 'manager', 'admin'))
  );

-- Partner role: SELECT only on own org's data
CREATE POLICY "Partners read own org" ON partners
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner' AND profiles.partner_id = partners.id)
  );

CREATE POLICY "Partners read own emails" ON emails
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner' AND profiles.partner_id = emails.partner_id)
  );

CREATE POLICY "Partners read own tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner' AND profiles.partner_id = tasks.partner_id)
  );

CREATE POLICY "Partners read own documents" ON documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner' AND profiles.partner_id = documents.partner_id)
  );

CREATE POLICY "Partners read own commitments" ON commitments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner' AND profiles.partner_id = commitments.partner_id)
  );

CREATE POLICY "Partners read own goals" ON goals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'partner' AND profiles.partner_id = goals.partner_id)
  );

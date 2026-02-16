-- Seed data for MCR Pathways Relationship Hub
-- Based on mockData from the prototype

-- Insert SDS partner
INSERT INTO partners (id, name, types, heat, last_contact, summary, volunteer_hours, mentors_count, pipeline_registered, pipeline_interviewed, pipeline_trained, pipeline_approved, pipeline_matched)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Skills Development Scotland (SDS)',
  ARRAY['Employer of Mentors', 'Delivery Partner'],
  82,
  '2024-05-15',
  'SDS is a key strategic partner providing office space in Glasgow and actively encouraging staff to mentor. They recently committed to a new wave of 50 mentors for the upcoming academic year.',
  850,
  32,
  85, 62, 45, 38, 32
);

-- Map sds.co.uk domain
INSERT INTO partner_domains (domain, partner_id)
VALUES ('sds.co.uk', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- Goals
INSERT INTO goals (partner_id, title, target, current, unit, deadline) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mentor Recruitment', 50, 32, 'Mentors', '2024-09-01'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Volunteer Hours', 1200, 850, 'Hours', '2024-12-31'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Work Experience Placements', 10, 4, 'Placements', '2024-06-30');

-- Documents
INSERT INTO documents (partner_id, name, type, status, date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Strategic Partnership Agreement 2024', 'Agreement', 'Final', '2024-01-10'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Data Sharing Protocol V2', 'Data Sharing', 'Final', '2024-02-15'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Joint Press Release - Mentoring Month', 'Press Release', 'Draft', '2024-05-01'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'SDS CSR Policy 2024-2025', 'Policy', 'Final', '2023-12-01');

-- Commitments
INSERT INTO commitments (partner_id, type, description, status) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Space/Facilities', 'Office space in Glasgow City Centre', 'Active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Resources/In-Kind', 'Office furniture donation (20 desks)', 'Fulfilled'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Mentors', 'Staff mentoring release time (1hr/week)', 'Active');

-- Tasks
INSERT INTO tasks (partner_id, title, due_date, status, priority) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Quarterly review meeting', '2024-06-10', 'To Do', 'High'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Marketing collateral for staff portal', '2024-05-25', 'Completed', 'Medium'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Onboarding session for 5 new mentors', '2024-06-01', 'In Progress', 'High'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Data sharing agreement signature', '2024-05-30', 'To Do', 'High'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Draft press release review', '2024-05-28', 'In Progress', 'Medium');

-- Emails
INSERT INTO emails (partner_id, sender, recipient, subject, content, status, date) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'jane.smith@sds.co.uk', 'laura@mcrpathways.org', 'Mentoring Space Update', 'Hi MCR team, just confirming the new furniture has arrived at our Glasgow hub. We can allocate 3 more desks for your regional staff.', 'received', '2024-05-14');

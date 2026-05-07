-- Migration: 0002_org_invitations.sql
-- Adds the multi-seat invitation flow used by Hafta 4 of Phase 0.
--
-- Each row represents a pending invitation. Once `accepted_at` is set, the
-- invited user has joined the org and the row stays for audit history.

CREATE TABLE org_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'engineer', 'auditor')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_org_invitations_org_id ON org_invitations(org_id);
CREATE INDEX idx_org_invitations_email ON org_invitations(email) WHERE accepted_at IS NULL;
CREATE INDEX idx_org_invitations_token ON org_invitations(token) WHERE accepted_at IS NULL;

ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Owners and admins of an org can manage its invitations.
CREATE POLICY "owners_admins_manage_invites" ON org_invitations
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Anonymous users can read an invitation by token (needed for the accept page
-- before they sign up). Restricted to non-accepted, non-expired rows.
CREATE POLICY "public_read_pending_invite_by_token" ON org_invitations
  FOR SELECT
  USING (accepted_at IS NULL AND expires_at > NOW());

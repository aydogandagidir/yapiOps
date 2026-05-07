import type { OrgRole } from '@yapiops/db/types';

/**
 * Role permissions matrix — mirrors CLAUDE.md §6.2.
 *
 * | Role     | Project | Report | Ek-3 | Billing | Org settings | Audit log |
 * |----------|---------|--------|------|---------|--------------|-----------|
 * | Owner    | CRUD    | CRUD   | CRUD | RW      | RW           | R         |
 * | Admin    | CRUD    | CRUD   | CRUD | R       | RW           | R         |
 * | Engineer | CRUD*   | CRUD*  | CRUD*| —       | —            | —         |
 * | Auditor  | R       | R      | R    | —       | —            | —         |
 *
 * * Engineer can only CRUD projects/reports/forms they own or are assigned to.
 *   Row-level scoping is enforced by Postgres RLS — these helpers gate the UI.
 */

export function canEditBilling(role: OrgRole): boolean {
  return role === 'owner';
}

export function canViewBilling(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canViewAudit(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageOrg(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageSeats(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canCreateProject(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'engineer';
}

export function canCreateReport(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'engineer';
}

export function canSignEk3(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'engineer';
}

export function isReadOnly(role: OrgRole): boolean {
  return role === 'auditor';
}

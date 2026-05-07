/**
 * YapıOps domain types — mirrors CHECK constraints in
 * `infrastructure/supabase/migrations/0001_initial_schema.sql`.
 * Keep these in sync when adding new enum values to the DB.
 */

export type OrgRole = 'owner' | 'admin' | 'engineer' | 'auditor';

export type SubscriptionTier = 'free' | 'solo' | 'office' | 'office_ai' | 'enterprise';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired';

export type PlanCode =
  | 'free'
  | 'solo_monthly'
  | 'solo_yearly'
  | 'office_monthly'
  | 'office_yearly'
  | 'office_ai_monthly'
  | 'office_ai_yearly'
  | 'enterprise';

export type BillingInterval = 'monthly' | 'yearly';

export type EInvoiceStatus = 'pending' | 'sent' | 'accepted' | 'rejected' | 'failed';

export type ReportStatus = 'queued' | 'generating' | 'ready' | 'failed';

export type ReportType =
  | 'tbdy_full'
  | 'perde_only'
  | 'oteleme'
  | 'ikinci_mertebe'
  | 'kolon'
  | 'doseme';

export type Ek3Status = 'draft' | 'completed' | 'signed' | 'superseded';

export type FirmaSablonType = 'muteahhit' | 'denetim';

export type AiModel = 'claude-opus-4-7' | 'claude-haiku-4-5' | 'claude-managed-agent';

/**
 * Audit action codes — emitted whenever AuditLogger.log() is called.
 * New actions must be added here AND documented in `docs-internal/CLAUDE.md`.
 */
export type AuditAction =
  | 'login.success'
  | 'login.failed'
  | 'logout'
  | 'org.created'
  | 'org.updated'
  | 'org.member.invited'
  | 'org.member.joined'
  | 'org.member.removed'
  | 'org.role.changed'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'ek3.created'
  | 'ek3.updated'
  | 'ek3.generated'
  | 'ek3.revised'
  | 'ek3.deleted'
  | 'ek3.signed'
  | 'ek3.etabs_imported'
  | 'firma_sablon.created'
  | 'firma_sablon.updated'
  | 'firma_sablon.deleted'
  | 'report.generated'
  | 'report.downloaded'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.payment_succeeded'
  | 'subscription.payment_failed'
  | 'invoice.issued'
  | 'invoice.failed';

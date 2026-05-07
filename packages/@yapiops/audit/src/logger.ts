import { type SupabaseClient } from '@supabase/supabase-js';
import { type AuditAction } from '@yapiops/db';

export interface AuditContext {
  orgId: string;
  userId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogOptions {
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditQueryFilters {
  action?: AuditAction;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  since?: Date;
  until?: Date;
  limit?: number;
}

/**
 * Writes structured audit events to the `audit_logs` table.
 *
 * Why this exists: KVKK (CLAUDE.md §9.1) and engineering responsibility
 * (CLAUDE.md §9.2) both require a tamper-evident trail of who did what,
 * when, and from where. Every write that could affect compliance,
 * billing, or engineering decisions should call `log()`.
 */
export class AuditLogger {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly context: AuditContext,
  ) {}

  async log(action: AuditAction, options: AuditLogOptions = {}): Promise<void> {
    const { error } = await this.supabase.from('audit_logs').insert({
      org_id: this.context.orgId,
      user_id: this.context.userId,
      action,
      resource_type: options.resourceType ?? null,
      resource_id: options.resourceId ?? null,
      metadata: options.metadata ?? null,
      ip_address: this.context.ipAddress ?? null,
      user_agent: this.context.userAgent ?? null,
    });

    if (error) {
      // Audit failures are visible — they should never silently swallow.
      // Caller decides whether to fail the request or just log to Sentry.
      throw new Error(`Audit log write failed: ${error.message}`);
    }
  }

  async query(filters: AuditQueryFilters = {}): Promise<unknown[]> {
    let q = this.supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', this.context.orgId)
      .order('created_at', { ascending: false });

    if (filters.action) q = q.eq('action', filters.action);
    if (filters.resourceType) q = q.eq('resource_type', filters.resourceType);
    if (filters.resourceId) q = q.eq('resource_id', filters.resourceId);
    if (filters.userId) q = q.eq('user_id', filters.userId);
    if (filters.since) q = q.gte('created_at', filters.since.toISOString());
    if (filters.until) q = q.lte('created_at', filters.until.toISOString());
    q = q.limit(filters.limit ?? 100);

    const { data, error } = await q;
    if (error) {
      throw new Error(`Audit query failed: ${error.message}`);
    }
    return (data ?? []) as unknown[];
  }
}

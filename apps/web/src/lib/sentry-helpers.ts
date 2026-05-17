import * as Sentry from '@sentry/nextjs';

/**
 * Sentry breadcrumb + tag yardımcıları. Route handler'larda olay zincirini
 * (sihirbaz adımları, PDF üretimi, şablon sync'i) kaydeder; bir hata
 * fırladığında ilgili context Sentry'ye otomatik düşer.
 */

export type Ek3BreadcrumbAction =
  | 'created'
  | 'updated'
  | 'generated'
  | 'revised'
  | 'deleted'
  | 'quota_exceeded'
  | 'template_synced'
  | 'template_uploaded'
  | 'template_activated'
  | 'template_sync_failed';

export interface Ek3BreadcrumbInput {
  action: Ek3BreadcrumbAction;
  orgId: string;
  resourceId?: string;
  data?: Record<string, unknown>;
}

export function breadcrumbEk3(input: Ek3BreadcrumbInput): void {
  Sentry.addBreadcrumb({
    category: 'ek3',
    message: input.action,
    level:
      input.action.includes('failed') || input.action.includes('exceeded') ? 'warning' : 'info',
    data: {
      orgId: input.orgId,
      ...(input.resourceId ? { resourceId: input.resourceId } : {}),
      ...(input.data ?? {}),
    },
  });
}

export interface RouteErrorContext {
  route: string;
  feature: 'ek3' | 'ek3_template' | 'project' | 'firma_sablon' | 'billing';
  orgId?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

/**
 * Route handler'larda istisna yakalama yardımcısı. Sentry tag'leriyle event
 * zenginleştirilir ki dashboard'da `feature:ek3` filtresi anlamlı olsun.
 */
export function captureRouteError(error: unknown, context: RouteErrorContext): void {
  Sentry.withScope((scope) => {
    scope.setTag('route', context.route);
    scope.setTag('feature', context.feature);
    if (context.orgId) scope.setTag('orgId', context.orgId);
    if (context.userId) scope.setUser({ id: context.userId });
    if (context.extra) scope.setContext('extra', context.extra);
    Sentry.captureException(error);
  });
}

/**
 * Düşük şiddetli mesajlar (örn. cron template fetch geçici başarısızlık).
 * Hata fırlamaz, sadece Sentry breadcrumb gibi davranır ama "issue" oluşturur.
 */
export function captureRouteWarning(message: string, context: RouteErrorContext): void {
  Sentry.withScope((scope) => {
    scope.setTag('route', context.route);
    scope.setTag('feature', context.feature);
    if (context.orgId) scope.setTag('orgId', context.orgId);
    if (context.extra) scope.setContext('extra', context.extra);
    Sentry.captureMessage(message, 'warning');
  });
}

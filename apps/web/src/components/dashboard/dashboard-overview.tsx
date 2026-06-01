import { cn } from '@yapiops/ui';
import {
  Building2,
  Calendar,
  CreditCard,
  FileText,
  FolderOpen,
  Gauge,
  Plus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

export type Ek3Status = 'draft' | 'completed' | 'signed' | 'superseded';

export interface RecentEk3Item {
  id: string;
  version: number;
  status: Ek3Status;
  generatedAt: string | null;
  createdAt: string;
  projectName: string | null;
}

export interface DashboardOverviewProps {
  locale: string;
  fullName: string | null;
  projectCount: number;
  ek3Count: number;
  quotaUsed: number;
  quotaLimit: number | null;
  recent: RecentEk3Item[];
}

export async function DashboardOverview({
  locale,
  fullName,
  projectCount,
  ek3Count,
  quotaUsed,
  quotaLimit,
  recent,
}: DashboardOverviewProps): Promise<React.JSX.Element> {
  const t = await getTranslations('dashboard');
  const isEmpty = projectCount === 0 && ek3Count === 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {fullName ? t('welcome', { name: fullName }) : t('welcomeAnonymous')}
        </h1>
      </header>

      <ValueProp />

      <StatsGrid
        projectCount={projectCount}
        ek3Count={ek3Count}
        quotaUsed={quotaUsed}
        quotaLimit={quotaLimit}
      />

      {isEmpty ? (
        <OnboardingCard projectCount={projectCount} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <RecentEk3sCard items={recent} locale={locale} />
          <QuickActionsCard />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Value proposition strip — explains in one line what the app does. Shown to
// every user; doubles as orientation for first-time visitors who land on the
// dashboard without context.
// ---------------------------------------------------------------------------

async function ValueProp(): Promise<React.JSX.Element> {
  const t = await getTranslations('dashboard.valueProp');
  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-6">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{t('title')}</p>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stats grid — 4 compact KPI cards. Quota card swaps in a progress bar.
// ---------------------------------------------------------------------------

interface StatsGridProps {
  projectCount: number;
  ek3Count: number;
  quotaUsed: number;
  quotaLimit: number | null;
}

async function StatsGrid({
  projectCount,
  ek3Count,
  quotaUsed,
  quotaLimit,
}: StatsGridProps): Promise<React.JSX.Element> {
  const t = await getTranslations('dashboard.stats');
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={FolderOpen} label={t('projects')} value={projectCount} />
      <StatCard icon={FileText} label={t('ek3Total')} value={ek3Count} />
      <StatCard icon={Calendar} label={t('ek3ThisMonth')} value={quotaUsed} />
      <QuotaStatCard used={quotaUsed} limit={quotaLimit} />
    </div>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
}

function StatCard({ icon: Icon, label, value }: StatCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums">{String(value)}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

async function QuotaStatCard({
  used,
  limit,
}: {
  used: number;
  limit: number | null;
}): Promise<React.JSX.Element> {
  const t = await getTranslations('dashboard.quota');
  const tStats = await getTranslations('dashboard.stats');
  const isUnlimited = limit === null;
  const safeLimit = Math.max(1, limit ?? 1);
  const pct = isUnlimited ? 0 : Math.min(100, (used / safeLimit) * 100);
  // `!isUnlimited` already narrows `limit` to `number` for the comparison.
  const reached = !isUnlimited && used >= limit;

  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-muted p-2">
            <Gauge className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{tStats('quota')}</p>
        </div>
        {isUnlimited ? (
          <p className="text-base font-semibold">{t('unlimited')}</p>
        ) : (
          <>
            <p className="text-base font-semibold tabular-nums">
              {String(used)} / {String(limit)}
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  reached ? 'bg-destructive' : 'bg-primary',
                )}
                style={{ width: `${String(pct)}%` }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Onboarding — shown only when the org is fully empty (no projects, no Ek-3s).
// Three numbered steps; later steps are visually disabled until earlier ones
// have data. Resolves the "I don't know what this app does" UX gap.
// ---------------------------------------------------------------------------

async function OnboardingCard({
  projectCount,
}: {
  projectCount: number;
}): Promise<React.JSX.Element> {
  const t = await getTranslations('dashboard.onboarding');
  const step1Done = projectCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <OnboardingStep
          n={1}
          title={t('step1')}
          hint={t('step1Hint')}
          done={step1Done}
          enabled
          cta={{ href: '/projects/new', label: t('step1Cta') }}
        />
        <OnboardingStep
          n={2}
          title={t('step2')}
          hint={t('step2Hint')}
          done={false}
          enabled={step1Done}
          cta={{ href: '/ek3pilot/new', label: t('step2Cta') }}
        />
        <OnboardingStep
          n={3}
          title={t('step3')}
          hint={t('step3Hint')}
          done={false}
          enabled={false}
        />
      </CardContent>
    </Card>
  );
}

interface OnboardingStepProps {
  n: number;
  title: string;
  hint: string;
  done: boolean;
  enabled: boolean;
  cta?: { href: '/projects/new' | '/ek3pilot/new'; label: string };
}

function OnboardingStep({
  n,
  title,
  hint,
  done,
  enabled,
  cta,
}: OnboardingStepProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border p-3',
        !enabled && !done && 'opacity-60',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          done
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            : enabled
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
        )}
        aria-hidden
      >
        {done ? '✓' : String(n)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {cta && enabled && !done ? (
        <Button asChild size="sm">
          <Link href={cta.href}>
            <Plus className="mr-1 h-3.5 w-3.5" /> {cta.label}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Ek-3s — last 5 forms with a status badge. Clicking opens the wizard.
// ---------------------------------------------------------------------------

async function RecentEk3sCard({
  items,
  locale,
}: {
  items: RecentEk3Item[];
  locale: string;
}): Promise<React.JSX.Element> {
  const t = await getTranslations('dashboard.recent');
  const tStatus = await getTranslations('dashboard.status');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/ek3pilot/${item.id}`}
              className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.projectName ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {t('version', { version: item.version })} · {formatDate(item.createdAt, locale)}
                </p>
              </div>
              <StatusBadge status={item.status} label={tStatus(item.status)} />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, label }: { status: Ek3Status; label: string }): React.JSX.Element {
  const classes: Record<Ek3Status, string> = {
    draft: 'bg-muted text-muted-foreground',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    signed: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    superseded: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        classes[status],
      )}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Quick actions — the four CTAs the user reaches for most often.
// ---------------------------------------------------------------------------

async function QuickActionsCard(): Promise<React.JSX.Element> {
  const t = await getTranslations('dashboard.quickActions');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" /> {t('newProject')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/ek3pilot/new">
            <Plus className="mr-2 h-4 w-4" /> {t('newEk3')}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/ek3pilot/firma-sablonlari">
            <Building2 className="mr-2 h-4 w-4" /> {t('templates')}
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/billing">
            <CreditCard className="mr-2 h-4 w-4" /> {t('billing')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

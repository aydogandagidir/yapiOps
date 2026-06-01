import { cn } from '@yapiops/ui';
import {
  CheckCircle2,
  CreditCard,
  FileText,
  LineChart,
  Sparkles,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

type ModuleKey = 'ek3pilot' | 'raporX' | 'spektrumHub' | 'copilot' | 'billingCore';
type ModuleStatus = 'live' | 'phase2' | 'phase3' | 'background';
type PlanKey = 'free' | 'solo' | 'office' | 'officeAi' | 'enterprise';
type PhaseKey = 'phase1' | 'phase2' | 'phase3a' | 'phase3b';

const MODULES: { id: ModuleKey; icon: LucideIcon; status: ModuleStatus }[] = [
  { id: 'ek3pilot', icon: FileText, status: 'live' },
  { id: 'raporX', icon: LineChart, status: 'phase2' },
  { id: 'spektrumHub', icon: Waves, status: 'phase3' },
  { id: 'copilot', icon: Sparkles, status: 'phase3' },
  { id: 'billingCore', icon: CreditCard, status: 'background' },
];

const PHASES: PhaseKey[] = ['phase1', 'phase2', 'phase3a', 'phase3b'];
const TIER_PLANS: PlanKey[] = ['free', 'solo', 'office', 'officeAi'];
const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
const TRUST_KEYS = ['label1', 'label2', 'label3', 'label4', 'label5'] as const;
const STEP_KEYS = ['step1', 'step2', 'step3'] as const;

const STATUS_CLASSES: Record<ModuleStatus, string> = {
  live: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  phase2: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  phase3: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  background: 'bg-muted text-muted-foreground',
};

export function LandingPage(): React.JSX.Element {
  // Each subsection is its own async server component, so React handles the
  // suspense / waterfall — the outer wrapper stays sync.
  return (
    <main className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <Hero />
      <TrustStrip />
      <ModulesSection />
      <SpotlightSection />
      <RoadmapSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <MarketingFooter />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Top navigation — sticky, transparent backdrop.
// ---------------------------------------------------------------------------

async function MarketingNav(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.nav');
  const tCommon = await getTranslations('common');
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold">
          {tCommon('appName')}
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <a href="#modules" className="text-muted-foreground hover:text-foreground">
            {t('modules')}
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground">
            {t('pricing')}
          </a>
          <a href="#faq" className="text-muted-foreground hover:text-foreground">
            {t('faq')}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t('signIn')}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">{t('signUp')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero — single-cell value pitch + primary/secondary CTAs.
// ---------------------------------------------------------------------------

async function Hero(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.hero');
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
          {t('heading')}
        </h1>
        <p className="mt-5 text-balance text-lg text-muted-foreground md:text-xl">
          {t('subheading')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">{t('ctaPrimary')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#ek3pilot-spotlight">{t('ctaSecondary')}</a>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t('microcopy')}</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust strip — KVKK / e-imza / e-fatura / TBDY / Türkiye barındırma.
// ---------------------------------------------------------------------------

async function TrustStrip(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.trust');
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-6 text-xs text-muted-foreground md:text-sm">
        {TRUST_KEYS.map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            {t(key)}
          </span>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Modules section — 5 cards, each with a status pill.
// ---------------------------------------------------------------------------

async function ModulesSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.modules');
  return (
    <section id="modules" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t('heading')}</h2>
        <p className="mt-3 text-muted-foreground">{t('subheading')}</p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {MODULES.map((mod) => (
          <ModuleCard key={mod.id} moduleId={mod.id} icon={mod.icon} status={mod.status} />
        ))}
      </div>
    </section>
  );
}

async function ModuleCard({
  moduleId,
  icon: Icon,
  status,
}: {
  moduleId: ModuleKey;
  icon: LucideIcon;
  status: ModuleStatus;
}): Promise<React.JSX.Element> {
  const t = await getTranslations(`landing.modules.items.${moduleId}`);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
              STATUS_CLASSES[status],
            )}
          >
            {t('status')}
          </span>
        </div>
        <CardTitle className="text-base">{t('name')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Ek3Pilot spotlight — 3-step flow next to a short headline.
// ---------------------------------------------------------------------------

async function SpotlightSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.spotlight');
  return (
    <section id="ek3pilot-spotlight" className="border-y bg-muted/20">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-2">
        <div className="flex flex-col justify-center">
          <h2 className="text-3xl font-bold tracking-tight">{t('heading')}</h2>
          <p className="mt-3 text-muted-foreground">{t('subheading')}</p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href="/signup">{t('cta')}</Link>
            </Button>
          </div>
        </div>
        <ol className="space-y-4">
          {STEP_KEYS.map((stepKey, idx) => (
            <SpotlightStep
              key={stepKey}
              number={idx + 1}
              title={t(`${stepKey}Title`)}
              description={t(`${stepKey}Description`)}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

function SpotlightStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <li className="flex items-start gap-4 rounded-lg border bg-background p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {String(number)}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Roadmap — 4 phases vertically.
// ---------------------------------------------------------------------------

async function RoadmapSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.roadmap');
  return (
    <section className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t('heading')}</h2>
        <p className="mt-3 text-muted-foreground">{t('subheading')}</p>
      </div>
      <ol className="mx-auto mt-12 max-w-2xl space-y-3">
        {PHASES.map((phase) => (
          <li
            key={phase}
            className="rounded-lg border bg-background p-4 transition-colors hover:bg-accent/30"
          >
            <p className="font-medium">{t(`${phase}Title`)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(`${phase}Description`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pricing — 4 plans + Enterprise card. "Office" is highlighted as recommended.
// ---------------------------------------------------------------------------

async function PricingSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.pricing');
  return (
    <section id="pricing" className="border-y bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t('heading')}</h2>
          <p className="mt-3 text-muted-foreground">{t('subheading')}</p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {TIER_PLANS.map((plan) => (
            <PlanCard key={plan} planId={plan} recommended={plan === 'office'} />
          ))}
        </div>
        <div className="mt-4">
          <EnterpriseCard />
        </div>
      </div>
    </section>
  );
}

async function PlanCard({
  planId,
  recommended,
}: {
  planId: PlanKey;
  recommended: boolean;
}): Promise<React.JSX.Element> {
  const t = await getTranslations(`landing.pricing.${planId}`);
  const tPricing = await getTranslations('landing.pricing');
  return (
    <Card className={cn('flex h-full flex-col', recommended && 'border-primary shadow-md')}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('name')}</CardTitle>
          {recommended ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {tPricing('recommended')}
            </span>
          ) : null}
        </div>
        <p className="text-2xl font-bold">{t('price')}</p>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button asChild className="w-full" variant={recommended ? 'default' : 'outline'}>
          <Link href="/signup">{tPricing('ctaSelect')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

async function EnterpriseCard(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.pricing.enterprise');
  const tPricing = await getTranslations('landing.pricing');
  return (
    <Card>
      <CardContent className="flex flex-col items-start justify-between gap-4 pt-6 md:flex-row md:items-center">
        <div>
          <p className="text-lg font-semibold">{t('name')}</p>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold">{t('price')}</span>
          <Button asChild variant="outline">
            <a href="mailto:info@bluedev.dev">{tPricing('ctaEnterprise')}</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// FAQ — 5 Q&A pairs as <details> for native accordion behavior, no JS.
// ---------------------------------------------------------------------------

async function FaqSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.faq');
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight">{t('heading')}</h2>
      <div className="mt-12 space-y-3">
        {FAQ_KEYS.map((key) => (
          <details
            key={key}
            className="group rounded-lg border bg-background p-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
              {t(`${key}Question`)}
              <span
                aria-hidden
                className="text-muted-foreground transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{t(`${key}Answer`)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final CTA banner.
// ---------------------------------------------------------------------------

async function FinalCtaSection(): Promise<React.JSX.Element> {
  const t = await getTranslations('landing.finalCta');
  return (
    <section className="bg-primary/5">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight">{t('heading')}</h2>
        <p className="mt-3 text-muted-foreground">{t('subheading')}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">{t('ctaPrimary')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="mailto:info@bluedev.dev">{t('ctaSecondary')}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer — minimal: brand + KVKK link + contact.
// ---------------------------------------------------------------------------

async function MarketingFooter(): Promise<React.JSX.Element> {
  const tCommon = await getTranslations('common');
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center">
        <p>
          <strong className="text-foreground">{tCommon('appName')}</strong> — BlueDev
        </p>
        <div className="flex items-center gap-4">
          <Link href="/legal/kvkk" className="hover:text-foreground">
            KVKK
          </Link>
          <a href="mailto:info@bluedev.dev" className="hover:text-foreground">
            info@bluedev.dev
          </a>
        </div>
      </div>
    </footer>
  );
}

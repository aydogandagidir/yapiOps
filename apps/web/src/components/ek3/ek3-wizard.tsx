'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EK3_STEPS,
  type Ek3Step,
  type FirmaBilgileri,
  type InsaatBilgileri,
  type KisiBilgileri,
  type ProjeBilgileri,
  type YapiBilgileri,
  type YapiDenetimBilgileri,
} from '@yapiops/ek3';
import { cn } from '@yapiops/ui';
import { Check, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { DenetimStep } from './steps/denetim-step';
import { InsaatStep } from './steps/insaat-step';
import { MuteahhitStep } from './steps/muteahhit-step';
import { ProjeStep } from './steps/proje-step';
import { SahibiStep } from './steps/sahibi-step';
import { YapiStep } from './steps/yapi-step';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';
import { formatLocaleTime } from '@/lib/i18n/format';

export interface Ek3FormDataPartial {
  proje?: Partial<ProjeBilgileri>;
  yapi?: Partial<YapiBilgileri>;
  insaat?: Partial<InsaatBilgileri>;
  sahibi?: Partial<KisiBilgileri>;
  muteahhit?: Partial<FirmaBilgileri>;
  denetim?: Partial<YapiDenetimBilgileri>;
}

interface Ek3WizardProps {
  ek3Id: string;
  initialData: Ek3FormDataPartial;
  initialStatus: 'draft' | 'completed' | 'signed' | 'superseded';
}

const AUTOSAVE_DELAY_MS = 800;

/** Custom Error that carries quota metadata (`used` / `limit`) from a 402
 *  response, so the UI can render the real values instead of placeholder 0s. */
class GenerateError extends Error {
  readonly used: number | undefined;
  readonly limit: number | undefined;

  constructor(message: string, used?: number, limit?: number) {
    super(message);
    this.name = 'GenerateError';
    this.used = used;
    this.limit = limit;
  }
}

async function patchForm(ek3Id: string, formData: Ek3FormDataPartial): Promise<void> {
  const res = await fetch(`/api/ek3/${ek3Id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ formData }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'patch_failed');
  }
}

async function generatePdf(ek3Id: string): Promise<{ pdfUrl: string }> {
  const res = await fetch(`/api/ek3/${ek3Id}/generate`, { method: 'POST' });
  const json = (await res.json()) as {
    pdfUrl?: string;
    error?: string;
    used?: number;
    limit?: number;
  };
  if (!res.ok) throw new GenerateError(json.error ?? 'generate_failed', json.used, json.limit);
  return { pdfUrl: json.pdfUrl ?? '' };
}

export function Ek3Wizard({ ek3Id, initialData, initialStatus }: Ek3WizardProps) {
  const t = useTranslations('ek3pilot');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Ek3Step>('proje');
  const [formData, setFormData] = useState<Ek3FormDataPartial>(initialData);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readOnly = initialStatus !== 'draft';

  const patchMutation = useMutation({
    mutationFn: (patch: Ek3FormDataPartial) => patchForm(ek3Id, patch),
    onSuccess: () => {
      setSavedAt(new Date());
      void queryClient.invalidateQueries({ queryKey: ['ek3', 'detail', ek3Id] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generatePdf(ek3Id),
    onSuccess: () => {
      router.push(`/ek3pilot/${ek3Id}/preview`);
    },
  });

  useEffect(
    () => () => {
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    },
    [],
  );

  const updateStep = <K extends keyof Ek3FormDataPartial>(key: K, value: Ek3FormDataPartial[K]) => {
    if (readOnly) return;
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    pendingTimeout.current = setTimeout(() => {
      patchMutation.mutate({ [key]: value });
    }, AUTOSAVE_DELAY_MS);
  };

  const stepIndex = useMemo(() => EK3_STEPS.indexOf(step), [step]);
  const isLastStep = stepIndex === EK3_STEPS.length - 1;

  return (
    <div className="space-y-6">
      <Stepper current={step} onChange={setStep} />

      <Card>
        <CardContent className="space-y-6 pt-6">
          {step === 'proje' && (
            <ProjeStep
              value={formData.proje}
              onChange={(v) => {
                updateStep('proje', v);
              }}
              readOnly={readOnly}
            />
          )}
          {step === 'yapi' && (
            <YapiStep
              value={formData.yapi}
              onChange={(v) => {
                updateStep('yapi', v);
              }}
              readOnly={readOnly}
            />
          )}
          {step === 'insaat' && (
            <InsaatStep
              value={formData.insaat}
              onChange={(v) => {
                updateStep('insaat', v);
              }}
              readOnly={readOnly}
            />
          )}
          {step === 'sahibi' && (
            <SahibiStep
              value={formData.sahibi}
              onChange={(v) => {
                updateStep('sahibi', v);
              }}
              readOnly={readOnly}
            />
          )}
          {step === 'muteahhit' && (
            <MuteahhitStep
              value={formData.muteahhit}
              onChange={(v) => {
                updateStep('muteahhit', v);
              }}
              readOnly={readOnly}
            />
          )}
          {step === 'denetim' && (
            <DenetimStep
              value={formData.denetim}
              onChange={(v) => {
                updateStep('denetim', v);
              }}
              readOnly={readOnly}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {patchMutation.isPending ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> {t('wizard.saveDraft')}…
            </span>
          ) : savedAt ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3" /> {t('wizard.savedAt')}{' '}
              {formatLocaleTime(savedAt, locale)}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <Button
              variant="outline"
              aria-label={t('wizard.previousStep')}
              onClick={() => {
                setStep(EK3_STEPS[stepIndex - 1] ?? 'proje');
              }}
            >
              ←
            </Button>
          )}
          {!isLastStep ? (
            <Button
              aria-label={t('wizard.nextStep')}
              onClick={() => {
                setStep(EK3_STEPS[stepIndex + 1] ?? 'denetim');
              }}
            >
              →
            </Button>
          ) : (
            <Button
              disabled={readOnly || generateMutation.isPending}
              onClick={() => {
                generateMutation.mutate();
              }}
            >
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t('wizard.generateButton')}
            </Button>
          )}
        </div>
      </div>

      {generateMutation.isError &&
        (() => {
          const err = generateMutation.error;
          // Narrow `err` directly via the type-guard so we can read `used` /
          // `limit` without a redundant cast (no-unnecessary-type-assertion).
          if (err instanceof GenerateError && err.message === 'quota_exceeded') {
            const text = t('errors.quotaExceeded', {
              used: err.used ?? 0,
              limit: err.limit ?? 0,
            });
            return <p className="text-sm text-destructive">{text}</p>;
          }
          return <p className="text-sm text-destructive">{err.message}</p>;
        })()}
    </div>
  );
}

function Stepper({ current, onChange }: { current: Ek3Step; onChange: (s: Ek3Step) => void }) {
  const t = useTranslations('ek3pilot.wizard');
  const currentIdx = EK3_STEPS.indexOf(current);

  return (
    <ol className="flex items-center gap-2 overflow-x-auto" aria-label={t('stepsAriaLabel')}>
      {EK3_STEPS.map((s, i) => {
        const active = s === current;
        const completed = i < currentIdx;
        return (
          <li key={s}>
            <button
              type="button"
              onClick={() => {
                onChange(s);
              }}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors',
                active && 'border-primary bg-primary/10 text-primary',
                completed && !active && 'border-muted-foreground/30 text-muted-foreground',
                !active && !completed && 'border-border text-muted-foreground',
              )}
              aria-current={active ? 'step' : undefined}
            >
              <span className="font-mono">{i + 1}</span>
              {t(`stepLabels.${s}`)}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

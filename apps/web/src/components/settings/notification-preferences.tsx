'use client';

import { useMutation } from '@tanstack/react-query';
import { Bell, Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  initialEk3Generated: boolean;
  initialWeeklyDigest: boolean;
}

interface PreferencesPatch {
  email_ek3_generated?: boolean;
  email_weekly_digest?: boolean;
}

async function patchPreferences(payload: PreferencesPatch): Promise<void> {
  const res = await fetch('/api/users/me/preferences', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'patch_failed');
  }
}

export function NotificationPreferences({ initialEk3Generated, initialWeeklyDigest }: Props) {
  const t = useTranslations('settings.notifications');

  const [ek3Generated, setEk3Generated] = useState(initialEk3Generated);
  const [weeklyDigest, setWeeklyDigest] = useState(initialWeeklyDigest);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const save = useMutation({
    mutationFn: patchPreferences,
    onSuccess: () => {
      setSavedAt(new Date());
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Bell className="mr-2 inline h-4 w-4" />
            {t('emailTitle')}
          </CardTitle>
          <CardDescription>{t('emailDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PreferenceToggle
            label={t('options.ek3Generated.label')}
            description={t('options.ek3Generated.description')}
            checked={ek3Generated}
            onChange={(v) => {
              setEk3Generated(v);
            }}
          />
          <PreferenceToggle
            label={t('options.weeklyDigest.label')}
            description={t('options.weeklyDigest.description')}
            checked={weeklyDigest}
            onChange={(v) => {
              setWeeklyDigest(v);
            }}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              disabled={save.isPending}
              onClick={() => {
                save.mutate({
                  email_ek3_generated: ek3Generated,
                  email_weekly_digest: weeklyDigest,
                });
              }}
            >
              {save.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('saveButton')}
            </Button>
            {savedAt && !save.isPending && (
              <span className="text-xs text-muted-foreground">
                {t('savedAt', { time: savedAt.toLocaleTimeString('tr-TR') })}
              </span>
            )}
          </div>
          {save.isError && (
            <p className="text-sm text-destructive">{(save.error).message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-accent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="mt-1 h-4 w-4 rounded border-input"
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

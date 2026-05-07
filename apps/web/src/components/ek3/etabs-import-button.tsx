'use client';

import { Cable } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

interface Props {
  ek3Id: string;
  projectId: string;
}

/**
 * Placeholder for the Hafta 8–9 desktop bridge integration. Once
 * `apps/desktop-bridge` ships, this button will deep-link into the bridge
 * (`yapiops-bridge://import-ek3?id=...`) and the bridge will POST to
 * `/api/ek3/import-etabs`. For now it shows a "coming soon" toast.
 */
export function EtabsImportButton(_props: Props) {
  const t = useTranslations('ek3pilot.errors');

  return (
    <Button
      variant="outline"
      disabled
      title={t('etabsImportComingSoon')}
      className="cursor-not-allowed"
    >
      <Cable className="mr-2 h-4 w-4" />
      ETABS&apos;tan İçe Aktar
    </Button>
  );
}

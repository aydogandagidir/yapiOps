'use client';

import { useMutation } from '@tanstack/react-query';
import { Download, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';

interface Props {
  ek3Id: string;
  pdfUrl: string | null;
}

export function Ek3PdfPreview({ ek3Id, pdfUrl }: Props) {
  const t = useTranslations('ek3pilot.preview');
  const router = useRouter();

  const regenerate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/ek3/${ek3Id}/generate`, { method: 'POST' });
      if (!res.ok) throw new Error('regenerate_failed');
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('signNote')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pdfUrl ? (
          <iframe title="Ek-3 PDF" src={pdfUrl} className="h-[800px] w-full rounded-md border" />
        ) : (
          <p className="text-sm text-muted-foreground">PDF henüz üretilmedi.</p>
        )}
        <div className="flex gap-2">
          {pdfUrl && (
            <Button asChild variant="default">
              <a href={pdfUrl} download>
                <Download className="mr-2 h-4 w-4" /> {t('download')}
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              regenerate.mutate();
            }}
            disabled={regenerate.isPending}
          >
            <RotateCw className="mr-2 h-4 w-4" /> {t('regenerate')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

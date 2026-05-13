import { Building2 } from 'lucide-react';
import { type ReactNode } from 'react';

import { Link } from '@/i18n/navigation';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Lightweight legal page layout: minimal navbar (logo + home link), sade
 * footer. Auth middleware bu rotaları dışlamadığı için authenticated
 * kullanıcılar bile sade görünüm üzerinden okur (dashboard chrome'una
 * gerek yok). KVKK / privacy / terms gibi yasal metinler için ortak shell.
 */
export default function LegalLayout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4">
          <Building2 className="h-5 w-5" />
          <Link href="/" className="font-semibold hover:underline">
            YapıOps
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">{children}</main>
      <footer className="border-t bg-background">
        <div className="mx-auto max-w-3xl px-6 py-4 text-xs text-muted-foreground">
          © BlueDev — YapıOps
        </div>
      </footer>
    </div>
  );
}

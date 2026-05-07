import { canCreateProject } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { ProjectForm } from '@/components/projects/project-form';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewProjectPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  let ctx;
  try {
    ctx = await requireAuthContext(cookieStore);
  } catch {
    redirect(`/${locale}/login`);
  }
  if (!canCreateProject(ctx.membership.role)) {
    redirect(`/${locale}/projects`);
  }

  return <ProjectForm />;
}

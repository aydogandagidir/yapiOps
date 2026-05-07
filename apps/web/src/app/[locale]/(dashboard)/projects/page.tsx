import { setRequestLocale } from 'next-intl/server';

import { ProjectList } from '@/components/projects/project-list';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProjectsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProjectList />;
}

import { canManageSeats } from '@yapiops/auth';
import { requireAuthContext } from '@yapiops/auth/server';
import { createSupabaseServerClient } from '@yapiops/db/server';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';

import { InviteMemberForm } from '@/components/team/invite-member-form';
import { TeamList } from '@/components/team/team-list';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function TeamPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const ctx = await requireAuthContext(cookieStore);

  const supabase = createSupabaseServerClient(cookieStore);

  const { data: members } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('org_id', ctx.membership.orgId)
    .order('role');

  const { data: invitations } = await supabase
    .from('org_invitations')
    .select('id, email, role, expires_at')
    .eq('org_id', ctx.membership.orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString());

  const canInvite = canManageSeats(ctx.membership.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ekip</h1>
        <p className="text-sm text-muted-foreground">Kullanıcılar, roller ve davetler.</p>
      </div>

      {canInvite ? <InviteMemberForm /> : null}

      <TeamList
        members={(members ?? [])}
        invitations={(invitations ?? [])}
        currentUserId={ctx.user.id}
        canManage={canInvite}
      />
    </div>
  );
}

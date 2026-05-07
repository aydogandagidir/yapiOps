'use client';

import type { OrgRole } from '@yapiops/db';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  role: OrgRole;
}

interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  expires_at: string;
}

export function TeamList({
  members,
  invitations,
  currentUserId,
  canManage,
}: {
  members: Member[];
  invitations: Invitation[];
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();

  async function changeRole(userId: string, role: OrgRole) {
    await fetch(`/api/org/members/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  async function removeMember(userId: string) {
    if (!confirm('Bu üyeyi organizasyondan çıkarmak istediğinizden emin misiniz?')) return;
    await fetch(`/api/org/members/${userId}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Üyeler</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">İsim</th>
                <th className="py-2">E-posta</th>
                <th className="py-2">Rol</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="py-2">{m.full_name ?? '—'}</td>
                  <td className="py-2">{m.email}</td>
                  <td className="py-2">
                    {canManage && m.id !== currentUserId && m.role !== 'owner' ? (
                      <select
                        defaultValue={m.role}
                        onChange={(e) => {
                          void changeRole(m.id, e.target.value as OrgRole);
                        }}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="admin">Admin</option>
                        <option value="engineer">Mühendis</option>
                        <option value="auditor">Denetçi</option>
                      </select>
                    ) : (
                      <span className="text-xs uppercase">{m.role}</span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {canManage && m.id !== currentUserId && m.role !== 'owner' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void removeMember(m.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Bekleyen Davetler</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2">E-posta</th>
                  <th className="py-2">Rol</th>
                  <th className="py-2">Süre Sonu</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="py-2">{inv.email}</td>
                    <td className="py-2 uppercase text-xs">{inv.role}</td>
                    <td className="py-2">
                      {new Date(inv.expires_at).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

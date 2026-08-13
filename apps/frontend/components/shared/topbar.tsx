'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { logout } from '@/services/auth.service';
import type { User } from '@medcore/shared-types';

export function Topbar({ user }: { user: User }) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-sm text-zinc-700">
          {user.firstName} <span className="text-zinc-400">·</span>{' '}
          <span className="text-zinc-500">{user.role}</span>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
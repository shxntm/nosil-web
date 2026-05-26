'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import { getSession } from '@/lib/auth';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/login';
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isLogin) {
      if (!getSession()) {
        router.replace('/login');
        return;
      }
    }
    setChecked(true);
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!checked) return null;

  return (
    <div className="flex" style={{ height: '100vh', background: '#f5f6fa', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, height: '100vh', overflowY: 'auto', background: 'transparent' }}>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

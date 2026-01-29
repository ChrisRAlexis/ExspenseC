'use client';

import { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    // If already signed in, just go to dashboard
    if (session) {
      router.push('/dashboard');
      return;
    }

    // Only auto-login when there's no session at all
    if (status === 'unauthenticated') {
      signIn('credentials', {
        email: 'tony.russo@ledgra.com',
        password: 'password123',
        redirect: false,
      }).then((result) => {
        if (!result?.error) {
          router.push('/dashboard');
          router.refresh();
        }
      });
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf4] via-[#ecfdf5] to-[#f0fdfa]">
      <p className="text-slate-500 text-sm animate-pulse">Loading...</p>
    </div>
  );
}

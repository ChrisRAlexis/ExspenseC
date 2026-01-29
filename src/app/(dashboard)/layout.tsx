import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MobileNav } from '@/components/mobile-nav';
import { TopNav } from '@/components/top-nav';
import { UserSwitcher } from '@/components/user-switcher';
import Image from 'next/image';
import { User } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-[#ecfdf5] to-[#f0fdfa] relative overflow-hidden">
      {/* Background gradient blobs - sophisticated greens */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-emerald-200/70 to-teal-300/50 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/4 -left-32 w-[400px] h-[400px] bg-gradient-to-br from-green-200/60 to-emerald-300/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 right-1/4 w-[350px] h-[350px] bg-gradient-to-br from-teal-200/50 to-cyan-200/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-20 left-1/4 w-[450px] h-[450px] bg-gradient-to-br from-emerald-100/70 to-green-200/50 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 right-10 w-[300px] h-[300px] bg-gradient-to-br from-teal-100/40 to-emerald-200/30 rounded-full blur-3xl animate-pulse-soft" />
      </div>
      {/* Top Navigation for Desktop */}
      <div className="hidden md:block relative z-40 pt-6">
        <div className="px-6">
          <div className="max-w-6xl mx-auto relative">
            <div className="bg-white/35 backdrop-blur-3xl rounded-2xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)] p-2 animate-slide-down overflow-visible">
              <div className="flex items-center h-14 gap-4">
                {/* Logo */}
                <div className="flex items-center gap-2 pl-2 shrink-0">
                  <Image
                    src="/ledgra-logo.png"
                    alt="Ledgra"
                    width={600}
                    height={140}
                    className="h-28 w-auto object-contain"
                    priority
                  />
                </div>

                {/* Navigation - takes remaining space */}
                <div className="flex-1">
                  <TopNav />
                </div>

                {/* Profile */}
                <div className="flex items-center gap-3 pr-2 shrink-0">
                  <div className="text-right hidden lg:block">
                    <p className="text-sm font-medium text-slate-600/90">{session.user.name}</p>
                    <p className="text-xs text-slate-400/80">{session.user.role}</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-100/60 rounded-full flex items-center justify-center border-2 border-emerald-200/50">
                    <User className="h-5 w-5 text-emerald-600/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Dev User Switcher - Small floating button */}
      <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
        <UserSwitcher />
      </div>

      <main className="pb-28 md:pb-12 relative z-10">
        <div className="p-4 md:px-6 md:py-8 animate-fade-in">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}

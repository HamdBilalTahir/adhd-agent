'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { endSession } from '@/lib/session';
import type { UserProfile, UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
}

const superviseeNav: NavItem[] = [
  { label: 'Home', href: '/supervisee', exact: true },
  { label: 'Activity', href: '/supervisee/activity' },
  { label: 'Settings', href: '/supervisee/settings' },
];

const supervisorNav: NavItem[] = [
  { label: 'My Supervisees', href: '/supervisor', exact: true },
  { label: 'Alerts', href: '/supervisor/alerts' },
  { label: 'Settings', href: '/supervisor/settings' },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + '/');
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick: () => void;
}) {
  const active = isActive(pathname, item);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {item.label}
    </Link>
  );
}

function HamburgerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SkeletonShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white p-4 lg:block">
        <div className="mb-6 h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
          <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
            <div className="h-8 w-20 animate-pulse rounded bg-gray-100" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-32 animate-pulse rounded bg-gray-100" />
            <div className="h-32 animate-pulse rounded bg-gray-100" />
          </div>
        </main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        router.replace('/login');
        return;
      }

      const snap = await getDocs(
        query(collection(db, 'userProfiles'), where('userId', '==', fbUser.uid))
      );
      if (snap.empty) {
        router.replace('/onboarding');
        return;
      }

      const userData = snap.docs[0].data() as UserProfile;
      if (!userData.roles?.length) {
        router.replace('/onboarding');
        return;
      }

      setFirebaseUser(fbUser);
      setRoles(userData.roles);
      setLoading(false);
    });

    return unsubscribe;
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    await endSession();
    router.replace('/login');
  };

  if (loading) return <SkeletonShell />;

  const hasSupervisee = roles.includes('supervisee');
  const hasSupervisor = roles.includes('supervisor');
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-56 shrink-0 transform border-r border-gray-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <p className="mb-6 px-2 pt-2 text-base font-bold text-gray-900">
            ADHD Agent
          </p>

          <nav className="flex-1 space-y-1">
            {hasSupervisee && (
              <>
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Focus
                </p>
                {superviseeNav.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onClick={closeSidebar}
                  />
                ))}
              </>
            )}

            {hasSupervisee && hasSupervisor && (
              <div className="my-3 border-t border-gray-100" />
            )}

            {hasSupervisor && (
              <>
                <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Supervise
                </p>
                {supervisorNav.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onClick={closeSidebar}
                  />
                ))}
              </>
            )}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topnav */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
          <button
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <HamburgerIcon />
          </button>
          <span className="hidden text-sm font-semibold text-gray-900 lg:block">
            ADHD Agent
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">
              {firebaseUser?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

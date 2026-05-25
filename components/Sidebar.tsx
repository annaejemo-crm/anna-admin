'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/login/actions';

const NAV = [
  {
    title: 'Översikt',
    items: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/kunder', label: 'Kunder & bokningar' },
      { href: '/admin/kalender', label: 'Kalender' },
    ],
  },
  {
    title: 'Arbete',
    items: [
      { href: '/admin/mail', label: 'Mailmallar' },
      { href: '/admin/avtal', label: 'Avtal & signering' },
      { href: '/admin/ekonomi', label: 'Ekonomi' },
    ],
  },
  {
    title: 'Inställningar',
    items: [
      { href: '/admin/paket', label: 'Paket & priser' },
      { href: '/admin/installningar', label: 'Inställningar' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] bg-bg-subtle border-r border-line py-9 px-6 sticky top-0 h-screen flex flex-col gap-1">
      <div className="font-serif text-[22px] leading-tight">Fotograf Anna<br />Ejemo AB</div>
      <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint mb-8">
        Admin · 2026
      </div>

      {NAV.map((section) => (
        <div key={section.title}>
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-ink-faint mt-5 mb-2">
            {section.title}
          </div>
          {section.items.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2 px-3 rounded-sm text-[13.5px] transition-colors ${
                  isActive
                    ? 'bg-bg text-ink font-medium'
                    : 'text-ink-muted hover:bg-black/[0.03] hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <form action={logout} className="mt-auto pt-6 border-t border-line">
        <button
          type="submit"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint hover:text-ink"
        >
          Logga ut
        </button>
      </form>
    </aside>
  );
}

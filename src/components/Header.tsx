'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  const link = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`border-b-2 pb-0.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
          active
            ? 'border-ember text-ink'
            : 'border-transparent text-ink/50 hover:text-ink'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="flex items-baseline justify-between border-b border-ink/20 pb-4">
      <Link href="/" className="group">
        <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl group-hover:text-ember">
          achiever
        </h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/55">
          a steam hunting log
        </p>
      </Link>
      <nav className="flex items-center gap-5">
        {link('/', 'hunt')}
        {link('/games', 'games')}
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink/40">v0.2</span>
      </nav>
    </header>
  );
}

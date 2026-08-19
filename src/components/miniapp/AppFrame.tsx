"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/miniapp", label: "خانه" },
  { href: "/miniapp/profile", label: "حساب من" },
  { href: "/miniapp/addresses", label: "نشانی‌ها" },
] as const;

/** Mobile-first Mini App chrome: sticky header, single column, bottom tabs. */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 bg-background/90 px-4 py-3 backdrop-blur">
        <p className="text-xs text-muted">مینی‌اپ تلگرام</p>
        <h1 className="text-lg font-semibold">سامانه مجله</h1>
      </header>

      <main className="flex-1 px-4 pb-24">{children}</main>

      <nav
        aria-label="ناوبری اصلی"
        className="fixed inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-md border-t border-border-subtle bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        {NAV.map((item) => {
          const active =
            item.href === "/miniapp" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 py-3 text-center text-sm ${
                active ? "font-semibold text-link" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

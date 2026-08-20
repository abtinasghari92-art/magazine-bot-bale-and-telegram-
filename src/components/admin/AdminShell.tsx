import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "./LogoutButton";

/** Chrome for every protected admin page: identity, navigation, logout. */
export function AdminShell({
  adminEmail,
  active,
  children,
}: {
  adminEmail: string;
  active: "dashboard" | "issues";
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-bold">پنل مدیریت مجله</h1>
          <p className="mt-0.5 text-xs text-zinc-500" dir="ltr">
            {adminEmail}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NavLink href="/admin" label="خانه" active={active === "dashboard"} />
          <NavLink href="/admin/issues" label="شماره‌های مجله" active={active === "issues"} />
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      {label}
    </Link>
  );
}

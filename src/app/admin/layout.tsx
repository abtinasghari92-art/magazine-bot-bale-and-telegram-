import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "مدیریت سامانه مجله",
  description: "پنل مدیریت محتوای مجله",
  // The admin panel must never appear in a search index.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-zinc-50 text-zinc-900">{children}</div>;
}

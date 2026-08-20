"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { adminFetch } from "@/lib/admin/api";

import { AdminButton } from "./ui";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await adminFetch("/api/admin/logout", { method: "POST" });
    } finally {
      // Whatever the server said, send the operator back to the login form:
      // a stuck session is worse than an extra sign-in.
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <AdminButton variant="secondary" loading={busy} onClick={onLogout}>
      خروج
    </AdminButton>
  );
}

import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/server/auth/admin-session";

export const dynamic = "force-dynamic";

/**
 * Only relative, single-slash paths are accepted as a redirect target, so a
 * crafted `?next=` cannot bounce an admin to another site after login.
 */
function safeNextPath(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/admin";
  return raw;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);

  // An admin who already has a valid session never needs to see this form.
  if (await getAdminSession()) {
    redirect(nextPath);
  }

  return <LoginForm nextPath={nextPath} />;
}

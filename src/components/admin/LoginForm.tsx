"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { adminFetch, AdminApiError } from "@/lib/admin/api";

import { AdminAlert, AdminButton, AdminCard, AdminField, AdminInput } from "./ui";

/**
 * Admin sign-in form (REQ-046).
 *
 * The server answers every wrong email and every wrong password with the same
 * message, and this form shows exactly what it was given — guessing which half
 * was wrong must not be possible from the UI either.
 */
export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AdminApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await adminFetch("/api/admin/login", {
        method: "POST",
        body: { email, password },
      });
      // `replace` keeps the login form out of the back-button history.
      router.replace(nextPath);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof AdminApiError
          ? caught
          : new AdminApiError(0, "error", "ورود ممکن نشد."),
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-bold">ورود به پنل مدیریت</h1>

        <AdminCard>
          {error ? <AdminAlert>{error.message}</AdminAlert> : null}

          <form onSubmit={onSubmit} noValidate>
            <AdminField label="ایمیل" htmlFor="email" error={error?.issueFor("email")} required>
              <AdminInput
                id="email"
                name="email"
                type="email"
                dir="ltr"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </AdminField>

            <AdminField
              label="رمز عبور"
              htmlFor="password"
              error={error?.issueFor("password")}
              required
            >
              <AdminInput
                id="password"
                name="password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </AdminField>

            <AdminButton type="submit" loading={submitting} className="w-full">
              ورود
            </AdminButton>
          </form>
        </AdminCard>

        <p className="mt-4 text-center text-xs text-zinc-500">
          حساب مدیر فقط با دستور راه‌اندازی سرور ساخته می‌شود؛ ثبت‌نام عمومی وجود ندارد.
        </p>
      </div>
    </div>
  );
}

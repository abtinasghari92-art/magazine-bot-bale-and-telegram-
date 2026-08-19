"use client";

import Link from "next/link";

import { useMiniApp } from "./MiniAppProvider";
import { Card, Muted, SectionTitle } from "./ui";

/**
 * Day 2 shell only: identity, profile and addresses. The catalog, cart and
 * checkout land on later days and are deliberately absent here.
 */
export function HomePanel() {
  const { session } = useMiniApp();
  const { profile, addresses } = session;

  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.telegram?.firstName ||
    "کاربر گرامی";
  const defaultAddress = addresses.find((address) => address.isDefault) ?? null;

  return (
    <div className="space-y-4 py-2">
      <Card>
        <p className="text-sm text-muted">{session.isNewUser ? "خوش آمدید" : "خوش برگشتید"}</p>
        <p className="mt-1 text-lg font-semibold">{displayName}</p>
        {profile.telegram?.username ? (
          <p className="mt-1 text-sm text-muted" dir="ltr">
            @{profile.telegram.username}
          </p>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>تکمیل حساب</SectionTitle>
        <ul className="space-y-2 text-sm">
          <ChecklistRow
            done={Boolean(profile.firstName && profile.lastName)}
            label="نام و نام خانوادگی"
          />
          <ChecklistRow done={Boolean(profile.phone)} label="شماره موبایل" />
          {session.settings.phoneVerificationRequired ? (
            <ChecklistRow done={profile.phoneVerified} label="تأیید شماره موبایل" />
          ) : null}
          <ChecklistRow done={addresses.length > 0} label="ثبت نشانی" />
        </ul>
        <div className="mt-4 flex gap-2">
          <Link
            href="/miniapp/profile"
            className="flex-1 rounded-xl bg-button px-4 py-2.5 text-center text-sm font-semibold text-button-text"
          >
            ویرایش حساب
          </Link>
          <Link
            href="/miniapp/addresses"
            className="flex-1 rounded-xl border border-border-subtle px-4 py-2.5 text-center text-sm font-semibold"
          >
            نشانی‌ها
          </Link>
        </div>
      </Card>

      <Card>
        <SectionTitle>نشانی پیش‌فرض</SectionTitle>
        {defaultAddress ? (
          <div className="text-sm">
            <p className="font-medium">{defaultAddress.recipientName}</p>
            <p className="mt-1 text-muted">
              {defaultAddress.province}، {defaultAddress.city}
            </p>
            <p className="mt-1 text-muted">{defaultAddress.addressLine}</p>
          </div>
        ) : (
          <Muted>هنوز نشانی‌ای ثبت نکرده‌اید.</Muted>
        )}
      </Card>

      <Card>
        <SectionTitle>فروشگاه مجله</SectionTitle>
        <Muted>
          نمایش شماره‌های مجله، آرشیو و خرید در مراحل بعدی راه‌اندازی به این بخش اضافه می‌شود.
        </Muted>
      </Card>
    </div>
  );
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
          done ? "border-link text-link" : "border-border-subtle text-muted"
        }`}
      >
        {done ? "✓" : "•"}
      </span>
      <span className={done ? "" : "text-muted"}>{label}</span>
      <span className="sr-only">{done ? "انجام شده" : "انجام نشده"}</span>
    </li>
  );
}

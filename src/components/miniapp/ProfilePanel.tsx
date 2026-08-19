"use client";

import { useState, type FormEvent } from "react";

import { ApiError, apiFetch } from "@/lib/miniapp/api";
import type { ProfileDto } from "@/lib/miniapp/dto";

import { useMiniApp } from "./MiniAppProvider";
import { Alert, Button, Card, Field, Muted, SectionTitle, TextInput } from "./ui";

type FieldErrors = Partial<Record<"firstName" | "lastName" | "phone" | "code" | "_", string>>;

function toFieldErrors(error: unknown): { fields: FieldErrors; message: string } {
  if (error instanceof ApiError) {
    const fields: FieldErrors = {};
    for (const issue of error.issues) {
      if (issue.field in ({ firstName: 1, lastName: 1, phone: 1, code: 1 } as const)) {
        fields[issue.field as keyof FieldErrors] = issue.message;
      }
    }
    return { fields, message: error.message };
  }
  return { fields: {}, message: "ذخیره اطلاعات ممکن نشد." };
}

export function ProfilePanel() {
  const { session, setProfile } = useMiniApp();
  const { profile, settings } = session;

  const [firstName, setFirstName] = useState(profile.firstName ?? "");
  const [lastName, setLastName] = useState(profile.lastName ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError("");
    setSaved(false);

    try {
      const result = await apiFetch<{ profile: ProfileDto }>("/api/miniapp/profile", {
        method: "PATCH",
        body: {
          firstName,
          lastName,
          phone: phone.trim() ? phone : null,
        },
      });
      setProfile(result.profile);
      setPhone(result.profile.phone ?? "");
      setSaved(true);
    } catch (error) {
      const mapped = toFieldErrors(error);
      setErrors(mapped.fields);
      setFormError(Object.keys(mapped.fields).length > 0 ? "" : mapped.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 py-2">
      <Card>
        <SectionTitle>اطلاعات حساب</SectionTitle>
        {formError ? <Alert>{formError}</Alert> : null}
        {saved ? <Alert tone="success">اطلاعات ذخیره شد.</Alert> : null}

        <form onSubmit={onSubmit} noValidate>
          <Field label="نام" htmlFor="firstName" error={errors.firstName}>
            <TextInput
              id="firstName"
              name="firstName"
              value={firstName}
              autoComplete="given-name"
              onChange={(event) => setFirstName(event.target.value)}
            />
          </Field>

          <Field label="نام خانوادگی" htmlFor="lastName" error={errors.lastName}>
            <TextInput
              id="lastName"
              name="lastName"
              value={lastName}
              autoComplete="family-name"
              onChange={(event) => setLastName(event.target.value)}
            />
          </Field>

          <Field
            label="شماره موبایل"
            htmlFor="phone"
            error={errors.phone}
            hint="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
          >
            <TextInput
              id="phone"
              name="phone"
              value={phone}
              inputMode="numeric"
              dir="ltr"
              autoComplete="tel"
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>

          <Button type="submit" loading={saving}>
            ذخیره
          </Button>
        </form>
      </Card>

      <PhoneVerificationCard required={settings.phoneVerificationRequired} />

      {profile.telegram ? (
        <Card>
          <SectionTitle>حساب تلگرام</SectionTitle>
          <Muted>
            {profile.telegram.username
              ? `شناسه کاربری: @${profile.telegram.username}`
              : "این حساب نام کاربری عمومی ندارد."}
          </Muted>
        </Card>
      ) : null}
    </div>
  );
}

function PhoneVerificationCard({ required }: { required: boolean }) {
  const { session, setProfile } = useMiniApp();
  const { profile } = session;

  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "sent">("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!profile.phone) {
    return (
      <Card>
        <SectionTitle>تأیید شماره موبایل</SectionTitle>
        <Muted>ابتدا شماره موبایل خود را ذخیره کنید.</Muted>
      </Card>
    );
  }

  if (profile.phoneVerified) {
    return (
      <Card>
        <SectionTitle>تأیید شماره موبایل</SectionTitle>
        <Alert tone="success">شماره موبایل شما تأیید شده است.</Alert>
      </Card>
    );
  }

  async function requestCode() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiFetch("/api/miniapp/profile/phone/request", {
        method: "POST",
        body: { phone: profile.phone },
      });
      setStage("sent");
      setMessage("کد تأیید ارسال شد.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "ارسال کد ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<{ profile: ProfileDto | null }>(
        "/api/miniapp/profile/phone/confirm",
        { method: "POST", body: { phone: profile.phone, code } },
      );
      if (result.profile) setProfile(result.profile);
      setCode("");
      setStage("idle");
      setMessage("شماره موبایل تأیید شد.");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.issueFor("code") ?? caught.message)
          : "تأیید کد ممکن نشد.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle>تأیید شماره موبایل</SectionTitle>
      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {!required ? (
        <Muted>در حال حاضر تأیید شماره برای خرید الزامی نیست.</Muted>
      ) : null}

      {stage === "sent" ? (
        <div className="mt-3">
          <Field label="کد تأیید" htmlFor="code">
            <TextInput
              id="code"
              value={code}
              inputMode="numeric"
              dir="ltr"
              autoComplete="one-time-code"
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
          <Button onClick={confirmCode} loading={busy} disabled={code.trim().length === 0}>
            تأیید کد
          </Button>
          <div className="mt-2">
            <Button variant="secondary" onClick={requestCode} loading={busy}>
              ارسال دوباره
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <Button onClick={requestCode} loading={busy}>
            ارسال کد تأیید
          </Button>
        </div>
      )}
    </Card>
  );
}

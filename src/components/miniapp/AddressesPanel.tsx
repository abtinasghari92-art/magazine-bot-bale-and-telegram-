"use client";

import { useState, type FormEvent } from "react";

import { ApiError, apiFetch } from "@/lib/miniapp/api";
import type { AddressDto } from "@/lib/miniapp/dto";
import { IRAN_PROVINCES } from "@/modules/address/provinces";

import { useMiniApp } from "./MiniAppProvider";
import { Alert, Button, Card, Field, Muted, SectionTitle, TextArea, TextInput } from "./ui";

type FormState = {
  label: string;
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
};

const EMPTY_FORM: FormState = {
  label: "",
  recipientName: "",
  recipientMobile: "",
  province: "",
  city: "",
  addressLine: "",
  postalCode: "",
};

function toFormState(address: AddressDto): FormState {
  return {
    label: address.label ?? "",
    recipientName: address.recipientName,
    recipientMobile: address.recipientMobile,
    province: address.province,
    city: address.city,
    addressLine: address.addressLine,
    postalCode: address.postalCode,
  };
}

export function AddressesPanel() {
  const { session, setAddresses } = useMiniApp();
  const addresses = session.addresses;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "address", string>>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError("");
    setShowForm(true);
  }

  function openEdit(address: AddressDto) {
    setEditingId(address.id);
    setForm(toFormState(address));
    setErrors({});
    setFormError("");
    setShowForm(true);
  }

  async function refresh() {
    const result = await apiFetch<{ addresses: AddressDto[] }>("/api/miniapp/addresses");
    setAddresses(result.addresses);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");

    const payload = {
      ...form,
      label: form.label.trim() ? form.label : null,
    };

    try {
      if (editingId) {
        await apiFetch(`/api/miniapp/addresses/${editingId}`, { method: "PATCH", body: payload });
      } else {
        await apiFetch("/api/miniapp/addresses", { method: "POST", body: payload });
      }
      await refresh();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      if (error instanceof ApiError && error.issues.length > 0) {
        const mapped: Partial<Record<keyof FormState | "address", string>> = {};
        for (const issue of error.issues) {
          mapped[issue.field as keyof FormState | "address"] = issue.message;
        }
        setErrors(mapped);
        if (mapped.address) setFormError(mapped.address);
      } else {
        setFormError(error instanceof ApiError ? error.message : "ذخیره نشانی ممکن نشد.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(addressId: string) {
    setBusy(true);
    setFormError("");
    try {
      await apiFetch(`/api/miniapp/addresses/${addressId}/default`, { method: "POST" });
      await refresh();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "تغییر نشانی پیش‌فرض ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(addressId: string) {
    setBusy(true);
    setFormError("");
    try {
      await apiFetch(`/api/miniapp/addresses/${addressId}`, { method: "DELETE" });
      await refresh();
      if (editingId === addressId) {
        setShowForm(false);
        setEditingId(null);
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "حذف نشانی ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 py-2">
      {formError && !showForm ? <Alert>{formError}</Alert> : null}

      {addresses.length === 0 ? (
        <Card>
          <SectionTitle>نشانی‌ها</SectionTitle>
          <Muted>هنوز نشانی‌ای ثبت نکرده‌اید. اولین نشانی به‌صورت خودکار پیش‌فرض می‌شود.</Muted>
        </Card>
      ) : (
        addresses.map((address) => (
          <Card key={address.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{address.label ?? address.recipientName}</p>
                <p className="mt-1 text-sm text-muted">
                  {address.province}، {address.city}
                </p>
                <p className="mt-1 text-sm text-muted">{address.addressLine}</p>
                <p className="mt-1 text-sm text-muted" dir="ltr">
                  {address.postalCode}
                </p>
              </div>
              {address.isDefault ? (
                <span className="shrink-0 rounded-lg border border-link px-2 py-0.5 text-xs text-link">
                  پیش‌فرض
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => openEdit(address)} disabled={busy}>
                ویرایش
              </Button>
              <Button
                variant="secondary"
                onClick={() => makeDefault(address.id)}
                disabled={busy || address.isDefault}
              >
                پیش‌فرض
              </Button>
              <Button variant="danger" onClick={() => remove(address.id)} disabled={busy}>
                حذف
              </Button>
            </div>
          </Card>
        ))
      )}

      {showForm ? (
        <Card>
          <SectionTitle>{editingId ? "ویرایش نشانی" : "نشانی جدید"}</SectionTitle>
          {formError ? <Alert>{formError}</Alert> : null}

          <form onSubmit={onSubmit} noValidate>
            <Field label="عنوان (اختیاری)" htmlFor="label" error={errors.label}>
              <TextInput
                id="label"
                value={form.label}
                onChange={(event) => setForm({ ...form, label: event.target.value })}
              />
            </Field>

            <Field label="نام گیرنده" htmlFor="recipientName" error={errors.recipientName}>
              <TextInput
                id="recipientName"
                value={form.recipientName}
                onChange={(event) => setForm({ ...form, recipientName: event.target.value })}
              />
            </Field>

            <Field
              label="موبایل گیرنده"
              htmlFor="recipientMobile"
              error={errors.recipientMobile}
              hint="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
            >
              <TextInput
                id="recipientMobile"
                value={form.recipientMobile}
                inputMode="numeric"
                dir="ltr"
                onChange={(event) => setForm({ ...form, recipientMobile: event.target.value })}
              />
            </Field>

            <Field label="استان" htmlFor="province" error={errors.province}>
              <select
                id="province"
                value={form.province}
                onChange={(event) => setForm({ ...form, province: event.target.value })}
                className="w-full rounded-xl border border-border-subtle bg-background px-3 py-2.5 text-foreground outline-none focus:border-link"
              >
                <option value="">انتخاب کنید</option>
                {IRAN_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="شهر" htmlFor="city" error={errors.city}>
              <TextInput
                id="city"
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </Field>

            <Field label="نشانی" htmlFor="addressLine" error={errors.addressLine}>
              <TextArea
                id="addressLine"
                rows={3}
                value={form.addressLine}
                onChange={(event) => setForm({ ...form, addressLine: event.target.value })}
              />
            </Field>

            <Field
              label="کد پستی"
              htmlFor="postalCode"
              error={errors.postalCode}
              hint="۱۰ رقم، بدون خط تیره"
            >
              <TextInput
                id="postalCode"
                value={form.postalCode}
                inputMode="numeric"
                dir="ltr"
                onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
              />
            </Field>

            <Button type="submit" loading={busy}>
              ذخیره نشانی
            </Button>
            <div className="mt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                انصراف
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button onClick={openCreate} disabled={busy}>
          افزودن نشانی
        </Button>
      )}
    </div>
  );
}

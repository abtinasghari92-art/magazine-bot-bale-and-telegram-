import Link from "next/link";

export function StagingStatus() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-sm text-muted">محیط آزمایشی</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">سامانه مجله</h1>
      <p className="mt-4 text-lg">سامانه در حال اجرا است</p>
      <p className="mt-6 text-sm text-muted">
        مینی‌اپ تلگرام روی نشانی زیر اجرا می‌شود و باید از داخل تلگرام باز شود.
      </p>
      <Link href="/miniapp" className="mt-2 text-sm text-link underline">
        /miniapp
      </Link>
    </main>
  );
}

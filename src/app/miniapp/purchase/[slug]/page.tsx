import Link from "next/link";

import { Alert, Card, Muted, SectionTitle } from "@/components/miniapp/ui";

export const dynamic = "force-dynamic";

/**
 * Quick-purchase landing (REQ-010).
 *
 * Day 3 delivers the *entry point* only. Cart, checkout, orders and payment are
 * Day 4 and Day 5, so this page says so plainly instead of simulating a
 * purchase that would not exist.
 */
export default async function PurchasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-4 py-2">
      <Card>
        <SectionTitle>خرید شماره</SectionTitle>
        <Alert tone="info">
          سبد خرید و پرداخت هنوز فعال نشده است و در مرحله بعدی راه‌اندازی اضافه می‌شود. این صفحه
          فعلاً فقط نقطه ورود خرید است و هیچ سفارشی ثبت نمی‌کند.
        </Alert>
        <Muted>
          برای مشاهده مشخصات کامل، قیمت و پیش‌نمایش این شماره به صفحه جزئیات بازگردید.
        </Muted>

        <div className="mt-4 grid gap-2">
          <Link
            href={`/miniapp/issues/${slug}`}
            className="flex min-h-11 items-center justify-center rounded-xl bg-button px-4 text-sm font-semibold text-button-text"
          >
            بازگشت به جزئیات شماره
          </Link>
          <Link
            href="/miniapp/archive"
            className="flex min-h-11 items-center justify-center rounded-xl border border-border-subtle px-4 text-sm font-semibold"
          >
            مشاهده آرشیو
          </Link>
        </div>
      </Card>
    </div>
  );
}

import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { AppFrame } from "@/components/miniapp/AppFrame";
import { MiniAppProvider } from "@/components/miniapp/MiniAppProvider";

export const metadata: Metadata = {
  title: "سامانه مجله | مینی‌اپ",
  description: "خرید نسخه‌های مجله از داخل تلگرام",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function MiniAppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Telegram's WebApp bridge. The provider waits for it before calling the API. */}
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <MiniAppProvider>
        <AppFrame>{children}</AppFrame>
      </MiniAppProvider>
    </>
  );
}

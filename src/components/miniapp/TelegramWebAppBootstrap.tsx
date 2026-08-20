"use client";

import Script from "next/script";
import { useLayoutEffect } from "react";

import { initializeTelegramWebApp } from "@/lib/miniapp/telegram";

const TELEGRAM_WEB_APP_SCRIPT = "https://telegram.org/js/telegram-web-app.js";

/**
 * Mounts the official Telegram WebApp bridge and calls `ready()` / `expand()` as soon
 * as the shell is live — independent of profile/session API loading.
 */
export function TelegramWebAppBootstrap() {
  useLayoutEffect(() => {
    if (initializeTelegramWebApp()) return;

    const interval = window.setInterval(() => {
      if (initializeTelegramWebApp()) {
        window.clearInterval(interval);
      }
    }, 25);

    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      initializeTelegramWebApp();
    }, 10_000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <Script
      src={TELEGRAM_WEB_APP_SCRIPT}
      strategy="afterInteractive"
      onReady={() => {
        initializeTelegramWebApp();
      }}
      onLoad={() => {
        initializeTelegramWebApp();
      }}
    />
  );
}

/**
 * Browser-side Telegram WebApp helpers.
 *
 * Everything here is untrusted convenience: `initData` collected in the browser
 * is only ever forwarded to the server, which re-verifies its signature. No
 * decision that matters is made from `initDataUnsafe`.
 */

export type TelegramColorScheme = "light" | "dark";

export type TelegramWebApp = {
  initData: string;
  colorScheme: TelegramColorScheme;
  themeParams: Record<string, string>;
  version: string;
  platform: string;
  isExpanded?: boolean;
  ready: () => void;
  expand?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (handler: () => void) => void;
    offClick: (handler: () => void) => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

/** Wait for `telegram-web-app.js` to attach itself, or give up. */
export function waitForWebApp(timeoutMs = 4000): Promise<TelegramWebApp | null> {
  return new Promise((resolve) => {
    const existing = getWebApp();
    if (existing) {
      resolve(existing);
      return;
    }
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const webApp = getWebApp();
      if (webApp || Date.now() - startedAt > timeoutMs) {
        window.clearInterval(interval);
        resolve(webApp);
      }
    }, 50);
  });
}

function toCssVariableName(key: string): string {
  return `--tg-theme-${key.replace(/_/g, "-")}`;
}

/**
 * Mirror `themeParams` onto CSS variables for clients that do not inject them,
 * and record the color scheme so the fallback palette can follow it (REQ-006).
 */
export function applyTelegramTheme(webApp: TelegramWebApp | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (!webApp) {
    root.removeAttribute("data-tg-scheme");
    return;
  }

  root.setAttribute("data-tg-scheme", webApp.colorScheme === "dark" ? "dark" : "light");

  for (const [key, value] of Object.entries(webApp.themeParams ?? {})) {
    if (typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value)) {
      root.style.setProperty(toCssVariableName(key), value);
    }
  }
}

/**
 * Raw init data for the `Authorization: tma …` header.
 * Outside Telegram, an `?initData=` query parameter is accepted as a local
 * development convenience — the server still refuses it unless
 * `TELEGRAM_DEV_AUTH_ENABLED` is on in a development environment.
 */
export function readInitData(): string | null {
  const fromTelegram = getWebApp()?.initData?.trim();
  if (fromTelegram) return fromTelegram;

  if (typeof window === "undefined") return null;
  const fromQuery = new URLSearchParams(window.location.search).get("initData");
  return fromQuery?.trim() || null;
}

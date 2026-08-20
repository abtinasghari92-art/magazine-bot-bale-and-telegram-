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

let webAppShellInitialized = false;

/**
 * Temporary safe diagnostics for Mini App bootstrap (never logs initData or user data).
 */
export function logTelegramWebAppDiagnostics(): void {
  if (typeof window === "undefined") return;

  const webApp = window.Telegram?.WebApp;
  console.info("[miniapp:tma] bootstrap", {
    hasTelegram: Boolean(window.Telegram),
    hasWebApp: Boolean(webApp),
    hasInitData: Boolean(webApp?.initData?.trim()),
    version: webApp?.version ?? "(none)",
    platform: webApp?.platform ?? "(none)",
  });
}

/**
 * Signal Telegram that the Mini App shell is mounted. Must run before session API work
 * so Telegram hides its native loading placeholder.
 */
export function initializeTelegramWebApp(): boolean {
  if (typeof window === "undefined") return false;

  logTelegramWebAppDiagnostics();

  const app = getWebApp();
  if (!app) return false;

  applyTelegramTheme(app);

  if (!webAppShellInitialized) {
    app.ready();
    app.expand?.();
    webAppShellInitialized = true;
  }

  return true;
}

/** Reset bootstrap state for unit tests. */
export function resetTelegramWebAppInitializationForTests(): void {
  webAppShellInitialized = false;
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

/**
 * Attach init data to a URL the browser will load as a *document* — a cover
 * `<img src>` or a preview PDF in a new tab. Those requests cannot carry the
 * `Authorization` header `apiFetch` uses, and the matching server routes opt in
 * to reading the query parameter.
 *
 * Returns the URL unchanged when there is no init data, so the caller still
 * gets a well-formed link and the server does the rejecting.
 */
export function withInitData(url: string): string {
  const initData = readInitData();
  if (!initData) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}initData=${encodeURIComponent(initData)}`;
}

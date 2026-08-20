"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ApiError, apiFetch } from "@/lib/miniapp/api";
import type { AddressDto, ProfileDto, SessionDto } from "@/lib/miniapp/dto";
import { applyTelegramTheme, waitForWebApp, type TelegramWebApp } from "@/lib/miniapp/telegram";

import { ErrorScreen, LoadingScreen } from "./ui";

type Status = "loading" | "ready" | "error";

type MiniAppContextValue = {
  session: SessionDto;
  webApp: TelegramWebApp | null;
  setProfile: (profile: ProfileDto) => void;
  setAddresses: (addresses: AddressDto[]) => void;
  reload: () => void;
};

const MiniAppContext = createContext<MiniAppContextValue | null>(null);

export function useMiniApp(): MiniAppContextValue {
  const value = useContext(MiniAppContext);
  if (!value) {
    throw new Error("useMiniApp must be used inside <MiniAppProvider>");
  }
  return value;
}

/** Entry source for attribution (REQ-003): `?source=` or the Telegram start param. */
function readSource(): string | null {
  if (typeof window === "undefined") return null;
  const source = new URLSearchParams(window.location.search).get("source");
  return source?.trim() || null;
}

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<SessionDto | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [attempt, setAttempt] = useState(0);
  const themeHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function bootstrap() {
      setStatus("loading");

      const app = await waitForWebApp();
      if (cancelled) return;

      setWebApp(app);
      applyTelegramTheme(app);

      if (app) {
        // Keep Telegram colours in sync when the user switches theme (REQ-006).
        const handler = () => applyTelegramTheme(app);
        themeHandlerRef.current = handler;
        app.onEvent?.("themeChanged", handler);
      }

      try {
        const data = await apiFetch<SessionDto>("/api/miniapp/session", {
          method: "POST",
          body: { source: readSource() },
          signal: controller.signal,
        });
        if (cancelled) return;
        setSession(data);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof ApiError ? error.message : "بارگذاری برنامه ممکن نشد.",
        );
        setStatus("error");
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      controller.abort();
      const handler = themeHandlerRef.current;
      if (handler) {
        getCurrentWebApp()?.offEvent?.("themeChanged", handler);
        themeHandlerRef.current = null;
      }
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  const setProfile = useCallback((profile: ProfileDto) => {
    setSession((current) => (current ? { ...current, profile } : current));
  }, []);

  const setAddresses = useCallback((addresses: AddressDto[]) => {
    setSession((current) => (current ? { ...current, addresses } : current));
  }, []);

  const value = useMemo<MiniAppContextValue | null>(
    () => (session ? { session, webApp, setProfile, setAddresses, reload } : null),
    [session, webApp, setProfile, setAddresses, reload],
  );

  if (status === "loading") {
    return <LoadingScreen message="در حال آماده‌سازی…" />;
  }

  if (status === "error" || !value) {
    return <ErrorScreen message={errorMessage || "بارگذاری برنامه ممکن نشد."} onRetry={reload} />;
  }

  return <MiniAppContext.Provider value={value}>{children}</MiniAppContext.Provider>;
}

function getCurrentWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

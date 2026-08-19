export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.APP_ENV === "production") {
    const { getServerEnv } = await import("@/lib/env");
    getServerEnv();
  }
}

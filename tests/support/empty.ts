/**
 * Stand-in for the `server-only` package under Vitest. Its real entry point
 * throws outside a React Server Component, which would break plain Node tests.
 */
export {};

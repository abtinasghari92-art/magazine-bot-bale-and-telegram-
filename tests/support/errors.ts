import { AppError } from "@/lib/errors";

/**
 * Await a call that must reject with an `AppError`, and return that error so
 * its status and public message can be asserted.
 *
 * `expect(...).rejects` proves *that* something threw; this is for the cases
 * where the test also has to inspect what the user would be shown.
 */
export async function captureAppError(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof AppError) return error;
    throw error;
  }
  throw new Error("expected the call to reject, but it resolved");
}

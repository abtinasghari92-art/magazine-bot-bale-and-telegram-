import { z } from "zod";

import { iranianMobileSchema, personNameSchema } from "@/lib/fields";

/**
 * Profile edit payload (REQ-017). Only these three fields are user-editable;
 * ids and messenger data are never accepted from the browser.
 */
export const profileUpdateSchema = z
  .object({
    firstName: personNameSchema("نام"),
    lastName: personNameSchema("نام خانوادگی"),
    phone: iranianMobileSchema().nullish(),
  })
  .strict();

export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;
export type ProfileUpdate = z.output<typeof profileUpdateSchema>;

import { z } from "zod";

import {
  iranianMobileSchema,
  iranianPostalCodeSchema,
  personNameSchema,
  requiredTextSchema,
} from "@/lib/fields";

/**
 * Shape-level address rules. Reference-data rules (known province, and later a
 * province/city service) live in `AddressValidator` so an external validator
 * can be added without touching this schema.
 */
export const addressInputSchema = z
  .object({
    label: z
      .string()
      .trim()
      .max(40, { message: "عنوان نشانی نباید بیش از ۴۰ نویسه باشد." })
      .nullish()
      .transform((value): string | null => {
        const trimmed = value?.trim();
        return trimmed && trimmed.length > 0 ? trimmed : null;
      }),
    recipientName: personNameSchema("نام گیرنده", 80),
    recipientMobile: iranianMobileSchema("شماره موبایل گیرنده"),
    province: requiredTextSchema("استان", 40),
    city: requiredTextSchema("شهر", 60),
    addressLine: requiredTextSchema("نشانی", 400, 10),
    postalCode: iranianPostalCodeSchema(),
  })
  .strict();

export type AddressInput = z.input<typeof addressInputSchema>;

export const setDefaultAddressSchema = z
  .object({ addressId: z.string().min(1).max(64) })
  .strict();

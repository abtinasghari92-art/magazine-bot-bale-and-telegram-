import { parseWithSchema, ValidationError } from "@/lib/validation";

import { canonicalizeProvince } from "./provinces";
import { addressInputSchema } from "./schema";
import type { AddressValidationIssue, AddressValidationResult } from "./types";

/**
 * Address validation port (REQ-022).
 *
 * `LocalAddressValidator` is the only implementation today: no external
 * address/postal API has been selected, so validation runs on the local
 * province list plus the documented Iranian postal-code rules. A future vendor
 * validator implements this same interface and is swapped in
 * `getAddressValidator()`; call sites do not change.
 */
export interface AddressValidator {
  readonly name: string;
  validate(input: unknown): Promise<AddressValidationResult>;
}

export class LocalAddressValidator implements AddressValidator {
  readonly name = "local";

  async validate(input: unknown): Promise<AddressValidationResult> {
    let parsed;
    try {
      parsed = parseWithSchema(addressInputSchema, input);
    } catch (error) {
      if (error instanceof ValidationError) {
        return { ok: false, issues: toIssues(error) };
      }
      throw error;
    }

    const province = canonicalizeProvince(parsed.province);
    if (!province) {
      return {
        ok: false,
        issues: [{ field: "province", message: "استان انتخاب‌شده معتبر نیست." }],
      };
    }

    return {
      ok: true,
      data: {
        label: parsed.label ?? null,
        recipientName: parsed.recipientName,
        recipientMobile: parsed.recipientMobile,
        province,
        city: parsed.city,
        addressLine: parsed.addressLine,
        postalCode: parsed.postalCode,
      },
    };
  }
}

function toIssues(error: ValidationError): AddressValidationIssue[] {
  return error.details.map((issue) => ({
    field: (issue.path[0] as AddressValidationIssue["field"]) ?? "address",
    message: issue.message,
  }));
}

let defaultValidator: AddressValidator | undefined;

export function getAddressValidator(): AddressValidator {
  defaultValidator ??= new LocalAddressValidator();
  return defaultValidator;
}

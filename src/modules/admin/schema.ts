import { z } from "zod";

/** Admin login payload (REQ-046). Nothing else is accepted from the form. */
export const adminLoginSchema = z
  .object({
    email: z
      .string({ required_error: "ایمیل الزامی است." })
      .trim()
      .toLowerCase()
      .min(3, { message: "ایمیل الزامی است." })
      .max(200, { message: "ایمیل بیش از حد طولانی است." })
      .email({ message: "ایمیل معتبر نیست." }),
    password: z
      .string({ required_error: "رمز عبور الزامی است." })
      .min(1, { message: "رمز عبور الزامی است." })
      .max(200, { message: "رمز عبور بیش از حد طولانی است." }),
  })
  .strict();

export type AdminLoginInput = z.input<typeof adminLoginSchema>;

import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

/** Either the root client or a transaction client — repositories work with both. */
export type PrismaLike = PrismaClient | Prisma.TransactionClient;

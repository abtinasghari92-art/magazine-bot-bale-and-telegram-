export type AdminStatus = "ACTIVE" | "DISABLED";

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  status: AdminStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminSessionRecord = {
  id: string;
  adminUserId: string;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

/** What a route handler gets after a successful session check. */
export type AuthenticatedAdmin = {
  admin: AdminUserRecord;
  session: AdminSessionRecord;
};

export type AdminAuthConfig = {
  sessionTtlSeconds: number;
  maxLoginAttempts: number;
  loginWindowSeconds: number;
};

export type LoginContext = {
  /** Hashed before it is stored; the raw address never reaches the database. */
  ipHash?: string | null;
  userAgent?: string | null;
};

export type LoginResult = {
  admin: AdminUserRecord;
  session: AdminSessionRecord;
  /** Raw token for the cookie. Only ever returned here, never stored. */
  token: string;
};

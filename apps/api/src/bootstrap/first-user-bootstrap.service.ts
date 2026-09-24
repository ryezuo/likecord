import { PrismaClient } from "@prisma/client";
import { isEmail } from "class-validator";
import { hashPassword } from "../auth/password";
import { canonicalizeEmail } from "../auth/email";

const FIRST_USER_BOOTSTRAP_LOCK_ID = 794236911;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export interface FirstUserBootstrapInput {
  email: string;
  username: string;
  password: string;
}

export interface FirstUserBootstrapResult {
  userId: string;
}

export class BootstrapInputError extends Error {
  constructor() {
    super("Bootstrap input is invalid.");
  }
}

export class BootstrapAlreadyCompletedError extends Error {
  constructor() {
    super("First-user bootstrap has already been completed.");
  }
}

export class BootstrapConflictError extends Error {
  constructor(readonly field: "email" | "username") {
    super(`Bootstrap ${field} is already in use.`);
  }
}

/**
 * Creates exactly one first user for an empty Likecord database.
 *
 * This class is intentionally not a Nest provider or controller: callers must
 * explicitly construct it from the one-shot CLI. A transaction-scoped Postgres
 * advisory lock serializes competing bootstrap attempts without adding any
 * schema or persistent bootstrap marker.
 */
export class FirstUserBootstrapService {
  constructor(private readonly prisma: PrismaClient) {}

  async bootstrap(input: FirstUserBootstrapInput): Promise<FirstUserBootstrapResult> {
    const normalized = validateInput(input);
    const passwordHash = await hashPassword(normalized.password);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FIRST_USER_BOOTSTRAP_LOCK_ID})`;

      const emailMatch = await tx.user.findUnique({
        where: { email: normalized.email },
        select: { id: true },
      });
      if (emailMatch) throw new BootstrapConflictError("email");

      const usernameMatch = await tx.user.findUnique({
        where: { username: normalized.username },
        select: { id: true },
      });
      if (usernameMatch) throw new BootstrapConflictError("username");

      // A user with another identity means the empty-database bootstrap window
      // has passed. Do not create a second privileged entry point.
      if (await tx.user.count() > 0) throw new BootstrapAlreadyCompletedError();

      const user = await tx.user.create({
        data: {
          email: normalized.email,
          username: normalized.username,
          displayName: normalized.username,
          passwordHash,
        },
        select: { id: true },
      });

      return { userId: user.id };
    });
  }
}

function validateInput(input: FirstUserBootstrapInput): FirstUserBootstrapInput {
  const email = canonicalizeEmail(input.email);
  const username = input.username.trim();
  const password = input.password;

  if (!isEmail(email) || username.length < 3 || username.length > 32 || !USERNAME_PATTERN.test(username)) {
    throw new BootstrapInputError();
  }
  if (password.length < 8 || password.length > 128) throw new BootstrapInputError();

  return { email, username, password };
}

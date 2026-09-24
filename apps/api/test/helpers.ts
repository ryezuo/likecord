// Shared test utilities for Likecord E2E tests.
// Must NOT be imported by production code.

import { PrismaService } from "../src/prisma/prisma.service";
import { randomBytes } from "crypto";
import { sign } from "jsonwebtoken";

export function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  const dbName = extractDatabaseName(url);

  if (process.env.NODE_ENV !== "test") {
    const msg = `REFUSING destructive test operation: NODE_ENV=${process.env.NODE_ENV} (must be "test").`;
    throw new Error(msg);
  }

  if (!dbName.toLowerCase().endsWith("_test")) {
    const msg = `REFUSING destructive test operation: database="${dbName}" must end with "_test".`;
    throw new Error(msg);
  }
}

export function extractDatabaseName(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return url.split("/").pop() ?? url;
  }
}

export const TEST_CLEANUP_ORDER = [
  "attachment",
  "message",
  "memberRole",
  "auditLog",
  "notification",
  "userPreference",
  "userServerPreference",
  "categoryPermissionOverwrite",
  "channelPermissionOverwrite",
  "channel",
  "channelCategory",
  "role",
  "invite",
  "member",
  "refreshSession",
  "server",
  "user",
] as const;

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  assertTestDatabase();
  const client = prisma.client as any;
  for (const model of TEST_CLEANUP_ORDER) {
    await client[model].deleteMany();
  }
}

export async function createTestAccessSession(prisma: PrismaService, userId: string): Promise<string> {
  const session = await prisma.client.refreshSession.create({
    data: {
      userId,
      tokenHash: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });
  return session.id;
}

export function testAccessCookie(
  userId: string,
  sessionId: string,
  email = "test-session@likecord.local",
  username = "test-session",
): string {
  const token = sign(
    { sub: userId, email, username, sid: sessionId, sv: 1 },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "5m" },
  );
  return `access_token=${token}`;
}

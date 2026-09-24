import * as argon2 from "argon2";

// Shared by normal registration and the one-shot bootstrap command.
// Keep these values aligned with the existing Argon2id authentication policy.
export const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 2,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}

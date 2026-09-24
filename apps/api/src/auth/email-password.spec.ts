import { canonicalizeEmail } from "./email";
import { hashPassword, PASSWORD_HASH_OPTIONS, verifyPassword } from "./password";
import * as argon2 from "argon2";

describe("account credential helpers", () => {
  it("canonicalizes email with trim then locale-independent lowercase", () => {
    expect(canonicalizeEmail("  Mixed.Case@Example.COM \t")).toBe("mixed.case@example.com");
  });

  it("shares Argon2id hashing and verification without changing policy parameters", async () => {
    expect(PASSWORD_HASH_OPTIONS).toEqual({
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 2,
    });
    const hash = await hashPassword("valid-password");
    await expect(verifyPassword(hash, "valid-password")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });
});

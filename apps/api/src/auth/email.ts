export function canonicalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function canonicalizeEmailValue(value: unknown): unknown {
  return typeof value === "string" ? canonicalizeEmail(value) : value;
}

process.env.JWT_ACCESS_SECRET = "test-audit-stage1-secret-not-for-production";
process.env.DATABASE_URL = process.env.LIKECORD_TEST_DATABASE_URL || "postgresql://likecord:likecord_password@127.0.0.1:5432/likecord_test";
process.env.REDIS_URL = process.env.LIKECORD_TEST_REDIS_URL || "redis://127.0.0.1:6379";
process.env.APP_ORIGIN = "https://localhost";
process.env.NODE_ENV = "test";
assertTestDatabase();

export function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  const dbName = extractDatabaseName(url);

  if (process.env.NODE_ENV !== "test" || !dbName.toLowerCase().endsWith("_test")) {
    const msg = `REFUSING destructive test operation: NODE_ENV=${process.env.NODE_ENV} database="${dbName}". Database name must end with "_test" and NODE_ENV must be "test".`;
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

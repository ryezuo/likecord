import "./polyfill";

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { configureAvatarTransport } from "./user/avatar/avatar-transport";

async function bootstrap() {
  validateConfig();

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureAvatarTransport(app);

  app.setGlobalPrefix("api/v1");

  app.use(cookieParser());

  app.use(
    helmet({
      contentSecurityPolicy: false, // CSP managed by Next.js / Caddy
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origin = process.env.APP_ORIGIN || process.env.CORS_ORIGIN || "";
  const origins = origin
    ? origin.split(",").map((o) => o.trim()).filter(Boolean)
    : (process.env.NODE_ENV === "production" ? [] : ["https://localhost"]);

  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    credentials: true,
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`Likecord API running on port ${port}`);
}

interface SecretSpec {
  key: string;
  unsafeValue: string;
  requireInProduction?: boolean;
}

const REQUIRED_SECRETS: SecretSpec[] = [
  { key: "JWT_ACCESS_SECRET", unsafeValue: "change-me-in-production", requireInProduction: true },
  { key: "TURN_SECRET", unsafeValue: "change-me-in-production", requireInProduction: false },
];

function validateConfig(): void {
  const missing: string[] = [];
  const unsafe: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  for (const { key, unsafeValue, requireInProduction } of REQUIRED_SECRETS) {
    const value = process.env[key];
    if (!value) {
      if (isProd && requireInProduction !== false) {
        missing.push(key);
      }
    } else if (isProd && value === unsafeValue) {
      unsafe.push(`${key}=${unsafeValue}`);
    }
  }

  // R2 config validation
  if (process.env.STORAGE_DRIVER === "r2") {
    const r2Keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT"];
    for (const k of r2Keys) {
      if (!process.env[k]) missing.push(k);
    }
  }

  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment configuration: ${missing.join(", ")}`);
    process.exit(1);
  }

  if (unsafe.length > 0) {
    console.error(`FATAL: Production must not use default secret values: ${unsafe.join(", ")}`);
    process.exit(1);
  }
}

bootstrap();

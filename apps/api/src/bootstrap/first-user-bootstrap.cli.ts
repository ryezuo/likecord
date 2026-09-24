import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import {
  BootstrapAlreadyCompletedError,
  BootstrapConflictError,
  BootstrapInputError,
  FirstUserBootstrapService,
} from "./first-user-bootstrap.service";

async function readRequiredValue(label: string, environmentKey: "BOOTSTRAP_EMAIL" | "BOOTSTRAP_USERNAME"): Promise<string> {
  const configured = process.env[environmentKey];
  if (configured !== undefined) return configured.trim();

  if (!process.stdin.isTTY) throw new BootstrapInputError();
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await prompt.question(label)).trim();
  } finally {
    prompt.close();
  }
}

async function readPassword(): Promise<string> {
  // Password environment variables are intentionally unsupported: they are
  // commonly visible through process inspection and Docker metadata.
  if (process.env.BOOTSTRAP_PASSWORD !== undefined) throw new BootstrapInputError();

  if (!process.stdin.isTTY) return readPasswordFromStandardInput();

  const input = process.stdin;
  if (typeof input.setRawMode !== "function") throw new BootstrapInputError();

  process.stdout.write("Password (hidden): ");
  input.setRawMode(true);
  input.resume();

  return new Promise<string>((resolve, reject) => {
    let password = "";

    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };

    const onData = (data: Buffer | string) => {
      const characters = Buffer.isBuffer(data) ? data.toString("utf8") : data;
      for (const character of characters) {
        if (character === "\r" || character === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(password);
          return;
        }
        if (character === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          reject(new BootstrapInputError());
          return;
        }
        if (character === "\u0008" || character === "\u007f") {
          password = password.slice(0, -1);
          continue;
        }
        password += character;
      }
    };

    input.on("data", onData);
  });
}

async function readPasswordFromStandardInput(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

export async function main(): Promise<void> {
  const email = await readRequiredValue("Email: ", "BOOTSTRAP_EMAIL");
  const username = await readRequiredValue("Username: ", "BOOTSTRAP_USERNAME");
  const password = await readPassword();

  const prisma = new PrismaClient();
  try {
    const bootstrap = new FirstUserBootstrapService(prisma);
    await bootstrap.bootstrap({ email, username, password });
    console.log("First-user bootstrap completed.");
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    if (error instanceof BootstrapAlreadyCompletedError || error instanceof BootstrapConflictError || error instanceof BootstrapInputError) {
      console.error(error.message);
    } else {
      // Do not print a driver error, because it can include connection details.
      console.error("First-user bootstrap failed. No account was created.");
    }
    process.exitCode = 1;
  });
}

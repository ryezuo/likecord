import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import * as argon2 from "argon2";

// Bootstrap copy of the canonical @everyone mask from PermissionService.
// VIEW_CHANNEL | SEND_MESSAGES | ATTACH_FILES | CREATE_INVITE |
// CONNECT | SPEAK | READ_MESSAGE_HISTORY | STREAM
const DEFAULT_EVERYONE_PERMISSIONS = 204480n;

const prisma = new PrismaClient();

async function seed() {
  console.log("Checking for existing seed...");

  // Check if admin already exists (idempotent)
  const existingAdmin = await prisma.user.findUnique({ where: { email: "admin@likecord.local" } });
  if (existingAdmin) {
    console.log(`Admin user already exists: ${existingAdmin.username} (${existingAdmin.id})`);

    // Find existing server
    const server = await prisma.server.findFirst({ where: { ownerId: existingAdmin.id } });
    const invite = server
      ? await prisma.invite.findFirst({ where: { serverId: server.id, isRevoked: false } })
      : null;

    console.log("Seed already applied. Idempotent check passed.");
    if (server) console.log(`Server: ${server.name} (${server.id})`);
    if (invite) console.log(`Existing invite code: ${invite.code}`);
    console.log("\nDevelopment login:");
    console.log("  Email: admin@likecord.local");
    console.log("  Password: admin123");
    console.log("  (admin123 is local-development only — change in production)");

    await prisma.$disconnect();
    return;
  }

  // Create admin user
  const passwordHash = await argon2.hash("admin123", {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 2,
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@likecord.local",
      username: "admin",
      displayName: "Admin",
      passwordHash,
    },
  });
  console.log(`Created admin user: ${admin.username} (${admin.id})`);

  // Create initial server
  const server = await prisma.server.create({
    data: {
      name: "Likecord",
      ownerId: admin.id,
      description: "Welcome to Likecord!",
    },
  });
  console.log(`Created server: ${server.name} (${server.id})`);

  // Create @everyone role
  await prisma.role.create({
    data: {
      serverId: server.id,
      name: "@everyone",
      permissions: DEFAULT_EVERYONE_PERMISSIONS,
      position: 0,
      isDefault: true,
      isMentionable: false,
    },
  });
  console.log("Created @everyone role");

  // Add admin as member
  await prisma.member.create({
    data: { serverId: server.id, userId: admin.id },
  });

  // Create default channels
  const generalText = await prisma.channel.create({
    data: { serverId: server.id, type: "TEXT", name: "general", position: 0 },
  });
  console.log(`Created text channel: ${generalText.name}`);

  const generalVoice = await prisma.channel.create({
    data: { serverId: server.id, type: "VOICE", name: "General", position: 1 },
  });
  console.log(`Created voice channel: ${generalVoice.name}`);

  // Create bootstrap invite code
  const code = crypto.randomBytes(4).toString("hex");
  await prisma.invite.create({
    data: {
      code,
      serverId: server.id,
      creatorId: admin.id,
    },
  });
  console.log(`\nBootstrap invite code: ${code}`);
  console.log("\nDevelopment login:");
  console.log("  Email: admin@likecord.local");
  console.log("  Password: admin123");
  console.log("  (admin123 is local-development only — change in production)");

  console.log("\nSeed complete.");
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  prisma.$disconnect().catch(() => {});
  process.exit(1);
});

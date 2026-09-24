export const SERVER_PERMISSIONS = {
  ADMINISTRATOR: 1n << 0n,
  MANAGE_SERVER: 1n << 1n,
  MANAGE_ROLES: 1n << 2n,
  MANAGE_CHANNELS: 1n << 3n,
  KICK_MEMBERS: 1n << 4n,
  BAN_MEMBERS: 1n << 5n,
  CREATE_INVITE: 1n << 6n,
  SEND_MESSAGES: 1n << 7n,
  MANAGE_MESSAGES: 1n << 8n,
  ATTACH_FILES: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  CONNECT: 1n << 11n,
  SPEAK: 1n << 12n,
  MUTE_MEMBERS: 1n << 13n,
  DEAFEN_MEMBERS: 1n << 14n,
  MOVE_MEMBERS: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  STREAM: 1n << 17n,
} as const;

export function parsePermissionMask(value: string | undefined): bigint {
  try {
    return BigInt(value ?? "0");
  } catch {
    return 0n;
  }
}

export function hasServerPermission(mask: bigint, permission: bigint): boolean {
  return (mask & permission) === permission;
}

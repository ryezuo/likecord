// Shared type definitions for Likecord

import type { ThemeId } from "./theme";
import type { CapturePreferences } from "./capture-preferences";

export * from "./avatar-crop";
export * from "./theme";
export * from "./capture-preferences";

// ---- Enums ----

export enum ChannelType {
  TEXT = "TEXT",
  VOICE = "VOICE",
}

export enum PresenceStatus {
  ONLINE = "ONLINE",
  IDLE = "IDLE",
  DO_NOT_DISTURB = "DO_NOT_DISTURB",
  OFFLINE = "OFFLINE",
}

export enum AuditAction {
  KICK = "KICK",
  BAN = "BAN",
  UNBAN = "UNBAN",
  MUTE = "MUTE",
  UNMUTE = "UNMUTE",
  ROLE_CREATE = "ROLE_CREATE",
  ROLE_UPDATE = "ROLE_UPDATE",
  ROLE_DELETE = "ROLE_DELETE",
  PERMISSION_UPDATE = "PERMISSION_UPDATE",
  CHANNEL_CREATE = "CHANNEL_CREATE",
  CHANNEL_DELETE = "CHANNEL_DELETE",
  ADMIN_PASSWORD_RESET = "ADMIN_PASSWORD_RESET",
}

// ---- DTOs ----

export interface UserDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export interface UserPreferenceDto extends CapturePreferences {
  showSendButton: boolean;
  theme: ThemeId;
  soundEffectsEnabled: boolean | null;
  soundEffectsVolume: number;
  callAndStreamVolume: number;
}

export interface UpdateUserPreferenceRequest extends Partial<CapturePreferences> {
  showSendButton?: boolean;
  theme?: ThemeId;
  soundEffectsEnabled?: boolean;
  soundEffectsVolume?: number;
  callAndStreamVolume?: number;
}

export interface ImportSoundEffectsPreferenceRequest {
  enabled: boolean;
}

export interface ServerDto {
  id: string;
  name: string;
  ownerId: string;
  iconUrl: string | null;
  description: string | null;
  createdAt: string;
}

export interface ChannelDto {
  id: string;
  serverId: string;
  categoryId: string | null;
  type: ChannelType;
  name: string;
  position: number;
  topic: string | null;
}

export interface MessageDto {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  editedAt: string | null;
  createdAt: string;
}

export interface MemberDto {
  id: string;
  serverId: string;
  userId: string;
  nickname: string | null;
  joinedAt: string;
}

export interface RoleDto {
  id: string;
  serverId: string;
  name: string;
  color: number;
  position: number;
  permissions: string; // bigint serialized as string
  isDefault: boolean;
  isMentionable: boolean;
}

export interface InviteDto {
  code: string;
  serverId: string;
  creatorId: string;
  maxUses: number | null;
  expiresAt: string | null;
  useCount: number;
}

// ---- API response wrapper ----

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface HealthResponse {
  status: string;
}

export * from "./link-preview";

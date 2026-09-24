import type { UserPreferenceDto, UpdateUserPreferenceRequest, ImportSoundEffectsPreferenceRequest } from "@likecord/shared";
import type { LinkPreview } from "@likecord/shared/link-preview";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface ApiOptions extends RequestInit {
  skipCsrf?: boolean;
  _retryCount?: number;
}

export interface AuthenticatedUserDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  passwordChangeRequired: boolean;
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function doFetch(path: string, options: ApiOptions = {}): Promise<Response> {
  const { skipCsrf, _retryCount, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOpts.headers as Record<string, string>),
  };

  if (!skipCsrf && ["POST", "PUT", "PATCH", "DELETE"].includes(fetchOpts.method || "GET")) {
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  return fetch(`${API_BASE}/api/v1${path}`, {
    ...fetchOpts,
    headers,
    credentials: "include",
  });
}

// Single-flight refresh guard — prevents concurrent /auth/refresh calls.
// The assignment to refreshPromise happens synchronously before any await,
// so JavaScript's single-threaded execution guarantees only one request.
type RefreshOutcome = "refreshed" | "authentication-invalid" | "temporary-failure";
type AuthenticationInvalidListener = () => void;

const authenticationInvalidListeners = new Set<AuthenticationInvalidListener>();
const invalidRefreshCodes = new Set([
  "REFRESH_COOKIE_MISSING",
  "REFRESH_SESSION_NOT_FOUND",
  "REFRESH_SESSION_REVOKED",
  "REFRESH_SESSION_EXPIRED",
  "REFRESH_SESSION_REUSED",
]);
let refreshPromise: Promise<RefreshOutcome> | null = null;

export function subscribeToAuthenticationInvalid(listener: AuthenticationInvalidListener) {
  authenticationInvalidListeners.add(listener);
  return () => { authenticationInvalidListeners.delete(listener); };
}

function notifyAuthenticationInvalid() {
  for (const listener of authenticationInvalidListeners) listener();
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string, public readonly retryAfter = 60) {
    super(message); this.name = "ApiError";
  }
}

function responseError(res: Response, data: { error?: { message?: string; code?: string } }) {
  const retry = Number(res.headers?.get("Retry-After"));
  return new ApiError(data?.error?.message || `Request failed: ${res.status}`, res.status, data?.error?.code,
    Number.isFinite(retry) && retry > 0 ? Math.min(retry, 600) : 60);
}

async function responseData(res: Response): Promise<{ error?: { message?: string; code?: string } }> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function doRefresh(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshRes = await doFetch("/auth/refresh", { method: "POST", skipCsrf: true });
        if (refreshRes.ok) return "refreshed";
        const data = await responseData(refreshRes);
        if (refreshRes.status === 401 && data.error?.code && invalidRefreshCodes.has(data.error.code)) {
          notifyAuthenticationInvalid();
          return "authentication-invalid";
        }
        return "temporary-failure";
      } catch {
        return "temporary-failure";
      }
    })();
  }
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function refreshForRequest(signal?: AbortSignal | null): Promise<RefreshOutcome> {
  if (!signal) return doRefresh();
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException("Request aborted", "AbortError"));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    // Cancel this caller's wait, without starting/cancelling another shared auth refresh.
    void doRefresh().then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const res = await doFetch(path, options);

  // Auto-refresh on 401 (skip auth endpoints to avoid loops and credential errors)
  const authEndpoints = ["/auth/refresh", "/auth/login", "/auth/register", "/auth/logout"];
  const isAuthEndpoint = authEndpoints.some((ep) => path.includes(ep));
  if (res.status === 401 && !isAuthEndpoint && !options._retryCount) {
    const initialData = await responseData(res);
    // A credential endpoint can reject the supplied current password with 401.
    // That is an application result, not evidence that the access session expired,
    // and replaying the password mutation after refresh would be unsafe.
    if (initialData.error?.code === "CURRENT_PASSWORD_INVALID") {
      throw responseError(res, initialData);
    }
    const refreshOutcome = await refreshForRequest(options.signal);
    if (refreshOutcome === "refreshed") {
      const retryRes = await doFetch(path, { ...options, _retryCount: 1 });
      if (retryRes.status === 204) return {} as T;
      const retryData = await responseData(retryRes);
      if (!retryRes.ok) {
        throw responseError(retryRes, retryData);
      }
      return retryData as T;
    }
    throw responseError(res, initialData);
  }

  if (res.status === 204) return {} as T;

  const data = await responseData(res);

  if (!res.ok) {
    throw responseError(res, data);
  }

  return data as T;
}

export const authApi = {
  register: (body: { email: string; username: string; password: string; inviteCode: string }) =>
    api<{ user: { id: string; email: string; username: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
      skipCsrf: true,
    }),
  login: (body: { email: string; password: string }) =>
    api<{ user: AuthenticatedUserDto }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      skipCsrf: true,
    }),
  refresh: () =>
    api<{ success: boolean }>("/auth/refresh", { method: "POST", skipCsrf: true }),
  logout: () =>
    api<void>("/auth/logout", { method: "POST" }),
};

export const userApi = {
  me: () => api<AuthenticatedUserDto>("/users/@me"),
  update: (body: { displayName?: string; bio?: string }) =>
    api<AuthenticatedUserDto>("/users/@me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export const accountSecurityApi = {
  changeEmail: (body: { newEmail: string; currentPassword: string }) =>
    api<{ user: AuthenticatedUserDto }>("/users/@me/email", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api<{ success: true; user: AuthenticatedUserDto }>("/users/@me/password", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

export interface AvatarProjection { userId: string; avatarUrl: string | null }
export const avatarApi = {
  metadata: (userId: string, signal?: AbortSignal) => api<AvatarProjection>(`/users/${encodeURIComponent(userId)}/avatar`, { signal, cache: "no-store" }),
  upload: (file: File, cropHeader?: string, signal?: AbortSignal) => api<AvatarProjection>("/users/@me/avatar", {
    method: "POST", headers: { "Content-Type": file.type, ...(cropHeader ? { "X-Avatar-Crop": cropHeader } : {}) }, body: file, signal,
  }),
  remove: (signal?: AbortSignal) => api<AvatarProjection>("/users/@me/avatar", { method: "DELETE", signal }),
};

export const userPreferenceApi = {
  get: (signal?: AbortSignal) => api<UserPreferenceDto>("/users/@me/preferences", { signal }),
  importSoundEffects: (body: ImportSoundEffectsPreferenceRequest, signal?: AbortSignal) =>
    api<UserPreferenceDto>("/users/@me/preferences/sound-effects/import", { method: "PUT", body: JSON.stringify(body), signal }),
  update: (body: UpdateUserPreferenceRequest, signal?: AbortSignal) =>
    api<UserPreferenceDto>("/users/@me/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
      signal,
    }),
};

export interface VoiceMixPreference {
  targetUserId: string;
  volumePercent: number;
  muted: boolean;
}

export const voiceMixApi = {
  list: (signal?: AbortSignal) => api<VoiceMixPreference[]>("/users/@me/voice-mix", { signal }),
  put: (targetUserId: string, body: Omit<VoiceMixPreference, "targetUserId">, signal?: AbortSignal) =>
    api<VoiceMixPreference>(`/users/@me/voice-mix/${encodeURIComponent(targetUserId)}`, {
      method: "PUT", body: JSON.stringify(body), signal,
    }),
  reset: (targetUserId: string, signal?: AbortSignal) =>
    api<void>(`/users/@me/voice-mix/${encodeURIComponent(targetUserId)}`, { method: "DELETE", signal }),
};

export const serverApi = {
  list: () => api<Array<{ id: string; name: string; ownerId: string; effectivePermissions: string }>>("/users/@me/servers"),
  get: (id: string) => api<{ id: string; name: string; ownerId: string; description: string | null; effectivePermissions: string }>(`/servers/${id}`),
  create: (body: { name: string; description?: string }) =>
    api<{ id: string; name: string; ownerId: string }>("/servers", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; description?: string }) =>
    api<{ id: string; name: string }>(`/servers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => api<void>(`/servers/${id}`, { method: "DELETE" }),
};

export const channelApi = {
  list: (serverId: string) => api<Array<{ id: string; name: string; type: string; categoryId: string | null; permissionsSynced: boolean; position: number; effectivePermissions: string }>>(`/servers/${serverId}/channels`),
  get: (channelId: string) => api<{ id: string; name: string; type: string; categoryId: string | null; permissionsSynced: boolean; position: number; effectivePermissions: string }>(`/channels/${channelId}`),
  create: (serverId: string, body: {
    name: string;
    type?: string;
    categoryId?: string;
    isPrivate?: boolean;
    allowedRoleIds?: string[];
    allowedMemberIds?: string[];
  }) =>
    api<{ id: string; name: string; type: string; categoryId: string | null; permissionsSynced: boolean }>(`/servers/${serverId}/channels`, { method: "POST", body: JSON.stringify(body) }),
  update: (channelId: string, body: { name?: string; categoryId?: string | null; position?: number; topic?: string }) =>
    api<{ id: string; name: string; type: string; categoryId: string | null; permissionsSynced: boolean }>(`/channels/${channelId}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (channelId: string) => api<void>(`/channels/${channelId}`, { method: "DELETE" }),
  listCategories: (serverId: string) => api<Array<{ id: string; name: string; position: number }>>(`/servers/${serverId}/categories`),
  createCategory: (serverId: string, body: { name: string }) =>
    api<{ id: string; name: string }>(`/servers/${serverId}/categories`, { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (categoryId: string, body: { name?: string; position?: number }) =>
    api<{ id: string; name: string; position: number }>(`/categories/${categoryId}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCategory: (categoryId: string) => api<void>(`/categories/${categoryId}`, { method: "DELETE" }),
  getPermissionConfiguration: (channelId: string) => api<ChannelPermissionConfiguration>(`/channels/${channelId}/permissions`),
  setOverwrite: (channelId: string, targetType: "ROLE" | "MEMBER", targetId: string, body: { allow: string; deny: string }) =>
    api<PermissionOverwrite>(`/channels/${channelId}/permissions/${targetType}/${targetId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteOverwrite: (channelId: string, targetType: "ROLE" | "MEMBER", targetId: string) =>
    api<void>(`/channels/${channelId}/permissions/${targetType}/${targetId}`, { method: "DELETE" }),
  syncPermissions: (channelId: string) => api<ChannelPermissionConfiguration>(`/channels/${channelId}/permissions/sync`, { method: "POST", body: "{}" }),
  unsyncPermissions: (channelId: string) => api<ChannelPermissionConfiguration>(`/channels/${channelId}/permissions/unsync`, { method: "POST", body: "{}" }),
  getCategoryPermissionConfiguration: (categoryId: string) => api<{ categoryId: string; overwrites: PermissionOverwrite[] }>(`/categories/${categoryId}/permissions`),
  setCategoryOverwrite: (categoryId: string, targetType: "ROLE" | "MEMBER", targetId: string, body: { allow: string; deny: string }) =>
    api<PermissionOverwrite>(`/categories/${categoryId}/permissions/${targetType}/${targetId}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCategoryOverwrite: (categoryId: string, targetType: "ROLE" | "MEMBER", targetId: string) =>
    api<void>(`/categories/${categoryId}/permissions/${targetType}/${targetId}`, { method: "DELETE" }),
};

export interface PermissionOverwrite {
  id: string;
  targetType: "ROLE" | "MEMBER";
  targetId: string;
  allow: string;
  deny: string;
}

export interface ChannelPermissionConfiguration {
  channelId: string;
  categoryId: string | null;
  permissionsSynced: boolean;
  overwriteSource: { type: "CHANNEL" | "CATEGORY"; id: string; permissionsSynced: boolean };
  overwrites: PermissionOverwrite[];
}

export interface ContinueDestination {
  serverId: string;
  serverName: string;
  channelId: string;
  channelName: string;
}

export const navigationApi = {
  continue: (signal?: AbortSignal) =>
    api<{ destination: ContinueDestination | null }>("/navigation/continue", { signal, cache: "no-store" }),
  resolveServer: (serverId: string) =>
    api<{ channelId: string | null }>(`/navigation/servers/${serverId}`),
  validateTextChannel: (serverId: string, channelId: string) =>
    api<{ channel: { id: string; name: string; serverId: string; type: "TEXT" } }>(`/navigation/servers/${serverId}/channels/${channelId}`),
  setLastTextChannel: (serverId: string, channelId: string) =>
    api<{ userId: string; serverId: string; lastTextChannelId: string; updatedAt: string }>(`/navigation/servers/${serverId}/preference`, {
      method: "PUT",
      body: JSON.stringify({ channelId }),
    }),
};

export const messageApi = {
  list: (channelId: string, before?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (before) params.set("before", before);
    params.set("limit", String(limit));
    return api<Array<{ id: string; channelId: string; authorId: string; content?: string; createdAt: string; editedAt?: string | null; author?: { id: string; username: string; displayName: string }; attachments?: Array<{ id: string; fileName: string; fileSize: number; mimeType: string }>; linkPreview?: LinkPreview }>>(
      `/channels/${channelId}/messages?${params}`,
    );
  },
  send: (channelId: string, body: { content?: string; idempotencyKey: string; attachmentIds?: string[] }) =>
    api<{ message: { id: string; channelId: string; authorId: string; content: string; createdAt: string; attachments?: Array<{ id: string; fileName: string; fileSize: number; mimeType: string }>; linkPreview?: LinkPreview }; cached: boolean }>(
      `/channels/${channelId}/messages`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  update: (messageId: string, body: { content: string }) =>
    api<{ message: { id: string; channelId: string; content: string; editedAt: string; linkPreview?: LinkPreview } }>(
      `/messages/${messageId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  delete: (messageId: string) =>
    api<{ messageId: string; channelId: string }>(`/messages/${messageId}`, { method: "DELETE" }),
};

export const attachmentApi = {
  prepare: (channelId: string, body: { fileName: string; mimeType: string; fileSize: number }) =>
    api<{ attachmentId: string; uploadUrl: string; key: string }>(`/channels/${channelId}/attachments/prepare`, {
      method: "POST", body: JSON.stringify(body),
    }),
  upload: async (prep: { attachmentId: string; uploadUrl: string }, file: File | Blob): Promise<{ id: string; fileName: string; fileSize: number }> => {
    // Absolute uploadUrl = presigned target (e.g. R2) → direct PUT.
    // Relative uploadUrl = API proxy endpoint (local storage) → POST with CSRF.
    const isPresigned = /^https?:\/\//.test(prep.uploadUrl);
    const init: RequestInit = { method: isPresigned ? "PUT" : "POST", body: file };
    if (isPresigned) {
      // Presigned URLs are signed with content-type; match the value declared at /prepare.
      init.headers = { "Content-Type": file.type || "application/octet-stream" };
    } else {
      const csrf = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)?.[1] || "";
      init.headers = { "X-CSRF-Token": csrf };
      init.credentials = "include";
    }
    const res = await fetch(prep.uploadUrl, init);
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    if (isPresigned) {
      const fileName = file instanceof File ? file.name : "attachment";
      return { id: prep.attachmentId, fileName, fileSize: file.size };
    }
    return res.json();
  },
  complete: (attachmentId: string) =>
    api<{ id: string; fileName: string; fileSize: number; mimeType: string }>(`/attachments/${attachmentId}/complete`, {
      method: "POST",
    }),
  downloadUrl: (attachmentId: string) => `/api/v1/attachments/${attachmentId}/download`,
};

export type InvitePreview =
  | { inviteStatus: "UNAVAILABLE" }
  | { inviteStatus: "VALID"; membershipStatus: "UNAUTHENTICATED" | "NOT_MEMBER"; serverName: string }
  | { inviteStatus: "VALID" | "UNAVAILABLE"; membershipStatus: "ALREADY_MEMBER"; serverName: string; serverId: string };

export interface InviteAcceptance {
  result: "JOINED" | "ALREADY_MEMBER";
  memberId: string;
  serverId: string;
  serverName: string;
}

export interface ServerInvite {
  id: string;
  code: string;
  serverId: string;
  creatorId: string;
  maxUses: number | null;
  expiresAt: string | null;
  useCount: number;
  isRevoked: boolean;
  createdAt: string;
  creator?: { id: string; username: string; displayName: string };
}

export const inviteApi = {
  create: (serverId: string, body: { expiresInHours?: number; maxUses?: number } = {}) =>
    api<ServerInvite>(`/servers/${serverId}/invites`, { method: "POST", body: JSON.stringify(body) }),
  ensure: (serverId: string) =>
    api<{ code: string; expiresAt: string | null }>(`/servers/${serverId}/invites/ensure`, { method: "POST", body: "{}" }),
  list: (serverId: string) => api<ServerInvite[]>(`/servers/${serverId}/invites`),
  revoke: (serverId: string, inviteId: string) =>
    api<{ success: boolean }>(`/servers/${serverId}/invites/${inviteId}`, { method: "DELETE" }),
  validate: (code: string) =>
    api<InvitePreview>(`/invites/${encodeURIComponent(code)}/validate`, { skipCsrf: true }),
  accept: (code: string) =>
    api<InviteAcceptance>(`/invites/${encodeURIComponent(code)}/accept`, { method: "POST", body: "{}" }),
};

export interface Role {
  id: string;
  serverId: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  isDefault: boolean;
  isMentionable: boolean;
  isHoisted: boolean;
  createdAt: string;
}

export const roleApi = {
  list: (serverId: string) => api<Role[]>(`/servers/${serverId}/roles`),
  create: (serverId: string, body: { name: string; color?: number; permissions?: string; position?: number; isHoisted?: boolean }) =>
    api<Role>(`/servers/${serverId}/roles`, { method: "POST", body: JSON.stringify(body) }),
  update: (serverId: string, roleId: string, body: { name?: string; color?: number; permissions?: string; position?: number; isHoisted?: boolean }) =>
    api<Role>(`/servers/${serverId}/roles/${roleId}`, { method: "PATCH", body: JSON.stringify(body) }),
  reorder: (serverId: string, roleIds: string[]) =>
    api<Role[]>(`/servers/${serverId}/roles/order`, { method: "PATCH", body: JSON.stringify({ roleIds }) }),
  delete: (serverId: string, roleId: string) =>
    api<void>(`/servers/${serverId}/roles/${roleId}`, { method: "DELETE" }),
  assignToMember: (serverId: string, memberId: string, roleId: string) =>
    api<{ success: boolean }>(`/servers/${serverId}/members/${memberId}/roles/${roleId}`, { method: "PUT", body: "{}" }),
  removeFromMember: (serverId: string, memberId: string, roleId: string) =>
    api<{ success: boolean }>(`/servers/${serverId}/members/${memberId}/roles/${roleId}`, { method: "DELETE" }),
};

export interface ServerMember {
  id: string;
  serverId: string;
  userId: string;
  nickname: string | null;
  isBanned: boolean;
  isMuted: boolean;
  mutedUntil: string | null;
  joinedAt: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
  roles: Array<{ roleId: string; role: Role }>;
}

export const memberApi = {
  list: (serverId: string) => api<ServerMember[]>(`/servers/${serverId}/members`),
  leave: (serverId: string) =>
    api<{ result: "LEFT" | "ALREADY_LEFT"; serverId: string }>(`/servers/${serverId}/members/@me`, { method: "DELETE" }),
  update: (serverId: string, memberId: string, body: { nickname?: string }) =>
    api<{ id: string }>(`/servers/${serverId}/members/${memberId}`, { method: "PATCH", body: JSON.stringify(body) }),
  kick: (serverId: string, memberId: string) =>
    api<{ success: boolean }>(`/servers/${serverId}/members/${memberId}`, { method: "DELETE" }),
  ban: (serverId: string, memberId: string) =>
    api<{ success: boolean }>(`/servers/${serverId}/members/${memberId}/ban`, { method: "POST", body: "{}" }),
  unban: (serverId: string, memberId: string) =>
    api<{ success: boolean }>(`/servers/${serverId}/members/${memberId}/unban`, { method: "POST", body: "{}" }),
  mute: (serverId: string, memberId: string, until?: string) =>
    api<{ success: boolean }>(`/servers/${serverId}/members/${memberId}/mute`, {
      method: "POST", body: JSON.stringify(until ? { until } : {}),
    }),
  unmute: (serverId: string, memberId: string) =>
    api<{ success: boolean }>(`/servers/${serverId}/members/${memberId}/unmute`, { method: "POST", body: "{}" }),
};

export interface AuditLogEntry {
  id: string;
  serverId: string | null;
  actorId: string;
  action: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; username: string; displayName: string } | null;
  target: { id: string; username: string; displayName: string } | null;
}

export const auditLogApi = {
  list: (serverId: string) => api<AuditLogEntry[]>(`/servers/${serverId}/audit-logs`),
};

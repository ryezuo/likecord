const INVITE_CODE_PATTERN = /^[A-Za-z0-9_-]{1,16}$/;

function codeFromInvitePath(pathname: string): string | null {
  const match = /^\/invite\/([^/]+)$/.exec(pathname);
  if (!match) return null;

  try {
    const code = decodeURIComponent(match[1]);
    return INVITE_CODE_PATTERN.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function normalizeInviteInput(value: string, currentOrigin: string): string | null {
  const input = value.trim();
  if (!input || input.includes("\\")) return null;

  if (INVITE_CODE_PATTERN.test(input)) return input;

  if (input.startsWith("/")) {
    if (input.startsWith("//") || input.includes("?") || input.includes("#")) return null;
    return codeFromInvitePath(input);
  }

  if (!/^https?:\/\//i.test(input)) return null;

  try {
    const expectedOrigin = new URL(currentOrigin);
    const inviteUrl = new URL(input);
    if (inviteUrl.origin !== expectedOrigin.origin) return null;
    if (inviteUrl.username || inviteUrl.password || inviteUrl.search || inviteUrl.hash) return null;
    return codeFromInvitePath(inviteUrl.pathname);
  } catch {
    return null;
  }
}

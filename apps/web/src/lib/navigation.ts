export function serverRoute(serverId: string): string {
  return `/channels/${encodeURIComponent(serverId)}`;
}

export function textChannelRoute(serverId: string, channelId: string): string {
  return `${serverRoute(serverId)}/${encodeURIComponent(channelId)}`;
}

export function inviteRoute(code: string): string {
  return `/invite/${encodeURIComponent(code)}`;
}

/** Accept only an internal absolute-path destination. */
export function safeInternalReturnTo(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }

  try {
    const base = "https://likecord.internal";
    const parsed = new URL(value, base);
    if (parsed.origin !== base) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

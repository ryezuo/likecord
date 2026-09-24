"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setRedirecting(true);
      const returnTo = pathname.startsWith("/channels/") ? pathname : "/channels/@me";
      router.replace(`/?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [user, loading, pathname, router]);

  if (loading || redirecting || !user) {
    return (
      <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">
        {loading ? "Starting Likecord…" : "Opening sign in…"}
      </div>
    );
  }

  return <>{children}</>;
}

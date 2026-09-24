"use client";

import { useEffect, useState } from "react";
import { navigationApi, type ContinueDestination } from "../../lib/api";
import { serverRoute, textChannelRoute } from "../../lib/navigation";

interface Props {
  displayName: string;
  servers: Array<{ id: string; name: string }>;
  serversStatus: "loading" | "ready" | "error";
  refreshKey: string;
  onRetryServers: () => void;
  onAddServer: () => void;
  onNavigate: (path: string) => void;
}

export default function Home({ displayName, servers, serversStatus, refreshKey, onRetryServers, onAddServer, onNavigate }: Props) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    status: "ready" | "error";
    destination: ContinueDestination | null;
  } | null>(null);
  const requestKey = `${refreshKey}:${retry}`;

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const { destination } = await navigationApi.continue(controller.signal);
        if (!controller.signal.aborted) setResult({ key: requestKey, status: "ready", destination });
      } catch {
        if (!controller.signal.aborted) setResult({ key: requestKey, status: "error", destination: null });
      }
    };
    void load();
    return () => controller.abort();
  }, [requestKey]);

  // A new invalidation hides old private labels before its request resolves.
  const currentResult = result?.key === requestKey ? result : null;
  const destination = currentResult?.destination;

  return (
    <section className="home-state" aria-labelledby="home-title">
      <div className="home-content">
        <header className="home-header">
          <div className="home-intro">
            <span className="home-brand-mark" aria-hidden="true" />
            <div>
              <p className="home-eyebrow">Home</p>
              <h1 id="home-title">Welcome back, {displayName}</h1>
              <p>Choose a server and make yourself at home.</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary home-add" onClick={onAddServer}>Add a Server</button>
        </header>

        {!currentResult && <p className="home-feedback" role="status">Finding where you left off…</p>}
        {currentResult?.status === "error" && (
          <div className="home-feedback">
            <p role="alert">Could not load your saved destination.</p>
            <button type="button" className="btn btn-secondary home-retry" onClick={() => setRetry((value) => value + 1)}>Retry Continue</button>
          </div>
        )}
        {destination && (
          <button type="button" className="home-continue" onClick={() => onNavigate(textChannelRoute(destination.serverId, destination.channelId))}>
            <span className="home-server-icon" aria-hidden="true">{destination.serverName[0]?.toUpperCase()}</span>
            <span className="home-card-copy">
              <strong>Continue where you left off</strong>
              <span>{destination.serverName} <span aria-hidden="true">/</span> #{destination.channelName}</span>
            </span>
            <span className="home-arrow" aria-hidden="true">→</span>
          </button>
        )}

        <section className="home-servers" aria-labelledby="home-servers-title">
          <h2 id="home-servers-title">Your servers</h2>
          {serversStatus === "loading" && <p className="home-feedback" role="status">Loading your servers…</p>}
          {serversStatus === "error" && (
            <div className="home-feedback">
              <p role="alert">Could not load your servers.</p>
              <button type="button" className="btn btn-secondary home-retry" onClick={onRetryServers}>Retry servers</button>
            </div>
          )}
          {servers.length > 0 && (
            <ul className="home-server-list">
              {servers.map((server) => (
                <li key={server.id}>
                  <button type="button" className="home-server-card" aria-label={`Open ${server.name}`} onClick={() => onNavigate(serverRoute(server.id))}>
                    <span className="home-server-icon" aria-hidden="true">{server.name[0]?.toUpperCase()}</span>
                    <span className="home-card-copy"><strong>{server.name}</strong><span>Open Server</span></span>
                    <span className="home-arrow" aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {serversStatus === "ready" && servers.length === 0 && (
            <div className="home-empty">
              <h3>A place for your conversations</h3>
              <p>You have not joined any servers yet.</p>
              <p>Use Add a Server to create one or join with an invite.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

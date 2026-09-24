"use client";

import { useEffect, useRef, useState } from "react";
import { canonicalAvatarCrop, DEFAULT_AVATAR_CROP, serializeAvatarCrop, type AvatarCrop } from "@likecord/shared";
import type { AuthUser } from "../../hooks/useAuth";
import { useAvatar } from "../../hooks/useAvatars";
import { ApiError, avatarApi } from "../../lib/api";
import type { AvatarStore } from "../../lib/avatar-store";
import { avatarPreviewErrorMessage, createStaticAvatarPreview } from "../../lib/avatar-preview";
import UserAvatar from "../ui/UserAvatar";
import AvatarCropEditor from "./AvatarCropEditor";

type AvatarDraft =
  | { generation: number; file: File; status: "loading" }
  | { generation: number; file: File; status: "ready"; previewUrl: string; width: number; height: number; crop: AvatarCrop };

interface UploadSnapshot { file: File; cropHeader: string }

async function confirmCurrent(store: AvatarStore, userId: string): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Shared metadata may be queued/backing off; do not hold Settings pending for that entire wait.
    return await Promise.race([store.refresh(userId), new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), 20_000); })]);
  } finally { clearTimeout(timer); }
}

export default function AvatarSettings({ user, disabled, onPending }: { user: AuthUser; disabled: boolean; onPending: (pending: boolean) => void }) {
  const { url, store } = useAvatar(user.id, user.avatarUrl);
  const picker = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [draft, setDraft] = useState<AvatarDraft | null>(null);
  const [uploadSnapshot, setUploadSnapshot] = useState<UploadSnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [failedAction, setFailedAction] = useState<"upload" | "remove" | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [operation, setOperation] = useState("upload");
  const active = useRef<AbortController | null>(null);
  const sessionUserId = useRef(user.id);
  useEffect(() => {
    if (!retryAt) return;
    const timer = setTimeout(() => setRetryAt(0), Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(timer);
  }, [retryAt]);
  const previewUrl = draft?.status === "ready" ? draft.previewUrl : null;
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => { generation.current++; active.current?.abort(); active.current = null; onPending(false); }, [user.id, onPending]);
  useEffect(() => {
    if (sessionUserId.current === user.id) return;
    sessionUserId.current = user.id;
    generation.current++;
    setDraft(null); setUploadSnapshot(null); setError(""); setStatus(""); setFailedAction(null); setUncertain(false);
  }, [user.id]);
  const discard = () => {
    generation.current++;
    setDraft(null); setUploadSnapshot(null); setError(""); setStatus(""); setFailedAction(null);
  };
  const select = (file?: File) => {
    if (!file) return;
    discard();
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
      setError("Choose a JPEG, PNG, WebP or animated GIF image up to 5 MiB."); return;
    }
    const current = ++generation.current;
    setDraft({ generation: current, file, status: "loading" });
    void createStaticAvatarPreview(file).then((preview) => {
      if (generation.current !== current) { URL.revokeObjectURL(preview.url); return; }
      setDraft({ generation: current, file, status: "ready", previewUrl: preview.url,
        width: preview.width, height: preview.height, crop: { ...DEFAULT_AVATAR_CROP } });
    }).catch((caught: unknown) => {
      if (generation.current !== current) return;
      setDraft(null);
      setError(avatarPreviewErrorMessage(caught));
    });
  };
  const changeCrop = (crop: AvatarCrop) => {
    setDraft((current) => current?.status === "ready" ? { ...current, crop: canonicalAvatarCrop(crop) } : current);
    setUploadSnapshot(null); setFailedAction(null); setError(""); setStatus("");
  };
  const mutate = async (action: "upload" | "remove", retry = false) => {
    if (active.current || disabled || uncertain || !store || Date.now() < retryAt || (action === "upload" && draft?.status !== "ready")) return;
    let snapshot: UploadSnapshot | null = null;
    if (action === "upload") {
      snapshot = retry ? uploadSnapshot : null;
      if (!snapshot && draft?.status === "ready") {
        const crop = canonicalAvatarCrop(draft.crop);
        snapshot = { file: draft.file, cropHeader: serializeAvatarCrop(crop) };
        setDraft({ ...draft, crop });
        setUploadSnapshot(snapshot);
      }
      if (!snapshot) return;
    }
    const controller = new AbortController(); active.current = controller;
    setPending(true); onPending(true); setOperation(action); setError(""); setStatus(""); setFailedAction(null);
    const timer = setTimeout(() => controller.abort(), 75_000);
    try {
      const result = action === "upload" ? await avatarApi.upload(snapshot!.file, snapshot!.cropHeader, controller.signal) : await avatarApi.remove(controller.signal);
      if (controller.signal.aborted) throw new Error("Avatar response interrupted");
      store.accept(result); setDraft(null); setUploadSnapshot(null); setUncertain(false);
      setStatus(action === "upload" ? "Avatar updated." : "Avatar removed.");
    } catch (caught) {
      if (active.current !== controller) return;
      const ambiguous = !(caught instanceof ApiError) || caught.code === "AVATAR_COMMIT_UNCONFIRMED";
      if (ambiguous) {
        setStatus("Checking current avatar…");
        const confirmed = await confirmCurrent(store, user.id);
        if (active.current !== controller) return;
        setUncertain(!confirmed); setStatus("");
        setError(confirmed ? "The response was interrupted. Current avatar checked; review it before retrying." : "Unable to confirm the current avatar. Check again before retrying.");
      } else {
        if (caught.status === 429) setRetryAt(Date.now() + caught.retryAfter * 1000);
        setError(caught.status === 429 ? "Too many avatar changes. Wait before trying again." : caught.message || "Unable to change your avatar.");
      }
      setFailedAction(action);
    } finally {
      clearTimeout(timer);
      if (active.current === controller) { active.current = null; setPending(false); onPending(false); }
    }
  };
  const check = async () => {
    if (active.current || disabled) return;
    const controller = new AbortController(); active.current = controller;
    setPending(true); onPending(true); setOperation("check"); setStatus("");
    const confirmed = store ? await confirmCurrent(store, user.id) : false;
    if (active.current !== controller) return;
    active.current = null; setPending(false); onPending(false);
    setUncertain(!confirmed); setStatus(confirmed ? "Current avatar checked. Review it before retrying." : "");
    if (confirmed) setError("");
  };
  return <div className="avatar-settings" aria-label="Avatar" aria-busy={pending}>
    <div className="avatar-settings-row">
      <span className="avatar-settings-current"><UserAvatar userId={user.id} name={user.displayName || user.username} avatarUrl={user.avatarUrl} interactive /></span>
      <div className="avatar-settings-copy"><strong>Avatar</strong><p className="user-settings-field-help">JPEG, PNG, WebP or animated GIF · Up to 5 MiB. Very fast animations are slowed to 20 FPS.</p>
        <div className="user-settings-actions">
          <button type="button" className="btn btn-secondary" disabled={disabled || pending} onClick={() => picker.current?.click()}>Change Avatar</button>
          {url && !draft && <button type="button" className="btn btn-secondary" disabled={disabled || pending || uncertain || !!retryAt} onClick={() => { void mutate("remove"); }}>Remove Avatar</button>}
        </div>
      </div>
    </div>
    <input ref={picker} type="file" hidden aria-label="Choose avatar image" accept="image/jpeg,image/png,image/webp,image/gif" disabled={disabled || pending}
      onChange={(event) => { select(event.target.files?.[0]); event.target.value = ""; }} />
    {draft && <div className="avatar-settings-preview">
      {draft.status === "loading" ? <p role="status">Preparing static preview…</p> : <>
        <AvatarCropEditor previewUrl={draft.previewUrl} width={draft.width} height={draft.height} crop={draft.crop}
          disabled={disabled || pending || uncertain} onChange={changeCrop} />
        <p className="user-settings-field-help">The first frame is shown for positioning. This crop applies to every frame. After Upload, animation plays when playback rules allow.</p>
      </>}
      <div className="user-settings-actions">
        <button type="button" className="btn btn-primary" disabled={disabled || pending || draft.status !== "ready" || uncertain || !!retryAt} onClick={() => { void mutate("upload"); }}>Upload Avatar</button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={discard}>Cancel</button>
      </div>
    </div>}
    {pending && <p role="status">{status || (operation === "check" ? "Checking current avatar…" : operation === "upload" ? "Uploading and processing…" : "Removing avatar…")}</p>}
    {status && !pending && <p className="user-settings-save-status" role="status">{status}</p>}
    {error && <div className="error-banner" role="alert">{error}</div>}
    {(failedAction || uncertain) && !pending && <div className="user-settings-actions">
      {uncertain ? <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => { void check(); }}>Check current avatar</button>
        : <button type="button" className="btn btn-secondary" disabled={disabled || !!retryAt} onClick={() => { if (failedAction) void mutate(failedAction, true); }}>Retry avatar change</button>}
      <button type="button" className="btn btn-secondary" onClick={discard}>Discard</button>
    </div>}
  </div>;
}

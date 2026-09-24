"use client";
import UserAvatar from "../ui/UserAvatar";

import type { MemberContext } from "../../hooks/useMemberContext";
import type { VoicePersonalMixPreference } from "../../hooks/useVoicePersonalMix";
import type { MemberContextAction } from "../../lib/memberContextActions";
import ConfirmModal from "../ui/ConfirmModal";
import ContextMenu, { type ContextMenuItem } from "../ui/ContextMenu";
import VoiceParticipantPopover from "../voice/VoiceParticipantPopover";

export interface MemberContextMix {
  getVoicePersonalMixPreference: (userId: string) => VoicePersonalMixPreference;
  setVoicePersonalMixPreference: (userId: string, update: Partial<VoicePersonalMixPreference>) => void;
  getVoicePersonalMixStatus?: (userId: string) => "loading" | "load-error" | "saving" | "save-error" | "saved";
  retryVoicePersonalMix?: (userId: string) => void;
}

export default function MemberContextSurface({ context, mix }: { context: MemberContext; mix?: MemberContextMix }) {
  const { entry, identity, actions, confirmation, feedback } = context;
  const dialogActions = (items: MemberContextAction[], label: string) => items.length > 0 ? (
    <div className="member-context-section" role="group" aria-label={label}>
      {label === "Roles" && <div className="context-menu-label">Roles</div>}
      {items.map((action) => action.checked === undefined ? (
        <button key={action.command.kind} type="button" className={`context-menu-item ${action.danger ? "danger" : ""}`}
          disabled={context.pending || !context.canEditMix()} aria-description={action.description}
          onClick={() => context.invoke(action)}>{action.label}</button>
      ) : (
        <label key={action.command.kind === "role" ? action.command.roleId : action.command.kind} className="context-menu-item member-context-role">
          <input type="checkbox" checked={action.checked} disabled={context.pending || !context.canEditMix()}
            onChange={() => context.invoke(action)} />{action.label}
        </label>
      ))}
    </div>
  ) : null;
  const menuItems: ContextMenuItem[] = [{ type: "label", label: identity, emphasis: true,
    decoration: entry ? <span className="avatar-identity-image"><UserAvatar userId={entry.userId} name={identity} contextOpen /></span> : undefined }];
  if (context.loading) menuItems.push({ type: "label", label: "Loading member actions…" });
  else if (context.loadError) menuItems.push({ type: "label", label: context.loadError }, { label: "Retry member actions", onClick: context.retry });
  else for (const [index, group] of [actions.roles, actions.moderation, actions.utility].entries()) {
    if (!group.length) continue;
    menuItems.push({ label: "", divider: true, onClick: () => {} });
    if (index === 0) menuItems.push({ type: "label", label: "Roles" });
    menuItems.push(...group.map((action) => ({ ...action, disabled: context.pending, onClick: () => context.invoke(action) })));
  }
  return <>
    {entry && (entry.channelId && mix ? <VoiceParticipantPopover
      member={{ userId: entry.userId, username: identity, displayName: identity }}
      position={entry} preference={mix.getVoicePersonalMixPreference(entry.userId)}
      persistenceStatus={mix.getVoicePersonalMixStatus?.(entry.userId)}
      onPreferenceChange={(update) => { if (context.canEditMix()) mix.setVoicePersonalMixPreference(entry.userId, update); }}
      onRetry={() => { if (context.canEditMix()) mix.retryVoicePersonalMix?.(entry.userId); }}
      isSelf={entry.origin === "voice" && entry.userId === context.myUserId}
      contextPending={!context.canEditMix()} roleActions={dialogActions(actions.roles, "Roles")}
      serverActions={dialogActions(actions.moderation, "Server actions")}
      utilityActions={dialogActions(actions.utility, "User utilities")}
      memberStatus={context.loading ? <p role="status">Loading member actions…</p> : context.loadError ? <div role="alert">
        <p>{context.loadError}</p><button type="button" onClick={context.retry}>Retry member actions</button>
      </div> : null}
      onClose={context.close} returnFocusTo={entry.invoker} fallbackFocusTo={entry.fallback}
    /> : <ContextMenu key={context.loading ? "loading" : context.loadError ? "error" : "ready"}
      items={menuItems} ariaLabel={`Server member actions for ${identity}`} position={entry}
      onClose={context.close} returnFocusTo={entry.invoker} fallbackFocusTo={entry.fallback} />)}
    {confirmation && <ConfirmModal title={`${confirmation.action.label} Member`}
      message={`${confirmation.action.label} @${confirmation.username} from this server?`} danger pending={context.pending}
      error={feedback?.error ? feedback.text : undefined} returnFocusTo={confirmation.entry.invoker}
      fallbackFocusTo={confirmation.entry.fallback} onConfirm={context.confirm} onCancel={context.cancel} />}
    {feedback && !confirmation && <div className={`member-context-feedback ${feedback.error ? "member-panel-error" : "member-panel-feedback"}`}>
      <span role={feedback.error ? "alert" : "status"}>{feedback.text}</span>
      <button type="button" aria-label="Dismiss member action feedback" onClick={context.dismissFeedback}>×</button>
    </div>}
  </>;
}

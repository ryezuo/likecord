import "@testing-library/jest-dom";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import InviteAdministration, { deriveInviteStatus, formatInviteTimestamp } from "../components/InviteAdministration";
import ServerSettings from "../components/ServerSettings";
import type { ServerInvite } from "../lib/api";

const inviteList = jest.fn();
const inviteCreate = jest.fn();
const inviteRevoke = jest.fn();
const roleList = jest.fn().mockResolvedValue([]);
const memberList = jest.fn().mockResolvedValue([]);

jest.mock("../lib/api", () => ({
  inviteApi: {
    list: (...args: unknown[]) => inviteList(...args),
    create: (...args: unknown[]) => inviteCreate(...args),
    revoke: (...args: unknown[]) => inviteRevoke(...args),
  },
  serverApi: { update: jest.fn(), delete: jest.fn() },
  roleApi: {
    list: (...args: unknown[]) => roleList(...args), create: jest.fn(), update: jest.fn(),
    delete: jest.fn(), reorder: jest.fn(),
  },
  memberApi: {
    list: (...args: unknown[]) => memberList(...args), kick: jest.fn(), ban: jest.fn(),
    unban: jest.fn(), mute: jest.fn(), unmute: jest.fn(),
  },
  auditLogApi: { list: jest.fn().mockResolvedValue([]) },
}));

function makeInvite(overrides: Partial<ServerInvite> & Pick<ServerInvite, "id" | "code">): ServerInvite {
  return {
    serverId: "server-1", creatorId: "creator-1", maxUses: null, expiresAt: null,
    useCount: 0, isRevoked: false, createdAt: "2026-08-31T12:00:00.000Z",
    creator: { id: "creator-1", username: "alice", displayName: "Alice" }, ...overrides,
  };
}

const activeInvite = makeInvite({ id: "invite-active", code: "active01", createdAt: "2026-09-01T12:00:00.000Z" });

const baseSettingsProps = {
  serverId: "server-1", serverName: "Likecord", ownerId: "owner-1", myUserId: "member-1",
  onClose: jest.fn(), onUpdateName: jest.fn(), onDelete: jest.fn(),
};

describe("F.5.4 Settings Layer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    roleList.mockReturnValue(new Promise(() => {}));
    memberList.mockReturnValue(new Promise(() => {}));
    inviteList.mockResolvedValue([]);
  });
  afterEach(cleanup);

  it("opens as a page layer, preserves the URL, switches sections, closes explicitly, and restores focus", async () => {
    window.history.replaceState({}, "", "/channels/server-1/channel-1");
    const trigger = document.createElement("button");
    trigger.textContent = "Open settings";
    document.body.appendChild(trigger);
    trigger.focus();
    render(<ServerSettings {...baseSettingsProps} myUserId="owner-1" effectivePermissions="0" />);

    const layer = screen.getByRole("dialog", { name: "Server Settings — Likecord" });
    expect(layer).toHaveClass("settings-layer");
    expect(layer).not.toHaveClass("modal");
    const main = layer.querySelector(".settings-layer-main") as HTMLElement;
    main.scrollTop = 420;
    fireEvent.click(screen.getByRole("button", { name: "Roles" }));
    expect(main.scrollTop).toBe(0);
    expect(window.location.pathname).toBe("/channels/server-1/channel-1");
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(baseSettingsProps.onClose).toHaveBeenCalledTimes(1);
    cleanup();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("supports Escape close and renders only capability-accessible sections", async () => {
    render(<ServerSettings {...baseSettingsProps} effectivePermissions="4" />);
    expect(await screen.findByRole("heading", { name: "Roles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Roles" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invites" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Server" })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(baseSettingsProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("falls back from an inaccessible active section and closes when no Settings capability remains", async () => {
    const { rerender } = render(<ServerSettings {...baseSettingsProps} effectivePermissions="2" initialTab="invites" />);
    expect(await screen.findByRole("heading", { name: "Invites" })).toBeInTheDocument();
    rerender(<ServerSettings {...baseSettingsProps} effectivePermissions="4" initialTab="invites" />);
    expect(await screen.findByRole("heading", { name: "Roles" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invites" })).not.toBeInTheDocument();
    rerender(<ServerSettings {...baseSettingsProps} effectivePermissions="0" initialTab="invites" />);
    await waitFor(() => expect(baseSettingsProps.onClose).toHaveBeenCalled());
  });

  it("keeps Overview and Invites behind MANAGE_SERVER and Delete Server owner-only", () => {
    const { rerender } = render(<ServerSettings {...baseSettingsProps} effectivePermissions="2" />);
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invites" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Server" })).not.toBeInTheDocument();
    rerender(<ServerSettings {...baseSettingsProps} myUserId="owner-1" effectivePermissions="0" />);
    expect(screen.getByRole("button", { name: "Delete Server" })).toBeInTheDocument();
  });
});

describe("F.5.4 Invite Administration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: jest.fn().mockResolvedValue(undefined) } });
    inviteList.mockResolvedValue([activeInvite]);
    inviteCreate.mockResolvedValue(makeInvite({ id: "new-invite", code: "newcode" }));
    inviteRevoke.mockResolvedValue({ success: true });
  });
  afterEach(cleanup);

  it("derives the accepted status precedence", () => {
    const now = Date.parse("2026-09-01T12:00:00.000Z");
    expect(deriveInviteStatus(makeInvite({ id: "r", code: "r", isRevoked: true, expiresAt: "2020-01-01T00:00:00.000Z", maxUses: 1, useCount: 1 }), now)).toBe("REVOKED");
    expect(deriveInviteStatus(makeInvite({ id: "e", code: "e", expiresAt: "2026-09-01T11:59:59.000Z", maxUses: 1, useCount: 1 }), now)).toBe("EXPIRED");
    expect(deriveInviteStatus(makeInvite({ id: "x", code: "x", maxUses: 1, useCount: 1 }), now)).toBe("EXHAUSTED");
    expect(deriveInviteStatus(makeInvite({ id: "a", code: "a" }), now)).toBe("ACTIVE");
  });

  it("preserves authoritative newest-first order and renders canonical links without legacy registration URLs", async () => {
    inviteList.mockResolvedValue([
      activeInvite,
      makeInvite({ id: "old", code: "oldcode", createdAt: "2026-08-01T00:00:00.000Z", isRevoked: true }),
    ]);
    render(<InviteAdministration serverId="server-1" />);
    const cards = await screen.findAllByRole("article");
    expect(within(cards[0]).getByText("active01")).toBeInTheDocument();
    expect(within(cards[1]).getByText("oldcode")).toBeInTheDocument();
    expect(screen.getByDisplayValue(`${window.location.origin}/invite/active01`)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("localhost/register");
    expect(inviteList).toHaveBeenCalledWith("server-1");
  });

  it("renders authoritative dates without fabricating malformed or missing timestamps", async () => {
    inviteList.mockResolvedValue([
      makeInvite({ id: "valid", code: "validdate", createdAt: "2026-09-01T12:00:00.000Z" }),
      makeInvite({ id: "invalid", code: "invaliddate", createdAt: {} as string }),
    ]);
    render(<InviteAdministration serverId="server-1" />);
    const cards = await screen.findAllByRole("article");
    expect(within(cards[0]).getByText(formatInviteTimestamp("2026-09-01T12:00:00.000Z"))).toBeInTheDocument();
    expect(within(cards[1]).getByText("Unavailable")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Invalid Date");
    expect(formatInviteTimestamp(null)).toBe("Unavailable");
  });

  it("maps Never and Unlimited to an empty creation policy", async () => {
    render(<InviteAdministration serverId="server-1" />);
    await screen.findByText("active01");
    fireEvent.click(screen.getByRole("button", { name: "Create Invite" }));
    expect(screen.getByLabelText("Expiration")).toHaveValue("");
    expect(screen.getByLabelText("Maximum uses")).toHaveValue("");
    fireEvent.click(screen.getAllByRole("button", { name: "Create Invite" })[1]);
    await waitFor(() => expect(inviteCreate).toHaveBeenCalledWith("server-1", {}));
  });

  it("copies canonical URLs and leaves the input selected after clipboard failure", async () => {
    render(<InviteAdministration serverId="server-1" />);
    const input = await screen.findByLabelText("Invite link active01") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/invite/active01`));
    expect(await screen.findByRole("button", { name: "Copied ✓" })).toBeInTheDocument();

    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(screen.getByRole("button", { name: "Copied ✓" }));
    expect(await screen.findByText(/Copy failed/)).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  it("maps expiration and maxUses presets, prevents duplicate submit, and reloads the authoritative list once successful", async () => {
    let resolveCreate!: (value: ServerInvite) => void;
    inviteCreate.mockReturnValue(new Promise<ServerInvite>((resolve) => { resolveCreate = resolve; }));
    render(<InviteAdministration serverId="server-1" />);
    await screen.findByText("active01");
    fireEvent.click(screen.getByRole("button", { name: "Create Invite" }));
    fireEvent.change(screen.getByLabelText("Expiration"), { target: { value: "168" } });
    fireEvent.change(screen.getByLabelText("Maximum uses"), { target: { value: "100" } });
    const submit = screen.getAllByRole("button", { name: "Create Invite" })[1];
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(inviteCreate).toHaveBeenCalledTimes(1);
    expect(inviteCreate).toHaveBeenCalledWith("server-1", { expiresInHours: 168, maxUses: 100 });
    resolveCreate(makeInvite({ id: "new", code: "newcode" }));
    await waitFor(() => expect(inviteList).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText("Expiration")).not.toBeInTheDocument();
  });

  it("keeps failed creation actionable with the selected policy", async () => {
    inviteCreate.mockRejectedValue(new Error("Creation unavailable"));
    render(<InviteAdministration serverId="server-1" />);
    await screen.findByText("active01");
    fireEvent.click(screen.getByRole("button", { name: "Create Invite" }));
    fireEvent.change(screen.getByLabelText("Expiration"), { target: { value: "6" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Create Invite" })[1]);
    expect(await screen.findByText("Creation unavailable")).toBeInTheDocument();
    expect(screen.getByLabelText("Expiration")).toHaveValue("6");
  });

  it("confirms revoke, reconciles success to Revoked, and does not falsely update after failure", async () => {
    inviteList.mockResolvedValueOnce([activeInvite]).mockResolvedValueOnce([{ ...activeInvite, isRevoked: true }]);
    const { unmount } = render(<InviteAdministration serverId="server-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Revoke" }));
    expect(screen.getByRole("heading", { name: "Revoke Invite" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revoke Invite" }));
    await waitFor(() => expect(screen.getByText("Revoked")).toBeInTheDocument());
    expect(inviteRevoke).toHaveBeenCalledWith("server-1", "invite-active");
    unmount();

    inviteList.mockResolvedValue([activeInvite]);
    inviteRevoke.mockRejectedValue(new Error("Revoke unavailable"));
    render(<InviteAdministration serverId="server-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Revoke" }));
    fireEvent.click(screen.getByRole("button", { name: "Revoke Invite" }));
    expect(await screen.findByText("Revoke unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Revoked")).not.toBeInTheDocument();
  });
});

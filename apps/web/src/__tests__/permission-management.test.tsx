import "@testing-library/jest-dom";
import React from "react";
import userEvent from "@testing-library/user-event";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ServerSettings from "../components/ServerSettings";
import MemberPanelView, { buildMemberGroups } from "../components/layout/MemberPanel";
import { memberApi, serverApi, type Role, type ServerMember } from "../lib/api";

import { useMemberContext } from "../hooks/useMemberContext";
import MemberContextSurface from "../components/member/MemberContextSurface";
function MemberPanel(props: Parameters<typeof useMemberContext>[0] & { voiceMembers: Array<{ userId: string }>; presenceMap: Record<string, string> }) {
  jest.mocked(serverApi.get).mockResolvedValue({ id: props.serverId!, ownerId: props.ownerId!, effectivePermissions: props.effectivePermissions ?? "0", name: "Server", description: null });
  const context = useMemberContext(props);
  return <><MemberPanelView serverId={props.serverId} context={context} voiceMembers={props.voiceMembers} presenceMap={props.presenceMap} />
    <MemberContextSurface context={context} /></>;
}

const roleList = jest.fn();
const roleCreate = jest.fn();
const roleUpdate = jest.fn();
const roleDelete = jest.fn();
const roleReorder = jest.fn();
const roleAssign = jest.fn();
const roleRemove = jest.fn();
const memberList = jest.fn();

jest.mock("../lib/api", () => ({
  serverApi: { get: jest.fn(), update: jest.fn(), delete: jest.fn() },
  roleApi: {
    list: (...args: unknown[]) => roleList(...args),
    create: (...args: unknown[]) => roleCreate(...args),
    update: (...args: unknown[]) => roleUpdate(...args),
    delete: (...args: unknown[]) => roleDelete(...args),
    reorder: (...args: unknown[]) => roleReorder(...args),
    assignToMember: (...args: unknown[]) => roleAssign(...args),
    removeFromMember: (...args: unknown[]) => roleRemove(...args),
  },
  memberApi: {
    list: (...args: unknown[]) => memberList(...args),
    kick: jest.fn(), ban: jest.fn(), unban: jest.fn(), mute: jest.fn(), unmute: jest.fn(),
  },
  auditLogApi: { list: jest.fn().mockResolvedValue([]) },
}));

function makeRole(overrides: Partial<Role> & Pick<Role, "id" | "name" | "position">): Role {
  return {
    serverId: "s1", color: 0, permissions: "0", isDefault: false, isMentionable: false,
    isHoisted: false, createdAt: "2026-08-26T00:00:00.000Z", ...overrides,
  };
}

function makeMember(id: string, userId: string, displayName: string, roles: Role[] = []): ServerMember {
  return {
    id, serverId: "s1", userId, nickname: null, isBanned: false, isMuted: false, mutedUntil: null,
    joinedAt: "2026-08-26T00:00:00.000Z", user: { id: userId, username: displayName.toLowerCase(), displayName, avatarUrl: null },
    roles: roles.map((role) => ({ roleId: role.id, role })),
  };
}

const everyone = makeRole({ id: "r-everyone", name: "@everyone", position: 0, permissions: "204480", isDefault: true });
const admin = makeRole({ id: "r-admin", name: "Admin", position: 100, permissions: "1" });
const moderator = makeRole({ id: "r-moderator", name: "Moderator", position: 80, permissions: "4" });
const memberRole = makeRole({ id: "r-member", name: "Member", position: 10, permissions: "0" });

const settingsProps = {
  serverId: "s1", serverName: "Server", ownerId: "owner-a", myUserId: "moderator-b",
  onClose: jest.fn(), onUpdateName: jest.fn(), onDelete: jest.fn(),
};

describe("permission-aware role management UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    roleList.mockResolvedValue([admin, moderator, memberRole, everyone]);
    memberList.mockResolvedValue([
      makeMember("m-owner", "owner-a", "Owner A"),
      makeMember("m-moderator", "moderator-b", "Moderator B", [moderator]),
      makeMember("m-member", "member-c", "Member C", [memberRole]),
    ]);
    roleUpdate.mockResolvedValue({});
    roleReorder.mockImplementation(async (_serverId: string, ids: string[]) => ids.map((id, index) => ({
      ...[admin, moderator, memberRole].find((role) => role.id === id)!, position: ids.length - index,
    })).concat(everyone));
    roleAssign.mockResolvedValue({ success: true });
    roleRemove.mockResolvedValue({ success: true });
  });
  afterEach(cleanup);

  it("PERM-UI-10/11: Manage Roles opens only Roles settings, not unrelated General/Audit sections", async () => {
    render(<ServerSettings {...settingsProps} effectivePermissions="4" />);
    expect(await screen.findByRole("heading", { name: "Roles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Roles" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "General" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Audit Log" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Server Name")).not.toBeInTheDocument();
  });

  it("server role editor is binary, grouped, warns for Administrator, and persists hoist", async () => {
    render(<ServerSettings {...settingsProps} myUserId="owner-a" effectivePermissions="0" />);
    fireEvent.click(screen.getByRole("button", { name: "Roles" }));
    const adminCard = (await screen.findByText("Admin")).closest(".role-card") as HTMLElement;
    fireEvent.click(within(adminCard).getByRole("button", { name: "Edit" }));
    expect(screen.getByText("General / Server")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Voice")).toBeInTheDocument();
    expect(screen.getByText("Administrator grants all server permissions. Assign with caution.")).toBeInTheDocument();
    const hoist = screen.getByLabelText("Display members separately");
    expect(hoist).not.toBeChecked();
    fireEvent.click(hoist);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(roleUpdate).toHaveBeenCalledWith("s1", "r-admin", expect.objectContaining({ isHoisted: true, permissions: "1" })));
  });

  it("PERM-UI-16: reorder control sends the complete custom-role order and leaves @everyone out", async () => {
    render(<ServerSettings {...settingsProps} myUserId="owner-a" effectivePermissions="0" />);
    fireEvent.click(screen.getByRole("button", { name: "Roles" }));
    await screen.findByText("Moderator");
    fireEvent.click(screen.getByRole("button", { name: "Move Moderator down" }));
    await waitFor(() => expect(roleReorder).toHaveBeenCalledWith("s1", ["r-admin", "r-member", "r-moderator"]));
    expect(roleReorder.mock.calls[0][1]).not.toContain("r-everyone");
  });
});

describe("Member List hoist and permission-aware context menu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    roleAssign.mockResolvedValue({ success: true });
    roleRemove.mockResolvedValue({ success: true });
  });
  afterEach(cleanup);

  it("PERM-UI-22/23: highest assigned hoisted role wins; non-hoisted member stays in presence grouping", () => {
    const ownerRole = makeRole({ id: "r-owner", name: "Owner", position: 90, isHoisted: true });
    const hoistedModerator = makeRole({ ...moderator, isHoisted: true });
    const alice = makeMember("m-a", "a", "Alice", [hoistedModerator, ownerRole]);
    const charlie = makeMember("m-c", "c", "Charlie", [memberRole]);
    const groups = buildMemberGroups([alice, charlie], { a: "ONLINE", c: "ONLINE" });
    expect(groups.find((group) => group.label === "Owner")?.members.map((member) => member.userId)).toEqual(["a"]);
    expect(groups.find((group) => group.label === "Moderator")).toBeUndefined();
    expect(groups.find((group) => group.label === "Online")?.members.map((member) => member.userId)).toEqual(["c"]);
  });

  it("PERM-UI-15/24: a normal Owner role groups multiple members while only Server.ownerId receives the crown", async () => {
    const ownerRole = makeRole({ id: "r-owner", name: "Owner", position: 90, isHoisted: true });
    roleList.mockResolvedValue([ownerRole, everyone]);
    memberList.mockResolvedValue([
      makeMember("m-a", "owner-a", "Alice", [ownerRole]),
      makeMember("m-d", "cofounder-d", "Dana", [ownerRole]),
    ]);
    render(<MemberPanel serverId="s1" ownerId="owner-a" myUserId="member-c" effectivePermissions="0" voiceMembers={[]} presenceMap={{ "owner-a": "ONLINE", "cofounder-d": "ONLINE" }} />);
    expect(await screen.findByText("OWNER")).toBeInTheDocument();
    expect(screen.getByText("— 2")).toBeInTheDocument();
    expect(screen.getAllByTitle("Real server owner")).toHaveLength(1);
    expect(screen.getByText("Dana")).toBeInTheDocument();
  });

  it("PERM-UI-25: member context menu offers only lower assignable roles", async () => {
    roleList.mockResolvedValue([admin, moderator, memberRole, everyone]);
    memberList.mockResolvedValue([
      makeMember("m-b", "moderator-b", "Moderator B", [moderator]),
      makeMember("m-c", "member-c", "Target C"),
    ]);
    render(<MemberPanel serverId="s1" ownerId="owner-a" myUserId="moderator-b" effectivePermissions="4" voiceMembers={[]} presenceMap={{ "moderator-b": "ONLINE", "member-c": "ONLINE" }} />);
    await screen.findByText("Target C");
    await act(async () => { fireEvent.contextMenu(screen.getByText("Target C")); });
    expect(within(screen.getByRole("menu")).getByText("Roles")).not.toHaveAttribute("role", "menuitem");
    expect(screen.getByRole("menuitemcheckbox", { name: "Member" })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("menuitemcheckbox", { name: "Admin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitemcheckbox", { name: "Moderator" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Member" }));
    await waitFor(() => expect(roleAssign).toHaveBeenCalledWith("s1", "m-c", "r-member"));
  });
});

describe("F7.1 Member context menu", () => {
  const memberProps = {
    serverId: "s1", ownerId: "owner-a", myUserId: "moderator-b", effectivePermissions: "8244",
    voiceMembers: [], presenceMap: {},
  };
  const actor = makeMember("m-b", "moderator-b", "Moderator B", [moderator]);
  const target = makeMember("m-c", "member-c", "Target C", [memberRole]);

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    roleList.mockResolvedValue([admin, moderator, memberRole, everyone]);
    memberList.mockResolvedValue([actor, target, makeMember("m-owner", "owner-a", "Owner A")]);
    roleAssign.mockResolvedValue({ success: true });
    roleRemove.mockResolvedValue({ success: true });
    for (const action of [memberApi.kick, memberApi.ban, memberApi.mute, memberApi.unmute]) {
      (action as jest.Mock).mockReset().mockResolvedValue(undefined);
    }
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  const openTarget = async (name = "Target C") => {
    const row = await screen.findByRole("listitem", { name: `${name}, member actions` });
    await act(async () => { fireEvent.contextMenu(row, { clientX: 30, clientY: 40 }); });
    return row;
  };

  it("has an informational identity without avatar, real roles and a final utility section only", async () => {
    render(<MemberPanel {...memberProps} />);
    await openTarget();
    const menu = screen.getByRole("menu", { name: "Server member actions for Target C" });
    const header = within(menu).getByText("Target C");
    expect(header).toHaveClass("context-menu-identity");
    expect(header.tagName).toBe("DIV");
    expect(header).not.toHaveAttribute("tabindex");
    expect(within(menu).queryByRole("menuitem", { name: "Target C" })).not.toBeInTheDocument();
    expect(menu.querySelector("img, .member-row-avatar, .voice-member-avatar")).toBeNull();
    expect(screen.getByRole("menuitemcheckbox", { name: "Member" })).toHaveAttribute("aria-checked", "true");
    expect(menu.lastElementChild).toBe(screen.getByRole("menuitem", { name: "Copy User ID" }));
    expect(menu.lastElementChild?.previousElementSibling).toHaveAttribute("role", "separator");
    for (const name of ["Mention", "Insert @username", "Open Member Panel", "Move to Voice", "Server Deafen", "MANAGE_ROLES", "MUTE_MEMBERS"]) {
      expect(within(menu).queryByText(name)).not.toBeInTheDocument();
    }
  });

  it("uses username when displayName is empty without adding nickname/profile semantics", async () => {
    memberList.mockResolvedValue([actor, { ...target, nickname: "Unused nickname", user: { ...target.user, displayName: "", username: "stable_username" } }]);
    render(<MemberPanel {...memberProps} />);
    await openTarget("stable_username");
    expect(within(screen.getByRole("menu")).getByText("stable_username")).toHaveClass("context-menu-identity");
    expect(screen.queryByText("Unused nickname")).not.toBeInTheDocument();
  });

  it("preserves the grant ceiling on assignment while allowing eligible removal of an assigned role", async () => {
    const ungrantable = makeRole({ id: "r-grant", name: "Extra power", position: 20, permissions: "2" });
    roleList.mockResolvedValue([ungrantable, memberRole, everyone, moderator, admin]);
    memberList.mockResolvedValue([actor, { ...target, roles: [{ roleId: ungrantable.id, role: ungrantable }] }]);
    render(<MemberPanel {...memberProps} effectivePermissions="4" />);
    await openTarget();
    const assigned = screen.getByRole("menuitemcheckbox", { name: "Extra power" });
    expect(assigned).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Member" })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("menuitemcheckbox", { name: "@everyone" })).not.toBeInTheDocument();
    memberList.mockResolvedValue([actor, { ...target, roles: [] }]);
    fireEvent.click(assigned);
    await waitFor(() => expect(roleRemove).toHaveBeenCalledWith("s1", "m-c", "r-grant"));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    await openTarget();
    expect(screen.queryByRole("menuitemcheckbox", { name: "Extra power" })).not.toBeInTheDocument();
    expect(roleAssign).not.toHaveBeenCalled();
  });

  it.each([
    ["self", "moderator-b", [moderator]],
    ["owner", "owner-a", []],
    ["peer", "peer-e", [moderator]],
    ["higher", "higher-f", [admin]],
  ] as const)("protects the %s target even with all effective permissions", async (_kind, userId, roles) => {
    const protectedMember = makeMember("m-protected", userId, "Protected", [...roles]);
    memberList.mockResolvedValue(userId === actor.userId ? [protectedMember] : [actor, protectedMember]);
    render(<MemberPanel {...memberProps} effectivePermissions="262143" />);
    await openTarget("Protected");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Copy User ID"]);
    expect(screen.queryByRole("menuitemcheckbox")).not.toBeInTheDocument();
    expect(memberApi.kick).not.toHaveBeenCalled();
    expect(memberApi.ban).not.toHaveBeenCalled();
    expect(memberApi.mute).not.toHaveBeenCalled();
  });

  it("keeps owner self-role management while hiding self moderation", async () => {
    render(<MemberPanel {...memberProps} myUserId="owner-a" effectivePermissions="0" />);
    await openTarget("Owner A");
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Admin" }));
    await waitFor(() => expect(roleAssign).toHaveBeenCalledWith("s1", "m-owner", "r-admin"));
    await openTarget("Owner A");
    for (const action of ["Server Mute", "Kick", "Ban"]) expect(screen.queryByRole("menuitem", { name: action })).not.toBeInTheDocument();
  });

  it("hides role/moderation sections for an unauthorized actor and copies the stable userId", async () => {
    render(<MemberPanel {...memberProps} effectivePermissions="0" />);
    const row = await openTarget();
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
    expect(screen.queryByRole("menuitemcheckbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy User ID" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("member-c");
    expect(await screen.findByRole("status")).toHaveTextContent("User ID copied.");
    expect(row).toHaveFocus();
  });

  it("reports clipboard failure without claiming success", async () => {
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error("Clipboard denied"));
    render(<MemberPanel {...memberProps} />);
    await openTarget();
    fireEvent.click(screen.getByRole("menuitem", { name: "Copy User ID" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not copy User ID");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each([false, true])("uses the existing server moderation API when isMuted=%s without Voice membership", async (isMuted) => {
    memberList.mockResolvedValue([actor, { ...target, isMuted }]);
    render(<MemberPanel {...memberProps} effectivePermissions="8192" />);
    await openTarget();
    const action = screen.getByRole("menuitem", { name: isMuted ? "Server Unmute" : "Server Mute" });
    expect(action).toHaveAccessibleDescription(isMuted ? "Unmute this member on the server." : "Mute this member on the server.");
    fireEvent.click(action);
    await waitFor(() => expect(isMuted ? memberApi.unmute : memberApi.mute).toHaveBeenCalledWith("s1", "m-c"));
    expect(isMuted ? memberApi.mute : memberApi.unmute).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["Kick", "Ban"] as const)("preserves %s confirmation, cancellation, focus and operation wiring", async (label) => {
    const interaction = userEvent.setup();
    let finish!: () => void;
    const request = new Promise<void>((resolve) => { finish = resolve; });
    const apiAction = label === "Kick" ? memberApi.kick : memberApi.ban;
    (apiAction as jest.Mock).mockReturnValue(request);
    render(<MemberPanel {...memberProps} effectivePermissions={label === "Kick" ? "16" : "32"} />);
    const row = await openTarget();
    expect(screen.queryByRole("menuitem", { name: label === "Kick" ? "Ban" : "Kick" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: label }));
    expect(screen.getByRole("dialog", { name: `${label} Member` })).toHaveTextContent(`${label} @target c from this server?`);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await interaction.keyboard("{Escape}");
    expect(apiAction).not.toHaveBeenCalled();
    expect(row).toHaveFocus();
    await openTarget();
    fireEvent.click(screen.getByRole("menuitem", { name: label }));
    await interaction.tab();
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
    await interaction.keyboard("{Enter}");
    expect(apiAction).toHaveBeenCalledTimes(1);
    expect(apiAction).toHaveBeenCalledWith("s1", "m-c");
    expect(screen.getByRole("button", { name: "Confirm…" })).toBeDisabled();
    await interaction.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    finish();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(row).toHaveFocus();
  });

  it("keeps a failed confirmation actionable and surfaces backend rejection", async () => {
    (memberApi.ban as jest.Mock).mockRejectedValue(new Error("The member is no longer manageable"));
    render(<MemberPanel {...memberProps} />);
    await openTarget();
    fireEvent.click(screen.getByRole("menuitem", { name: "Ban" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The member is no longer manageable");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it.each([{ key: "ContextMenu" }, { key: "F10", shiftKey: true }])("opens with $key and supports role activation and focus return", async (key) => {
    const interaction = userEvent.setup();
    render(<MemberPanel {...memberProps} />);
    const row = await screen.findByRole("listitem", { name: "Target C, member actions" });
    row.focus();
    fireEvent.keyDown(row, { key: "Enter" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await act(async () => { fireEvent.keyDown(row, key); });
    expect(screen.getByRole("menuitemcheckbox", { name: "Member" })).toHaveFocus();
    await interaction.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Server Mute" })).toHaveFocus();
    await interaction.keyboard("{ArrowUp}");
    await interaction.keyboard(" ");
    await waitFor(() => expect(roleRemove).toHaveBeenCalledWith("s1", "m-c", "r-member"));
    expect(row).toHaveFocus();
    await act(async () => { fireEvent.keyDown(row, key); });
    await interaction.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(row).toHaveFocus();
  });

  it("dismisses a captured menu/confirmation when permissions or server context change", async () => {
    const view = render(<MemberPanel {...memberProps} />);
    const row = await openTarget();
    view.rerender(<MemberPanel {...memberProps} effectivePermissions="0" />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(row).toHaveFocus();
    view.rerender(<MemberPanel {...memberProps} />);
    await openTarget();
    fireEvent.click(screen.getByRole("menuitem", { name: "Kick" }));
    await act(async () => { view.rerender(<MemberPanel {...memberProps} serverId="s2" />); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.contextMenu(row);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(memberApi.kick).not.toHaveBeenCalled();
  });
});

import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

jest.mock("../lib/api", () => ({
  channelApi: {
    getPermissionConfiguration: jest.fn(), getCategoryPermissionConfiguration: jest.fn(),
    setOverwrite: jest.fn(), setCategoryOverwrite: jest.fn(), deleteOverwrite: jest.fn(), deleteCategoryOverwrite: jest.fn(),
  },
  roleApi: { list: jest.fn() },
  memberApi: { list: jest.fn() },
}));

import PermissionOverwriteEditor from "../components/PermissionOverwriteEditor";

const mockedApi = jest.requireMock("../lib/api") as {
  channelApi: Record<string, jest.Mock>;
  roleApi: { list: jest.Mock };
  memberApi: { list: jest.Mock };
};
const mockChannelApi = mockedApi.channelApi;
const mockRoleApi = mockedApi.roleApi;
const mockMemberApi = mockedApi.memberApi;

const makeRole = (id: string, name: string, position: number, extra: Record<string, unknown> = {}) => ({
  id, serverId: "s1", name, color: 0, position, permissions: "0", isDefault: false,
  isMentionable: false, isHoisted: false, createdAt: "2026-01-01T00:00:00.000Z", ...extra,
});
const makeMember = (id: string, userId: string, displayName: string, highestPosition: number, extra: Record<string, unknown> = {}) => ({
  id, serverId: "s1", userId, nickname: null, isBanned: false, isMuted: false, mutedUntil: null,
  joinedAt: "2026-01-01T00:00:00.000Z", user: { id: userId, username: displayName.toLowerCase(), displayName, avatarUrl: null },
  roles: highestPosition > 0 ? [{ roleId: `r-${highestPosition}`, role: makeRole(`r-${highestPosition}`, `P${highestPosition}`, highestPosition) }] : [],
  ...extra,
});

const everyone = makeRole("r-everyone", "not-symbolic", 0, { isDefault: true });
const actorRole = makeRole("r-actor", "Permission Manager", 10);
const ordinaryOwnerName = makeRole("r-owner-name", "Owner", 2);
const equalRole = makeRole("r-equal", "Equal", 10);
const foreignRole = { ...makeRole("r-foreign", "Foreign", 1), serverId: "s2" };
const actor = makeMember("m-actor", "u-actor", "Actor", 10);
const realOwner = makeMember("m-owner", "u-owner", "Real Owner", 100);
const ordinaryMember = makeMember("m-member", "u-member", "Ordinary", 1);
const equalMember = makeMember("m-equal", "u-equal", "Equal Member", 10);
const foreignMember = { ...makeMember("m-foreign", "u-foreign", "Foreign Member", 0), serverId: "s2" };

function baseData(overwrites: Array<{ id: string; targetType: "ROLE" | "MEMBER"; targetId: string; allow: string; deny: string }> = []) {
  mockRoleApi.list.mockResolvedValue([everyone, actorRole, ordinaryOwnerName, equalRole, foreignRole]);
  mockMemberApi.list.mockResolvedValue([actor, realOwner, ordinaryMember, equalMember, foreignMember]);
  mockChannelApi.getPermissionConfiguration.mockResolvedValue({
    channelId: "c1", categoryId: null, permissionsSynced: false,
    overwriteSource: { type: "CHANNEL", id: "c1", permissionsSynced: false }, overwrites,
  });
  mockChannelApi.getCategoryPermissionConfiguration.mockResolvedValue({ categoryId: "cat1", overwrites });
}

describe("PermissionOverwriteEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    baseData();
  });

  it("CHPERM-EDITOR-08/09/10/11/12/13/18/23/24: uses canonical targets, safe picker filtering, combined Category groups, and exact raw records", async () => {
    baseData([
      { id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "1024", deny: "128" },
      { id: "o-member", targetType: "MEMBER", targetId: "m-member", allow: "128", deny: "1024" },
    ]);
    render(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-actor" scope="CATEGORY" scopeId="cat1" />);

    await screen.findByRole("button", { name: "Select permission target ROLE:r-everyone" });
    expect(screen.getByText("Default role")).toBeInTheDocument();
    for (const group of ["GENERAL", "TEXT", "VOICE"]) expect(screen.getByRole("heading", { name: group })).toBeInTheDocument();
    for (const hidden of ["Administrator", "Manage Server", "Manage Roles", "Kick Members", "Ban Members", "Create Invite", "Mute Members", "Deafen Members", "Move Members"]) {
      expect(screen.queryByText(hidden)).not.toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "Add Role or Member" }));
    const picker = screen.getByTestId("permission-target-picker");
    expect(picker).toHaveClass("permission-picker", "likecord-scrollbar");
    expect(within(picker).getByRole("button", { name: "Owner" })).toBeInTheDocument();
    expect(within(picker).queryByText("Equal")).not.toBeInTheDocument();
    expect(within(picker).queryByText("Foreign")).not.toBeInTheDocument();
    expect(within(picker).queryByText(/@everyone/)).not.toBeInTheDocument();

    fireEvent.click(within(picker).getByRole("button", { name: "Members" }));
    expect(within(picker).queryByText(/Actor/)).not.toBeInTheDocument();
    expect(within(picker).queryByText(/Real Owner/)).not.toBeInTheDocument();
    expect(within(picker).queryByText(/Equal Member/)).not.toBeInTheDocument();
    expect(within(picker).queryByText(/Foreign Member/)).not.toBeInTheDocument();
    expect(within(picker).queryByText(/Ordinary/)).not.toBeInTheDocument(); // already configured

    fireEvent.click(screen.getByRole("button", { name: "Select permission target MEMBER:m-member" }));
    expect(screen.getByRole("button", { name: "View Channel: DENY" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Send Messages: ALLOW" })).toHaveAttribute("aria-pressed", "true");
  });

  it("CHPERM-EDITOR-14/15/16/17: exposes only the canonical Text or Voice permission catalog", async () => {
    baseData([{ id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "0", deny: "0" }]);
    const { unmount } = render(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-owner" scope="CHANNEL" scopeId="c1" channelType="TEXT" />);
    await screen.findByRole("button", { name: "Select permission target ROLE:r-everyone" });
    expect(screen.getByRole("heading", { name: "GENERAL" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "TEXT" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "VOICE" })).not.toBeInTheDocument();
    expect(screen.queryByText("Administrator")).not.toBeInTheDocument();
    expect(screen.queryByText("Mute Members")).not.toBeInTheDocument();
    unmount();

    render(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-owner" scope="CHANNEL" scopeId="c1" channelType="VOICE" />);
    await screen.findByRole("button", { name: "Select permission target ROLE:r-everyone" });
    expect(screen.getByRole("heading", { name: "GENERAL" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "VOICE" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "TEXT" })).not.toBeInTheDocument();
  });

  it("CHPERM-EDITOR-19/20/21/22/25/26/27: persists mutually-exclusive exact masks and keeps a new target neutral until first mutation", async () => {
    baseData([{ id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "1024", deny: "128" }]);
    mockChannelApi.setOverwrite
      .mockResolvedValueOnce({ id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "0", deny: "1152" })
      .mockResolvedValueOnce({ id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "0", deny: "1024" })
      .mockResolvedValueOnce({ id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "8", deny: "1024" })
      .mockResolvedValueOnce({ id: "o-role", targetType: "ROLE", targetId: "r-owner-name", allow: "512", deny: "0" });
    render(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-owner" scope="CHANNEL" scopeId="c1" channelType="TEXT" />);
    await screen.findByRole("button", { name: "Select permission target ROLE:r-everyone" });

    fireEvent.click(screen.getByRole("button", { name: "View Channel: DENY" }));
    await waitFor(() => expect(mockChannelApi.setOverwrite).toHaveBeenNthCalledWith(1, "c1", "ROLE", "r-everyone", { allow: "0", deny: "1152" }));
    fireEvent.click(screen.getByRole("button", { name: "Send Messages: NEUTRAL" }));
    await waitFor(() => expect(mockChannelApi.setOverwrite).toHaveBeenNthCalledWith(2, "c1", "ROLE", "r-everyone", { allow: "0", deny: "1024" }));
    fireEvent.click(screen.getByRole("button", { name: "Manage Channel: ALLOW" }));
    await waitFor(() => expect(mockChannelApi.setOverwrite).toHaveBeenNthCalledWith(3, "c1", "ROLE", "r-everyone", { allow: "8", deny: "1024" }));
    for (const call of mockChannelApi.setOverwrite.mock.calls) {
      const body = call[3];
      expect(BigInt(body.allow) & BigInt(body.deny)).toBe(0n);
    }

    fireEvent.click(screen.getByRole("button", { name: "Add Role or Member" }));
    fireEvent.click(screen.getByRole("button", { name: "Owner" }));
    expect(screen.getByText(/New targets start with every permission neutral/)).toBeInTheDocument();
    expect(mockChannelApi.setOverwrite).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("button", { name: "Attach Files: NEUTRAL" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Attach Files: ALLOW" }));
    await waitFor(() => expect(mockChannelApi.setOverwrite).toHaveBeenNthCalledWith(4, "c1", "ROLE", "r-owner-name", { allow: "512", deny: "0" }));
  });

  it("CHPERM-EDITOR-29/30/31: confirmation removes only the complete overwrite", async () => {
    baseData([{ id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "1024", deny: "0" }]);
    mockChannelApi.deleteOverwrite.mockResolvedValue({});
    render(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-owner" scope="CHANNEL" scopeId="c1" channelType="TEXT" />);
    await screen.findByRole("button", { name: "Select permission target ROLE:r-everyone" });
    fireEvent.click(screen.getAllByRole("button", { name: "Remove Override" }).at(-1)!);
    expect(screen.getByText(/Role, Member, and Role assignments remain unchanged/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Remove Override" }).at(-1)!);
    await waitFor(() => expect(mockChannelApi.deleteOverwrite).toHaveBeenCalledWith("c1", "ROLE", "r-everyone"));
    expect(mockRoleApi.list).toHaveBeenCalledTimes(1);
  });

  it("CHPERM-EDITOR-26/27: authoritative Role and Member raw masks survive an editor reopen", async () => {
    const persisted = [
      { id: "o-role", targetType: "ROLE" as const, targetId: "r-everyone", allow: "1024", deny: "128" },
      { id: "o-member", targetType: "MEMBER" as const, targetId: "m-member", allow: "128", deny: "1024" },
    ];
    baseData(persisted);
    const first = render(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-owner" scope="CATEGORY" scopeId="cat1" />);
    await screen.findByRole("button", { name: "Select permission target ROLE:r-everyone" });
    expect(screen.getByRole("button", { name: "View Channel: ALLOW" })).toHaveAttribute("aria-pressed", "true");
    first.unmount();

    baseData(persisted);
    render(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-owner" scope="CATEGORY" scopeId="cat1" />);
    await screen.findByRole("button", { name: "Select permission target ROLE:r-everyone" });
    fireEvent.click(screen.getByRole("button", { name: "Select permission target MEMBER:m-member" }));
    expect(screen.getByRole("button", { name: "View Channel: DENY" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Send Messages: ALLOW" })).toHaveAttribute("aria-pressed", "true");
  });

  it("CHPERM-EDITOR-32/33: backend rejection leaves no false state and refetches authoritative configuration", async () => {
    baseData([{ id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "0", deny: "0" }]);
    mockChannelApi.setOverwrite.mockRejectedValue(new Error("Cannot grant permissions you do not have"));
    render(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-owner" scope="CHANNEL" scopeId="c1" channelType="TEXT" />);
    await screen.findByRole("button", { name: "Select permission target ROLE:r-everyone" });
    fireEvent.click(screen.getByRole("button", { name: "View Channel: ALLOW" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot grant permissions you do not have");
    expect(mockChannelApi.getPermissionConfiguration).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "View Channel: NEUTRAL" })).toHaveAttribute("aria-pressed", "true");
  });

  it("CHPERM-LIFE-EDITOR: successful overwrite reconciliation does not remount or blank the editor", async () => {
    const initial = {
      channelId: "c1", categoryId: null, permissionsSynced: false,
      overwriteSource: { type: "CHANNEL", id: "c1", permissionsSynced: false },
      overwrites: [{ id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "0", deny: "0" }],
    };
    const saved = { id: "o-everyone", targetType: "ROLE", targetId: "r-everyone", allow: "1024", deny: "0" };
    let resolveRefresh: ((configuration: typeof initial) => void) | undefined;
    mockChannelApi.getPermissionConfiguration
      .mockReset()
      .mockResolvedValueOnce(initial)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve; }));
    mockChannelApi.setOverwrite.mockResolvedValue(saved);

    const view = render(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-owner" scope="CHANNEL" scopeId="c1" channelType="TEXT" refreshKey={0} />);
    await screen.findByRole("button", { name: "Select permission target ROLE:r-everyone" });
    const mountedEditor = screen.getByTestId("channel-permission-editor");
    fireEvent.click(screen.getByRole("button", { name: "View Channel: ALLOW" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "View Channel: ALLOW" })).toHaveAttribute("aria-pressed", "true"));

    view.rerender(<PermissionOverwriteEditor serverId="s1" ownerId="u-owner" actorUserId="u-owner" scope="CHANNEL" scopeId="c1" channelType="TEXT" refreshKey={1} />);
    expect(screen.getByTestId("channel-permission-editor")).toBe(mountedEditor);
    expect(screen.queryByText("Loading permission configuration…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Channel: ALLOW" })).toHaveAttribute("aria-pressed", "true");

    await act(async () => { resolveRefresh?.({ ...initial, overwrites: [saved] }); });
    await waitFor(() => expect(mockChannelApi.getPermissionConfiguration).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("channel-permission-editor")).toBe(mountedEditor);
  });
});

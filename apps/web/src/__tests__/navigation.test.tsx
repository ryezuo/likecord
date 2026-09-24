import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { inviteRoute, safeInternalReturnTo } from "../lib/navigation";

let mockPathname = "/channels/s1/c1";
let mockSearchParams = new URLSearchParams();
const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockAuthUser: any = { id: "u1", username: "user", displayName: "User", email: "user@test.local", avatarUrl: null, bio: null };
const mockLogin = jest.fn();
const mockNavigationApi = {
  continue: jest.fn(),
  resolveServer: jest.fn(),
  validateTextChannel: jest.fn(),
  setLastTextChannel: jest.fn(),
};
const mockWsListeners = new Map<string, Set<(data: unknown) => void>>();
const mockOn = jest.fn((event: string, handler: (data: unknown) => void) => {
  if (!mockWsListeners.has(event)) mockWsListeners.set(event, new Set());
  mockWsListeners.get(event)!.add(handler);
  return () => mockWsListeners.get(event)?.delete(handler);
});
let mockReadyVersion = 1;
const mockVoice = {
  channelId: "v1", members: [], status: "connected", screenShares: [], subscribedShareIds: [], remoteScreenStreams: {},
  presenterViewerIds: {}, localScreenStream: null, leave: jest.fn(), join: jest.fn(), leaveScreenShare: jest.fn(),
  setRemoteScreenAudioHidden: jest.fn(),
};

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useRouter: () => mockRouter,
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
    login: (...args: unknown[]) => mockLogin(...args),
    logout: jest.fn(),
    updateProfile: jest.fn(),
  }),
}));

jest.mock("../hooks/useWebSocket", () => ({
  useWebSocket: () => ({ connected: true, readyVersion: mockReadyVersion, subscribe: jest.fn(), unsubscribe: jest.fn(), on: mockOn, socket: { id: "socket" } }),
}));

jest.mock("../hooks/useMessages", () => ({
  useMessages: () => ({ messages: [], loadMore: jest.fn(), hasMore: false, loading: false, send: jest.fn(), edit: jest.fn(), remove: jest.fn(), handleWsEvent: jest.fn() }),
}));

jest.mock("../hooks/useVoice", () => ({
  useVoice: () => mockVoice,
}));

jest.mock("../lib/ws", () => ({ getSocket: jest.fn(() => ({ connected: true, emit: jest.fn() })) }));

jest.mock("../lib/api", () => ({
  serverApi: { list: jest.fn(), create: jest.fn() },
  channelApi: { list: jest.fn(), create: jest.fn() },
  inviteApi: { create: jest.fn(), validate: jest.fn(), accept: jest.fn() },
  attachmentApi: { prepare: jest.fn(), upload: jest.fn(), complete: jest.fn() },
  navigationApi: mockNavigationApi,
}));

jest.mock("../components/layout/ServerRail", () => (props: any) => (
  <div data-testid="server-rail" data-active-server-id={props.activeServerId || ""}>
    <button aria-label="Home" aria-current={props.isHome ? "page" : undefined} onClick={props.onHome}>Home</button>
    {props.servers.map((server: any) => <button key={server.id} data-testid={`server-${server.id}`} onClick={() => props.onSelect(server.id)}>{server.name}</button>)}
    <button data-testid="add-server" onClick={props.onAdd}>Add Server</button>
  </div>
));
jest.mock("../components/layout/ChannelSidebar", () => (props: any) => (
  <div data-testid="channel-sidebar" data-active-channel-id={props.activeChannelId || ""}>{props.textChannels.map((channel: any) => <button key={channel.id} data-testid={`channel-${channel.id}`} onClick={() => props.onSelectChannel(channel.id)}>{channel.name}</button>)}</div>
));
jest.mock("../components/layout/ChatArea", () => (props: any) => <div data-testid="chat-channel">{props.activeChannelId}</div>);
jest.mock("../components/layout/MemberPanel", () => (props: any) => <aside data-testid="member-panel" data-server-id={props.serverId || ""} />);
jest.mock("../components/layout/ScreenShareViewerWorkspace", () => ({ __esModule: true, default: ({ children }: any) => <main data-testid="viewer-presentation-workspace">{children}</main> }));
jest.mock("../components/layout/ScreenSharePresenterCard", () => () => null);
jest.mock("../components/ServerSettings", () => () => null);

describe("canonical navigation helpers", () => {
  it("accepts only internal absolute paths for returnTo", () => {
    expect(safeInternalReturnTo("/channels/s1/c1?x=1#latest")).toBe("/channels/s1/c1?x=1#latest");
    expect(safeInternalReturnTo("https://evil.example")).toBeNull();
    expect(safeInternalReturnTo("//evil.example")).toBeNull();
    expect(safeInternalReturnTo("/\\evil.example")).toBeNull();
    expect(safeInternalReturnTo("javascript:alert(1)")).toBeNull();
    expect(safeInternalReturnTo(`/${"a".repeat(2048)}`)).toBeNull();
    expect(inviteRoute("safe code/segment")).toBe("/invite/safe%20code%2Fsegment");
  });

  it("sends a normal authenticated login to /channels/@me and preserves a safe returnTo", async () => {
    const LoginPage = (await import("../app/page")).default;
    mockSearchParams = new URLSearchParams();
    render(<LoginPage />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/@me"));

    mockRouter.replace.mockClear();
    mockSearchParams = new URLSearchParams({ returnTo: "/channels/s1/c1" });
    render(<LoginPage />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/s1/c1"));

    mockRouter.replace.mockClear();
    mockSearchParams = new URLSearchParams({ returnTo: "/invite/abc123" });
    render(<LoginPage />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/invite/abc123"));
  });

  it("rejects an external login returnTo", async () => {
    const LoginPage = (await import("../app/page")).default;
    mockSearchParams = new URLSearchParams({ returnTo: "https://evil.example" });
    render(<LoginPage />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/@me"));
  });

  it("presents branded, labelled login controls with truthful pending and error metadata", async () => {
    mockAuthUser = null;
    let rejectLogin!: (reason: Error) => void;
    mockLogin.mockImplementation(() => new Promise((_, reject) => { rejectLogin = reject; }));
    const LoginPage = (await import("../app/page")).default;
    const { container } = render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Sign In" })).toBeInTheDocument();
    expect(container.querySelector(".auth-brand-mark")).toHaveAttribute("aria-hidden", "true");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password-9" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    const pending = await screen.findByRole("button", { name: "Signing in..." });
    expect(pending).toBeDisabled();
    expect(pending.closest("form")).toHaveAttribute("aria-busy", "true");
    rejectLogin(new Error("Invalid credentials"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Invalid credentials");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", "login-error");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("canonical navigation UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.removeItem("member_panel_visible");
    mockWsListeners.clear();
    mockReadyVersion = 0;
    mockNavigationApi.continue.mockReset().mockResolvedValue({ destination: null });
    mockAuthUser = { id: "u1", username: "user", displayName: "User", email: "user@test.local", avatarUrl: null, bio: null };
    mockVoice.leave.mockClear();
    mockPathname = "/channels/s1/c1";
    mockSearchParams = new URLSearchParams();
    const channels = [
      { id: "c1", name: "general", type: "TEXT", categoryId: null, position: 0 },
      { id: "c2", name: "random", type: "TEXT", categoryId: null, position: 1 },
    ];
    const { serverApi, channelApi } = jest.requireMock("../lib/api");
    serverApi.list.mockResolvedValue([{ id: "s1", name: "Server One", ownerId: "u1" }, { id: "s2", name: "Server Two", ownerId: "u1" }]);
    channelApi.list.mockResolvedValue(channels);
    mockNavigationApi.validateTextChannel.mockResolvedValue({ channel: channels[0] });
    mockNavigationApi.resolveServer.mockResolvedValue({ channelId: "c1" });
    mockNavigationApi.setLastTextChannel.mockResolvedValue({});
  });

  it("uses client-side URL navigation for server and text-channel clicks", async () => {
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);

    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1"));
    expect(mockNavigationApi.setLastTextChannel).toHaveBeenCalledWith("s1", "c1");

    fireEvent.click(screen.getByTestId("server-s2"));
    expect(mockRouter.push).toHaveBeenCalledWith("/channels/s2");

    fireEvent.click(screen.getByTestId("channel-c2"));
    expect(mockRouter.push).toHaveBeenCalledWith("/channels/s1/c2");
  });

  it("opens the Add a Server choices from the rail and reconciles Create without duplicates", async () => {
    const { serverApi } = jest.requireMock("../lib/api");
    const initial = [{ id: "s1", name: "Server One", ownerId: "u1" }, { id: "s2", name: "Server Two", ownerId: "u1" }];
    serverApi.list.mockResolvedValueOnce(initial).mockResolvedValueOnce([...initial, { id: "s3", name: "Garden", ownerId: "u1" }, { id: "s3", name: "Garden", ownerId: "u1" }]);
    serverApi.create.mockResolvedValue({ id: "s3", name: "Garden", ownerId: "u1" });
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await screen.findByTestId("server-s1");

    fireEvent.click(screen.getByTestId("add-server"));
    expect(screen.getByRole("heading", { name: "Add a Server" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Server name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create a Server/ }));
    fireEvent.change(screen.getByLabelText("Server name"), { target: { value: "Garden" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Server" }));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/channels/s3"));
    expect(screen.getAllByTestId("server-s3")).toHaveLength(1);
  });

  it("joins through the existing preview/accept APIs and navigates through the canonical server route", async () => {
    const { serverApi, inviteApi } = jest.requireMock("../lib/api");
    const initial = [{ id: "s1", name: "Server One", ownerId: "u1" }, { id: "s2", name: "Server Two", ownerId: "u1" }];
    serverApi.list.mockResolvedValueOnce(initial).mockResolvedValueOnce([...initial, { id: "s4", name: "Joined Garden", ownerId: "u4" }]);
    inviteApi.validate.mockResolvedValue({ inviteStatus: "VALID", membershipStatus: "NOT_MEMBER", serverName: "Joined Garden" });
    inviteApi.accept.mockResolvedValue({ result: "JOINED", memberId: "m4", serverId: "s4", serverName: "Joined Garden" });
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await screen.findByTestId("server-s1");

    fireEvent.click(screen.getByTestId("add-server"));
    fireEvent.click(screen.getByRole("button", { name: /Join a Server/ }));
    fireEvent.change(screen.getByLabelText("Invite code or URL"), { target: { value: "/invite/join_me" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Join Server" }));

    await waitFor(() => expect(inviteApi.accept).toHaveBeenCalledWith("join_me"));
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/channels/s4"));
    expect(screen.getAllByTestId("server-s4")).toHaveLength(1);
  });

  it("replaces a server-only route with the resolved preferred text channel", async () => {
    mockPathname = "/channels/s1";
    mockNavigationApi.resolveServer.mockResolvedValue({ channelId: "c2" });
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/s1/c2"));
  });

  it("redirects the legacy /app route to canonical navigation", async () => {
    mockPathname = "/app";
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Opening Likecord…");
    expect(status).toHaveAttribute("aria-busy", "true");
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/channels/@me"));
  });

  it("presents server resolution as a polite busy state without changing navigation", async () => {
    mockPathname = "/channels/s1";
    mockNavigationApi.resolveServer.mockReturnValue(new Promise(() => {}));
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Loading server…");
    expect(status).toHaveTextContent("Preparing your workspace.");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("follows route changes for Back/Forward without leaving the voice session", async () => {
    const AppPage = (await import("../app/app/page")).default;
    const view = render(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1"));

    mockPathname = "/channels/s1/c2";
    mockNavigationApi.validateTextChannel.mockResolvedValue({ channel: { id: "c2", name: "random", type: "TEXT", serverId: "s1" } });
    view.rerender(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c2"));

    mockPathname = "/channels/s1/c1";
    mockNavigationApi.validateTextChannel.mockResolvedValue({ channel: { id: "c1", name: "general", type: "TEXT", serverId: "s1" } });
    view.rerender(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1"));
    expect(mockVoice.leave).not.toHaveBeenCalled();
  });

  it("keeps the loaded server shell and screen-share workspace stable during a same-server channel transition", async () => {
    const AppPage = (await import("../app/app/page")).default;
    const view = render(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1"));

    const serverRail = screen.getByTestId("server-rail");
    const channelSidebar = screen.getByTestId("channel-sidebar");
    const memberPanel = screen.getByTestId("member-panel");
    const workspace = screen.getByTestId("viewer-presentation-workspace");
    let resolveChannel!: (value: { channel: { id: string; name: string; type: string; serverId: string } }) => void;
    mockNavigationApi.validateTextChannel.mockImplementationOnce(() => new Promise((resolve) => { resolveChannel = resolve; }));

    mockPathname = "/channels/s1/c2";
    view.rerender(<AppPage />);

    await waitFor(() => expect(screen.getByTestId("channel-content-loading")).toBeInTheDocument());
    expect(screen.getByTestId("channel-content-loading")).toHaveAttribute("role", "status");
    expect(screen.getByTestId("channel-content-loading")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Loading server…")).not.toBeInTheDocument();
    expect(screen.getByTestId("server-rail")).toBe(serverRail);
    expect(serverRail).toHaveAttribute("data-active-server-id", "s1");
    expect(screen.getByTestId("channel-sidebar")).toBe(channelSidebar);
    expect(channelSidebar).toHaveAttribute("data-active-channel-id", "c2");
    expect(screen.getByTestId("member-panel")).toBe(memberPanel);
    expect(memberPanel).toHaveAttribute("data-server-id", "s1");
    expect(screen.getByTestId("viewer-presentation-workspace")).toBe(workspace);

    resolveChannel({ channel: { id: "c2", name: "random", type: "TEXT", serverId: "s1" } });
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c2"));
    expect(screen.getByTestId("server-rail")).toBe(serverRail);
    expect(serverRail).toHaveAttribute("data-active-server-id", "s1");
    expect(screen.getByTestId("channel-sidebar")).toBe(channelSidebar);
    expect(screen.getByTestId("member-panel")).toBe(memberPanel);
    expect(screen.getByTestId("viewer-presentation-workspace")).toBe(workspace);
  });

  it("keeps the member-list toggle in the shared header and expands the workspace when hidden", async () => {
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);
    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1"));

    expect(screen.getByTestId("member-panel")).toBeInTheDocument();
    const hide = screen.getByRole("button", { name: "Hide member list" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(hide);
    expect(screen.queryByTestId("member-panel")).not.toBeInTheDocument();
    expect(localStorage.getItem("member_panel_visible")).toBe("false");

    const show = screen.getByRole("button", { name: "Show member list" });
    expect(show).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(show);
    expect(screen.getByTestId("member-panel")).toBeInTheDocument();
    expect(localStorage.getItem("member_panel_visible")).toBe("true");
  });

  it("renders safe fallback states instead of an inaccessible or empty text route", async () => {
    mockNavigationApi.validateTextChannel.mockRejectedValue(new Error("not available"));
    const AppPage = (await import("../app/app/page")).default;
    const inaccessible = render(<AppPage />);
    await waitFor(() => expect(screen.getByText("This server or channel is unavailable")).toBeInTheDocument());
    expect(screen.getByRole("status")).not.toHaveAttribute("aria-busy");
    inaccessible.unmount();

    mockPathname = "/channels/s1";
    mockNavigationApi.resolveServer.mockResolvedValue({ channelId: null });
    render(<AppPage />);
    await waitFor(() => expect(screen.getByText("No accessible text channels")).toBeInTheDocument());
    expect(screen.getByRole("status")).not.toHaveAttribute("aria-busy");
  });

  it("keeps a valid route rendered if the asynchronous preference write fails", async () => {
    mockNavigationApi.setLastTextChannel.mockRejectedValue(new Error("temporary failure"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const AppPage = (await import("../app/app/page")).default;
    render(<AppPage />);

    await waitFor(() => expect(screen.getByTestId("chat-channel")).toHaveTextContent("c1"));
    await waitFor(() => expect(warn).toHaveBeenCalledWith("Failed to save last text channel preference"));
    warn.mockRestore();
  });

  describe("F7.2 Home integration", () => {
    beforeEach(() => { mockPathname = "/channels/@me"; });

    it.each(["mouse", "Enter", "Space"])("returns from a channel to Home via %s without writing or replacing the durable destination", async (interaction) => {
      mockPathname = "/channels/s1/c1";
      mockNavigationApi.continue.mockResolvedValue({ destination: { serverId: "s1", serverName: "Server One", channelId: "c1", channelName: "general" } });
      const AppPage = (await import("../app/app/page")).default;
      const view = render(<AppPage />);
      await screen.findByTestId("chat-channel");
      expect(mockNavigationApi.setLastTextChannel).toHaveBeenCalledTimes(1);
      expect(mockNavigationApi.setLastTextChannel).toHaveBeenCalledWith("s1", "c1");
      const home = screen.getByRole("button", { name: "Home" });
      expect(home).not.toHaveAttribute("aria-current");
      if (interaction === "mouse") fireEvent.click(home);
      else {
        const keyboard = userEvent.setup();
        await keyboard.tab();
        expect(home).toHaveFocus();
        await keyboard.keyboard(interaction === "Enter" ? "{Enter}" : " ");
      }
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith("/channels/@me");
      mockPathname = "/channels/@me";
      view.rerender(<AppPage />);
      const resume = await screen.findByRole("button", { name: /Continue where you left off Server One #general/ });
      expect(home).toHaveAttribute("aria-current", "page");
      expect(screen.getByTestId("server-rail")).toHaveAttribute("data-active-server-id", "");
      expect(mockNavigationApi.setLastTextChannel).toHaveBeenCalledTimes(1);
      expect(mockNavigationApi.resolveServer).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockVoice.leave).not.toHaveBeenCalled();
      if (interaction !== "mouse") expect(home).toHaveFocus();
      fireEvent.click(resume);
      expect(mockRouter.push).toHaveBeenLastCalledWith("/channels/s1/c1");
    });

    it("renders @me, preserves explicit Continue routing and revalidates access on selection", async () => {
      mockNavigationApi.continue.mockResolvedValue({ destination: { serverId: "s1", serverName: "Server One", channelId: "c1", channelName: "general" } });
      const AppPage = (await import("../app/app/page")).default;
      const view = render(<AppPage />);
      const button = await screen.findByRole("button", { name: /Continue where you left off Server One/ });
      expect(screen.getByRole("heading", { name: "Welcome back, User" })).toBeInTheDocument();
      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(mockNavigationApi.setLastTextChannel).not.toHaveBeenCalled();
      expect(mockNavigationApi.resolveServer).not.toHaveBeenCalled();
      fireEvent.click(button);
      expect(mockRouter.push).toHaveBeenCalledWith("/channels/s1/c1");
      mockNavigationApi.validateTextChannel.mockRejectedValueOnce(new Error("access lost"));
      mockPathname = "/channels/s1/c1";
      view.rerender(<AppPage />);
      expect(await screen.findByText("This server or channel is unavailable")).toBeInTheDocument();
      expect(mockNavigationApi.validateTextChannel).toHaveBeenCalledWith("s1", "c1");
      expect(mockNavigationApi.resolveServer).not.toHaveBeenCalled();
      expect(mockNavigationApi.setLastTextChannel).not.toHaveBeenCalled();
    });

    it("opens the existing Add Server modal from Home and retries a failed server list", async () => {
      const { serverApi } = jest.requireMock("../lib/api");
      serverApi.list.mockRejectedValueOnce(new Error("failed"));
      const AppPage = (await import("../app/app/page")).default;
      render(<AppPage />);
      expect(await screen.findByText("Could not load your servers.")).toBeInTheDocument();
      expect(screen.queryByText("You have not joined any servers yet.")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry servers" }));
      expect(await screen.findByRole("button", { name: "Open Server One" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Add a Server" }));
      expect(screen.getByRole("heading", { name: "Add a Server" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create a Server/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Join a Server/ })).toBeInTheDocument();
    });

    it("clears old account data and rejects delayed Continue and server-list responses", async () => {
      const { serverApi } = jest.requireMock("../lib/api");
      let finishOldContinue!: (value: unknown) => void;
      let finishOldServers!: (value: unknown) => void;
      mockNavigationApi.continue.mockReturnValueOnce(new Promise((resolve) => { finishOldContinue = resolve; }));
      serverApi.list.mockReturnValueOnce(new Promise((resolve) => { finishOldServers = resolve; })).mockResolvedValueOnce([]);
      const AppPage = (await import("../app/app/page")).default;
      const view = render(<AppPage />);
      const signal = mockNavigationApi.continue.mock.calls[0][0] as AbortSignal;
      mockAuthUser = { ...mockAuthUser, id: "u2", displayName: "Other" };
      view.rerender(<AppPage />);
      expect(signal.aborted).toBe(true);
      await screen.findByText("You have not joined any servers yet.");
      await act(async () => {
        finishOldContinue({ destination: { serverId: "s1", serverName: "Private old server", channelId: "c1", channelName: "private-channel" } });
        finishOldServers([{ id: "s1", name: "Private old server", ownerId: "u1" }]);
      });
      expect(screen.queryByText(/Private old server|private-channel/)).not.toBeInTheDocument();
      expect(screen.queryByTestId("server-s1")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Welcome back, Other" })).toBeInTheDocument();
    });

    it("clears an already rendered destination on account change and logout", async () => {
      mockNavigationApi.continue.mockResolvedValueOnce({ destination: { serverId: "s1", serverName: "Private", channelId: "c1", channelName: "private" } });
      const AppPage = (await import("../app/app/page")).default;
      const view = render(<AppPage />);
      await screen.findByRole("button", { name: /Continue where you left off Private/ });
      mockAuthUser = { ...mockAuthUser, id: "u2" };
      mockNavigationApi.continue.mockReturnValueOnce(new Promise(() => {}));
      view.rerender(<AppPage />);
      expect(screen.queryByRole("button", { name: /Continue where you left off/ })).not.toBeInTheDocument();
      const signal = mockNavigationApi.continue.mock.calls[1][0] as AbortSignal;
      mockAuthUser = null;
      view.rerender(<AppPage />);
      expect(signal.aborted).toBe(true);
      expect(screen.queryByRole("heading", { name: /Welcome back/ })).not.toBeInTheDocument();
      expect(screen.queryByTestId("server-s1")).not.toBeInTheDocument();
    });

    it.each(["permissions:changed", "channels:changed", "server:membership-removed", "server:deleted"])("invalidates Continue on %s without opening a server", async (event) => {
      mockNavigationApi.continue.mockResolvedValueOnce({ destination: { serverId: "s1", serverName: "Server One", channelId: "c1", channelName: "general" } });
      const AppPage = (await import("../app/app/page")).default;
      render(<AppPage />);
      await screen.findByRole("button", { name: /Continue where you left off/ });
      act(() => mockWsListeners.get(event)?.forEach((handler) => handler({ serverId: "s1" })));
      expect(screen.queryByRole("button", { name: /Continue where you left off/ })).not.toBeInTheDocument();
      await waitFor(() => expect(mockNavigationApi.continue).toHaveBeenCalledTimes(2));
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it("refreshes on Home re-entry and reconnect while keeping the call shell mounted", async () => {
      const AppPage = (await import("../app/app/page")).default;
      const view = render(<AppPage />);
      await screen.findByRole("button", { name: "Open Server One" });
      const workspace = screen.getByTestId("viewer-presentation-workspace");
      mockPathname = "/channels/s1/c1";
      view.rerender(<AppPage />);
      await screen.findByTestId("chat-channel");
      mockPathname = "/channels/@me";
      view.rerender(<AppPage />);
      await waitFor(() => expect(mockNavigationApi.continue).toHaveBeenCalledTimes(2));
      expect(screen.getByTestId("viewer-presentation-workspace")).toBe(workspace);
      mockReadyVersion = 1;
      view.rerender(<AppPage />);
      await waitFor(() => expect(mockNavigationApi.continue).toHaveBeenCalledTimes(3));
      expect(mockVoice.leave).not.toHaveBeenCalled();
    });

    it("uses a fresh server list after removal and a later membership change", async () => {
      const { serverApi } = jest.requireMock("../lib/api");
      const AppPage = (await import("../app/app/page")).default;
      render(<AppPage />);
      await screen.findByRole("button", { name: "Open Server One" });
      serverApi.list.mockResolvedValueOnce([]);
      act(() => mockWsListeners.get("server:membership-removed")?.forEach((handler) => handler({ serverId: "s1" })));
      await screen.findByText("You have not joined any servers yet.");
      act(() => mockWsListeners.get("server:member-joined")?.forEach((handler) => handler({ serverId: "s1" })));
      expect(await screen.findByRole("button", { name: "Open Server One" })).toBeInTheDocument();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });
});

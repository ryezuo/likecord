import "@testing-library/jest-dom";
import React, { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import UserAvatar from "../components/ui/UserAvatar";
import UserSettings from "../components/settings/UserSettings";
import { AvatarProvider } from "../hooks/useAvatars";
import { ApiError, avatarApi } from "../lib/api";
import { AvatarPreviewError } from "../lib/avatar-preview";

const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const avatar = (userId = id, n = 1) => `/api/v1/users/${userId}/avatar/178871000000${n}-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
let mockUser = { id, username: "garden", displayName: "Garden", email: "garden@example.test", avatarUrl: null as string | null, bio: "Bio", passwordChangeRequired: false };
let mockSession = 0;
const mockMerge = jest.fn();
const mockCreateStaticAvatarPreview = jest.fn();
jest.mock("../hooks/useAuth", () => ({ useAuth: () => ({ user: mockUser, sessionVersion: mockSession, mergeAvatar: mockMerge }) }));
jest.mock("../hooks/useUserPreferences", () => ({ useUserPreferences: () => ({ preferences: { showSendButton: false }, status: "ready", mutationStatus: "idle" }) }));
jest.mock("../lib/api", () => ({ ...jest.requireActual("../lib/api"), avatarApi: { metadata: jest.fn(), upload: jest.fn(), remove: jest.fn() } }));
jest.mock("../lib/avatar-preview", () => ({
  ...jest.requireActual("../lib/avatar-preview"),
  createStaticAvatarPreview: (...args: unknown[]) => mockCreateStaticAvatarPreview(...args),
}));
const handlers = new Map<string, (payload: { userId?: string }) => void>();
const on = (event: string, callback: (payload: { userId?: string }) => void) => { handlers.set(event, callback); return () => { handlers.delete(event); }; };
const tick = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 65)); }); };
const file = () => new File(["pixels"], "avatar.png", { type: "image/png" });
function shell(children: React.ReactNode, readyVersion = 1) { return <AvatarProvider on={on} readyVersion={readyVersion}>{children}</AvatarProvider>; }
describe("avatar rendering, Settings and recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks(); handlers.clear(); mockSession = 0; mockUser = { ...mockUser, id, avatarUrl: null };
    (avatarApi.metadata as jest.Mock).mockImplementation(async (userId) => ({ userId, avatarUrl: userId === mockUser.id ? mockUser.avatarUrl : null }));
    let preview = 0;
    mockCreateStaticAvatarPreview.mockImplementation(async () => ({ url: `blob:avatar-preview-${++preview}`, width: 90, height: 60 }));
    URL.revokeObjectURL = jest.fn();
  });
  it("uses decorative circular image or surface initials, and resets failure on URL change", () => {
    const view = render(<span>Alice<UserAvatar userId={id} name="Alice" /></span>); expect(view.container.querySelector(".user-avatar-content")).toHaveTextContent("A");
    view.rerender(<UserAvatar userId={id} name="Alice" avatarUrl={avatar()} />);
    const image = view.container.querySelector("img")!; expect(image).toHaveAttribute("alt", ""); expect(image.closest("span")).toHaveAttribute("aria-hidden", "true");
    fireEvent.error(image); expect(view.container.querySelector("img")).toBeNull(); expect(view.container).toHaveTextContent("A");
    view.rerender(<UserAvatar userId={id} name="" avatarUrl={avatar(id, 2)} />); expect(view.container.querySelector("img")).toHaveAttribute("src", avatar(id, 2).replace(/\.webp$/, ".poster.webp"));
    fireEvent.error(view.container.querySelector("img")!); expect(view.container).toHaveTextContent("?");
  });
  it("only revalidates image failure once and retries the image once after reconciliation", async () => {
    mockUser.avatarUrl = avatar();
    const view = render(shell(<><UserAvatar userId={id} name="Garden" /><UserAvatar userId={id} name="Garden" /></>)); await tick();
    (avatarApi.metadata as jest.Mock).mockClear();
    act(() => { view.container.querySelectorAll("img").forEach((img) => fireEvent.error(img)); }); await tick();
    expect(avatarApi.metadata).toHaveBeenCalledTimes(1); expect(view.container.querySelectorAll("img")).toHaveLength(2);
    act(() => { view.container.querySelectorAll("img").forEach((img) => fireEvent.error(img)); }); await tick();
    expect(avatarApi.metadata).toHaveBeenCalledTimes(1); expect(view.container.querySelectorAll("img")).toHaveLength(0);
  });
  it("focus, readiness and events reconcile only consumed IDs; session switch clears old state", async () => {
    const view = render(shell(<UserAvatar userId={other} name="Other" />)); await tick(); (avatarApi.metadata as jest.Mock).mockClear();
    act(() => { handlers.get("user:avatar-updated")?.({ userId: "unknown" }); handlers.get("user:avatar-updated")?.({ userId: other }); }); await tick();
    expect(avatarApi.metadata).toHaveBeenCalledTimes(1); expect((avatarApi.metadata as jest.Mock).mock.calls[0][0]).toBe(other);
    (avatarApi.metadata as jest.Mock).mockClear(); fireEvent.focus(window); await tick(); expect(avatarApi.metadata).toHaveBeenCalledTimes(2);
    (avatarApi.metadata as jest.Mock).mockClear(); view.rerender(shell(<UserAvatar userId={other} name="Other" />, 2)); await tick(); expect(avatarApi.metadata).toHaveBeenCalledTimes(2);
    view.rerender(shell(<span>no other consumer</span>, 2)); (avatarApi.metadata as jest.Mock).mockClear(); fireEvent.focus(window); await tick(); expect(avatarApi.metadata).toHaveBeenCalledTimes(1);
    mockUser = { ...mockUser, id: other }; mockSession++; view.rerender(shell(<UserAvatar userId={other} name="New account" />, 3)); await tick();
    expect((avatarApi.metadata as jest.Mock).mock.calls.at(-1)[0]).toBe(other); expect(mockMerge.mock.calls.every((args) => args.length === 2)).toBe(true);
  });
  it("survives StrictMode effect replay", async () => {
    mockUser.avatarUrl = avatar(); const view = render(<StrictMode>{shell(<UserAvatar userId={id} name="Garden" />)}</StrictMode>); await tick();
    expect(view.container.querySelector("img")).toHaveAttribute("src", avatar().replace(/\.webp$/, ".poster.webp")); expect(avatarApi.metadata).toHaveBeenCalled();
  });
  it("a new session for the same account clears failed image state", async () => {
    mockUser.avatarUrl = avatar();
    const view = render(shell(<UserAvatar userId={id} name="Garden" />)); await tick();
    fireEvent.error(view.container.querySelector("img")!); await tick();
    fireEvent.error(view.container.querySelector("img")!); expect(view.container.querySelector("img")).toBeNull();
    mockSession++; view.rerender(shell(<UserAvatar userId={id} name="Garden" />)); await tick();
    expect(view.container.querySelector("img")).toHaveAttribute("src", avatar().replace(/\.webp$/, ".poster.webp"));
  });
  function settings() {
    const close = jest.fn(), profile = jest.fn(), logout = jest.fn();
    const children = <><span data-testid="other-surface"><UserAvatar userId={id} name="Garden" /></span><UserSettings user={mockUser} onUpdateProfile={profile} onChangeEmail={jest.fn()} onChangePassword={jest.fn()} onLogout={logout} onClose={close} /></>;
    return { ...render(shell(children)), close, profile, logout };
  }
  const select = async () => {
    fireEvent.change(screen.getByLabelText("Choose avatar image"), { target: { files: [file()] } });
    await screen.findByLabelText("Crop avatar position");
  };
  it("selection only previews; Cancel/replacement/unmount revoke object URLs", async () => {
    const view = settings();
    expect(screen.getByLabelText("Choose avatar image")).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,image/gif");
    await select(); expect(avatarApi.upload).not.toHaveBeenCalled();
    expect(document.querySelector(".avatar-crop-viewport img")).toHaveAttribute("src", "blob:avatar-preview-1");
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]); await act(async () => {});
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    await select(); await select(); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    view.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
  });
  it("discards and releases the crop draft when the account session changes", async () => {
    const close = jest.fn(), profile = jest.fn(), logout = jest.fn();
    const view = render(shell(<UserSettings user={mockUser} onUpdateProfile={profile} onChangeEmail={jest.fn()} onChangePassword={jest.fn()} onLogout={logout} onClose={close} />));
    await select();
    const nextUser = { ...mockUser, id: other };
    view.rerender(shell(<UserSettings user={nextUser} onUpdateProfile={profile} onChangeEmail={jest.fn()} onChangePassword={jest.fn()} onLogout={logout} onClose={close} />));
    expect(screen.queryByLabelText("Crop avatar position")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:avatar-preview-1");
  });
  it("upload is independent of profile drafts, gates pending close/save/logout, updates other surfaces", async () => {
    const view = settings(); await tick();
    fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Unsaved draft" } });
    fireEvent.change(screen.getByLabelText("Bio"), { target: { value: "Unsaved bio" } });
    let finish!: (value: unknown) => void; (avatarApi.upload as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await select(); fireEvent.click(screen.getByRole("button", { name: "Upload Avatar" }));
    expect(screen.getByText("Uploading and processing…")).toHaveAttribute("role", "status");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled(); expect(screen.getByRole("button", { name: "Log Out" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" }); expect(view.close).not.toHaveBeenCalled();
    await act(async () => { mockUser.avatarUrl = avatar(); finish({ userId: id, avatarUrl: avatar() }); });
    expect(screen.getByTestId("other-surface").querySelector("img")).toHaveAttribute("src", avatar().replace(/\.webp$/, ".poster.webp"));
    expect(screen.getByLabelText("Display Name")).toHaveValue("Unsaved draft"); expect(screen.getByLabelText("Bio")).toHaveValue("Unsaved bio"); expect(view.profile).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled(); expect(mockMerge).toHaveBeenCalledWith(id, avatar());
  });
  it("known errors retain current avatar and support retry/discard; remove has no confirmation", async () => {
    mockUser.avatarUrl = avatar(); settings(); await tick();
    (avatarApi.upload as jest.Mock).mockRejectedValueOnce(new ApiError("Invalid image", 422)); await select(); fireEvent.click(screen.getByRole("button", { name: "Upload Avatar" }));
    await screen.findByRole("alert"); expect(screen.getByTestId("other-surface").querySelector("img")).toHaveAttribute("src", avatar().replace(/\.webp$/, ".poster.webp"));
    expect(screen.getByRole("button", { name: "Retry avatar change" })).toBeEnabled();
    (avatarApi.upload as jest.Mock).mockImplementationOnce(async () => { mockUser.avatarUrl = avatar(id, 2); return { userId: id, avatarUrl: avatar(id, 2) }; });
    fireEvent.click(screen.getByRole("button", { name: "Retry avatar change" })); await screen.findByText("Avatar updated.");
    expect(avatarApi.upload).toHaveBeenCalledTimes(2);
    expect((avatarApi.upload as jest.Mock).mock.calls[0][0]).toBe((avatarApi.upload as jest.Mock).mock.calls[1][0]);
    expect((avatarApi.upload as jest.Mock).mock.calls[0][1]).toBe((avatarApi.upload as jest.Mock).mock.calls[1][1]);
    expect((avatarApi.upload as jest.Mock).mock.calls[0][1]).toBe('{"v":1,"panX":0,"panY":0,"zoom":1}');
    expect(screen.getByTestId("other-surface").querySelector("img")).toHaveAttribute("src", avatar(id, 2).replace(/\.webp$/, ".poster.webp"));
    await select(); fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    expect(screen.queryByLabelText("Crop avatar position")).not.toBeInTheDocument();
    (avatarApi.remove as jest.Mock).mockImplementationOnce(async () => { mockUser.avatarUrl = null; return { userId: id, avatarUrl: null }; });
    fireEvent.click(screen.getByRole("button", { name: "Remove Avatar" })); await screen.findByText("Avatar removed.");
    expect(avatarApi.remove).toHaveBeenCalledTimes(1); expect(screen.getByTestId("other-surface").querySelector("img")).toBeNull(); expect(screen.queryByRole("button", { name: "Remove Avatar" })).not.toBeInTheDocument();
  });
  it("uncertain commit reconciles before retry; failed reconciliation requires Check", async () => {
    settings(); await tick(); await select();
    (avatarApi.upload as jest.Mock).mockRejectedValueOnce(new ApiError("Commit uncertain", 503, "AVATAR_COMMIT_UNCONFIRMED"));
    (avatarApi.metadata as jest.Mock).mockRejectedValueOnce(new ApiError("Unavailable", 503));
    fireEvent.click(screen.getByRole("button", { name: "Upload Avatar" })); await tick();
    await screen.findByRole("button", { name: "Check current avatar" }); expect(screen.queryByRole("button", { name: "Retry avatar change" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard" })); await select();
    expect(screen.getByRole("button", { name: "Upload Avatar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Check current avatar" })); await tick();
    expect(screen.getByRole("button", { name: "Upload Avatar" })).toBeEnabled();
  });
  it("advisory picker rejects unsupported/oversized input and differentiates preview failures", async () => {
    settings(); fireEvent.change(screen.getByLabelText("Choose avatar image"), { target: { files: [new File(["svg"], "x.svg", { type: "image/svg+xml" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a JPEG"); expect(mockCreateStaticAvatarPreview).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Choose avatar image"), { target: { files: [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })] } });
    expect(mockCreateStaticAvatarPreview).not.toHaveBeenCalled(); expect(avatarApi.upload).not.toHaveBeenCalled();
    mockCreateStaticAvatarPreview.mockRejectedValueOnce(new AvatarPreviewError("INVALID"));
    fireEvent.change(screen.getByLabelText("Choose avatar image"), { target: { files: [file()] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid or damaged");
    mockCreateStaticAvatarPreview.mockRejectedValueOnce(new AvatarPreviewError("TOO_COMPLEX"));
    fireEvent.change(screen.getByLabelText("Choose avatar image"), { target: { files: [file()] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("supported limits");
    mockCreateStaticAvatarPreview.mockRejectedValueOnce(new AvatarPreviewError("DECODE_FAILED"));
    fireEvent.change(screen.getByLabelText("Choose avatar image"), { target: { files: [file()] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("browser could not create a preview");
  });
  it("ignores stale preview completion and releases its generated URL", async () => {
    settings();
    let first!: (value: unknown) => void, second!: (value: unknown) => void;
    mockCreateStaticAvatarPreview
      .mockImplementationOnce(() => new Promise((resolve) => { first = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { second = resolve; }));
    const input = screen.getByLabelText("Choose avatar image");
    fireEvent.change(input, { target: { files: [file()] } });
    fireEvent.change(input, { target: { files: [new File(["new"], "new.png", { type: "image/png" })] } });
    await act(async () => { second({ url: "blob:new", width: 60, height: 90 }); });
    expect(document.querySelector(".avatar-crop-viewport img")).toHaveAttribute("src", "blob:new");
    await act(async () => { first({ url: "blob:stale", width: 90, height: 60 }); });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:stale");
    expect(document.querySelector(".avatar-crop-viewport img")).toHaveAttribute("src", "blob:new");
  });
  it("confirmation waiting cannot keep Settings locked indefinitely", async () => {
    const view = settings(); await tick(); jest.useFakeTimers();
    try {
      await select(); (avatarApi.upload as jest.Mock).mockRejectedValueOnce(new Error("Network interrupted"));
      (avatarApi.metadata as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));
      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Upload Avatar" })); });
      expect(screen.getByRole("button", { name: "Close settings" })).toBeDisabled();
      await act(async () => { await jest.advanceTimersByTimeAsync(20_000); });
      expect(screen.getByRole("button", { name: "Close settings" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Check current avatar" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Upload Avatar" })).toBeDisabled();
    } finally { view.unmount(); jest.useRealTimers(); }
  });
});

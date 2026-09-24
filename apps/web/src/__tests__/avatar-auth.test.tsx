import { act, renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth, type AuthUser } from "../hooks/useAuth";
import { userApi, authApi } from "../lib/api";

jest.mock("../lib/api", () => ({
  userApi: { me: jest.fn(), update: jest.fn() },
  authApi: { logout: jest.fn(), login: jest.fn() },
  accountSecurityApi: { changeEmail: jest.fn(), changePassword: jest.fn() },
  subscribeToAuthenticationInvalid: () => () => undefined,
  ApiError: class ApiError extends Error {},
}));
const user: AuthUser = { id: "11111111-1111-4111-8111-111111111111", username: "garden", displayName: "Garden", email: "garden@example.test", avatarUrl: null, bio: "Bio", passwordChangeRequired: false };
const avatar = `/api/v1/users/${user.id}/avatar/1788710000001-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
describe("avatar field-scoped auth merge", () => {
  beforeEach(() => { jest.clearAllMocks(); (userApi.me as jest.Mock).mockResolvedValue(user); });
  it("a late full profile response preserves a newer avatar and avatar invalidation preserves profile fields", async () => {
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let finish!: (value: AuthUser) => void;
    (userApi.update as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    let pending!: Promise<AuthUser>;
    act(() => { pending = result.current.updateProfile({ displayName: "New name", bio: "New bio" }); });
    act(() => result.current.mergeAvatar(user.id, avatar));
    await act(async () => { finish({ ...user, displayName: "New name", bio: "New bio" }); await pending; });
    expect(result.current.user).toEqual({ ...user, displayName: "New name", bio: "New bio", avatarUrl: avatar });
    expect((await pending).avatarUrl).toBe(avatar);
    act(() => result.current.mergeAvatar(user.id, null));
    expect(result.current.user).toEqual({ ...user, displayName: "New name", bio: "New bio" });
  });
  it("an old profile response cannot merge into a new session for the same account", async () => {
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let finish!: (value: AuthUser) => void;
    (userApi.update as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    let pending!: Promise<AuthUser>;
    act(() => { pending = result.current.updateProfile({ displayName: "Stale name" }); });
    await act(async () => { await result.current.logout(); });
    (authApi.login as jest.Mock).mockResolvedValueOnce({ user: { ...user, displayName: "New session" } });
    await act(async () => { await result.current.login("test", "test"); });
    await act(async () => { finish({ ...user, displayName: "Stale name" }); await pending; });
    expect(result.current.user?.displayName).toBe("New session");
  });
});

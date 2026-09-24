import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UserPreferencesProvider, useUserPreferences } from "../hooks/useUserPreferences";
import { THEME_LOCAL_STORAGE_KEY } from "../lib/theme";

const mockPreferenceGet = jest.fn();
const mockPreferenceUpdate = jest.fn();
let mockAuthUser: { id: string } | null = { id: "user-1" };

jest.mock("../lib/api", () => ({
  userPreferenceApi: {
    get: (...args: unknown[]) => mockPreferenceGet(...args),
    update: (...args: unknown[]) => mockPreferenceUpdate(...args),
  },
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

function PreferenceConsumer() {
  const {
    preferences, status, error, retry,
    mutationStatus, mutationError, updateShowSendButton, updateTheme, retryMutation,
  } = useUserPreferences();
  return <div>
    <span data-testid="preference-status">{status}</span>
    <span data-testid="mutation-status">{mutationStatus}</span>
    <span data-testid="show-send-button">{String(preferences.showSendButton)}</span>
    <span data-testid="theme">{preferences.theme}</span>
    {error && <span role="alert">{error}</span>}
    {mutationError && <span role="alert">{mutationError}</span>}
    <button type="button" onClick={retry}>Retry preferences</button>
    <button type="button" onClick={() => updateShowSendButton(true)}>Enable Send</button>
    <button type="button" onClick={() => updateShowSendButton(false)}>Disable Send</button>
    <button type="button" onClick={() => updateTheme("LIKECORD_DEFAULT")}>Use Likecord Default</button>
    <button type="button" onClick={() => updateTheme("LIKECORD_RETRO_98")}>Use Retro 98</button>
    <button type="button" onClick={retryMutation}>Retry mutation</button>
  </div>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("canonical authenticated user preference owner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthUser = { id: "user-1" };
    window.history.replaceState({}, "", "/channels/@me");
    window.localStorage.clear();
    document.documentElement.setAttribute("data-theme", "likecord-default");
    document.documentElement.style.colorScheme = "dark";
  });

  it("hydrates once for the authenticated account and preserves the false API default", async () => {
    mockPreferenceGet.mockResolvedValue({ showSendButton: false });
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);

    expect(screen.getByTestId("preference-status")).toHaveTextContent("loading");
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");
    expect(screen.getByTestId("theme")).toHaveTextContent("LIKECORD_DEFAULT");
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBe("LIKECORD_DEFAULT");
    expect(mockPreferenceGet).toHaveBeenCalledTimes(1);
    expect(mockPreferenceGet).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("does not churn the root identity when the bootstrap mirror and API already agree", async () => {
    window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, "LIKECORD_DEFAULT");
    mockPreferenceGet.mockResolvedValue({ showSendButton: false, theme: "LIKECORD_DEFAULT" });
    const setAttribute = jest.spyOn(document.documentElement, "setAttribute");

    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));

    expect(setAttribute).not.toHaveBeenCalled();
    expect(document.documentElement.style.colorScheme).toBe("dark");
    setAttribute.mockRestore();
  });

  it("exposes loading while hydration is pending", () => {
    mockPreferenceGet.mockReturnValue(new Promise(() => undefined));
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);

    expect(screen.getByTestId("preference-status")).toHaveTextContent("loading");
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");
  });

  it("fails safe to false and retries through the same owner", async () => {
    mockPreferenceGet.mockRejectedValueOnce(new Error("Preference service unavailable"))
      .mockResolvedValueOnce({ showSendButton: true });
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);

    expect(await screen.findByRole("alert")).toHaveTextContent("Preference service unavailable");
    expect(screen.getByTestId("preference-status")).toHaveTextContent("error");
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");

    fireEvent.click(screen.getByRole("button", { name: "Retry preferences" }));
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("true");
    expect(mockPreferenceGet).toHaveBeenCalledTimes(2);
  });

  it("persists both boolean directions and accepts each server response as authoritative", async () => {
    mockPreferenceGet.mockResolvedValue({ showSendButton: false });
    mockPreferenceUpdate
      .mockResolvedValueOnce({ showSendButton: true })
      .mockResolvedValueOnce({ showSendButton: false });
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "Enable Send" }));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("true");
    await waitFor(() => expect(screen.getByTestId("mutation-status")).toHaveTextContent("saved"));
    expect(mockPreferenceUpdate).toHaveBeenNthCalledWith(1, { showSendButton: true }, expect.any(AbortSignal));

    fireEvent.click(screen.getByRole("button", { name: "Disable Send" }));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");
    await waitFor(() => expect(mockPreferenceUpdate).toHaveBeenNthCalledWith(2, { showSendButton: false }, expect.any(AbortSignal)));
  });

  it("reconciles to a server response even when it differs from the optimistic intent", async () => {
    mockPreferenceGet.mockResolvedValue({ showSendButton: false });
    mockPreferenceUpdate.mockResolvedValue({ showSendButton: false });
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "Enable Send" }));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("true");
    await waitFor(() => expect(screen.getByTestId("mutation-status")).toHaveTextContent("saved"));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");
  });

  it("restores the last confirmed value on failure and retries the failed intent", async () => {
    mockPreferenceGet.mockResolvedValue({ showSendButton: false });
    mockPreferenceUpdate.mockRejectedValueOnce(new Error("Preference save failed"))
      .mockResolvedValueOnce({ showSendButton: true });
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "Enable Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Preference save failed");
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");

    fireEvent.click(screen.getByRole("button", { name: "Retry mutation" }));
    await waitFor(() => expect(screen.getByTestId("mutation-status")).toHaveTextContent("saved"));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("true");
    expect(mockPreferenceUpdate).toHaveBeenNthCalledWith(2, { showSendButton: true }, expect.any(AbortSignal));
  });

  it("serializes rapid changes so stale responses cannot overwrite the latest intent", async () => {
    const first = deferred<{ showSendButton: boolean }>();
    const second = deferred<{ showSendButton: boolean }>();
    mockPreferenceGet.mockResolvedValue({ showSendButton: false });
    mockPreferenceUpdate.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "Enable Send" }));
    fireEvent.click(screen.getByRole("button", { name: "Disable Send" }));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");
    await waitFor(() => expect(mockPreferenceUpdate).toHaveBeenCalledTimes(1));
    expect(mockPreferenceUpdate).toHaveBeenLastCalledWith({ showSendButton: true }, expect.any(AbortSignal));

    await act(async () => { first.resolve({ showSendButton: true }); await first.promise; });
    await waitFor(() => expect(mockPreferenceUpdate).toHaveBeenCalledTimes(2));
    expect(mockPreferenceUpdate).toHaveBeenLastCalledWith({ showSendButton: false }, expect.any(AbortSignal));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");

    await act(async () => { second.resolve({ showSendButton: false }); await second.promise; });
    await waitFor(() => expect(screen.getByTestId("mutation-status")).toHaveTextContent("saved"));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");
  });

  it("mirrors only the validated theme while another preference mutates", async () => {
    const storageWrite = jest.spyOn(Storage.prototype, "setItem");
    mockPreferenceGet.mockResolvedValue({ showSendButton: false });
    mockPreferenceUpdate.mockResolvedValue({ showSendButton: true });
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "Enable Send" }));
    await waitFor(() => expect(screen.getByTestId("mutation-status")).toHaveTextContent("saved"));
    expect(storageWrite).toHaveBeenCalledWith(THEME_LOCAL_STORAGE_KEY, "LIKECORD_DEFAULT");
    expect(window.localStorage).toHaveLength(1);
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBe("LIKECORD_DEFAULT");
    storageWrite.mockRestore();
  });

  it("normalizes an invalid API theme and overwrites the stale mirror with the server-safe value", async () => {
    window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, "UNKNOWN");
    mockPreferenceGet.mockResolvedValue({ showSendButton: false, theme: "UNKNOWN" });
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);

    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("theme")).toHaveTextContent("LIKECORD_DEFAULT");
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBe("LIKECORD_DEFAULT");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-default");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("applies Retro 98 optimistically to preference, root, UA scheme, and mirror, then accepts confirmation", async () => {
    const update = deferred<{ showSendButton: boolean; theme: "LIKECORD_RETRO_98" }>();
    mockPreferenceGet.mockResolvedValue({ showSendButton: false, theme: "LIKECORD_DEFAULT" });
    mockPreferenceUpdate.mockReturnValue(update.promise);
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "Use Retro 98" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("LIKECORD_RETRO_98");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-retro-98");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBe("LIKECORD_RETRO_98");
    await waitFor(() => expect(mockPreferenceUpdate).toHaveBeenCalledWith({ theme: "LIKECORD_RETRO_98" }, expect.any(AbortSignal)));

    await act(async () => {
      update.resolve({ showSendButton: false, theme: "LIKECORD_RETRO_98" });
      await update.promise;
    });
    await waitFor(() => expect(screen.getByTestId("mutation-status")).toHaveTextContent("saved"));
    expect(screen.getByTestId("theme")).toHaveTextContent("LIKECORD_RETRO_98");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-retro-98");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("switches Retro 98 to Default optimistically and reconciles a disagreeing server response", async () => {
    const update = deferred<{ showSendButton: boolean; theme: "LIKECORD_RETRO_98" }>();
    mockPreferenceGet.mockResolvedValue({ showSendButton: false, theme: "LIKECORD_RETRO_98" });
    mockPreferenceUpdate.mockReturnValue(update.promise);
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "Use Likecord Default" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("LIKECORD_DEFAULT");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-default");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBe("LIKECORD_DEFAULT");

    await act(async () => {
      update.resolve({ showSendButton: false, theme: "LIKECORD_RETRO_98" });
      await update.promise;
    });
    await waitFor(() => expect(screen.getByTestId("mutation-status")).toHaveTextContent("saved"));
    expect(screen.getByTestId("theme")).toHaveTextContent("LIKECORD_RETRO_98");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-retro-98");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBe("LIKECORD_RETRO_98");
  });

  it("rolls theme UI, root metadata, and mirror back together on mutation failure", async () => {
    const update = deferred<{ showSendButton: boolean; theme: "LIKECORD_RETRO_98" }>();
    mockPreferenceGet.mockResolvedValue({ showSendButton: false, theme: "LIKECORD_DEFAULT" });
    mockPreferenceUpdate.mockReturnValue(update.promise.then(() => { throw new Error("Theme save failed"); }));
    render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "Use Retro 98" }));
    expect(screen.getByTestId("theme")).toHaveTextContent("LIKECORD_RETRO_98");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-retro-98");
    expect(document.documentElement.style.colorScheme).toBe("light");
    await act(async () => {
      update.resolve({ showSendButton: false, theme: "LIKECORD_RETRO_98" });
      await update.promise;
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Theme save failed");
    expect(screen.getByTestId("theme")).toHaveTextContent("LIKECORD_DEFAULT");
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-default");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBe("LIKECORD_DEFAULT");
  });

  it("resets and clears the mirror before hydrating a different account, ignoring the old response", async () => {
    const first = deferred<{ showSendButton: boolean; theme: "LIKECORD_DEFAULT" }>();
    mockPreferenceGet.mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ showSendButton: false, theme: "LIKECORD_DEFAULT" });
    window.localStorage.setItem(THEME_LOCAL_STORAGE_KEY, "LIKECORD_DEFAULT");
    const view = render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);

    mockAuthUser = { id: "user-2" };
    view.rerender(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(mockPreferenceGet).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");

    await act(async () => {
      first.resolve({ showSendButton: true, theme: "LIKECORD_DEFAULT" });
      await first.promise;
    });
    expect(screen.getByTestId("show-send-button")).toHaveTextContent("false");
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBe("LIKECORD_DEFAULT");
  });

  it("clears the mirror and restores the default root when authentication becomes absent", async () => {
    mockPreferenceGet.mockResolvedValue({ showSendButton: false, theme: "LIKECORD_DEFAULT" });
    const view = render(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);
    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));
    document.documentElement.setAttribute("data-theme", "stale-theme");

    mockAuthUser = null;
    view.rerender(<UserPreferencesProvider><PreferenceConsumer /></UserPreferencesProvider>);

    await waitFor(() => expect(screen.getByTestId("preference-status")).toHaveTextContent("ready"));
    expect(window.localStorage.getItem(THEME_LOCAL_STORAGE_KEY)).toBeNull();
    expect(document.documentElement).toHaveAttribute("data-theme", "likecord-default");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});

import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AddServerModal from "../components/AddServerModal";
import { normalizeInviteInput } from "../lib/invite-normalizer";

const mockCreate = jest.fn();
const mockValidate = jest.fn();
const mockAccept = jest.fn();

jest.mock("../lib/api", () => ({
  serverApi: { create: (...args: unknown[]) => mockCreate(...args) },
  inviteApi: {
    validate: (...args: unknown[]) => mockValidate(...args),
    accept: (...args: unknown[]) => mockAccept(...args),
  },
}));

describe("canonical invite input normalization", () => {
  const origin = "https://likecord.example";

  it.each([
    ["abc_123-Z", "abc_123-Z"],
    [" /invite/abc_123-Z ", "abc_123-Z"],
    ["https://likecord.example/invite/abc_123-Z", "abc_123-Z"],
    ["https://likecord.example/invite/%61bc", "abc"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeInviteInput(input, origin)).toBe(expected);
  });

  it.each([
    "https://evil.example/invite/abc",
    "//likecord.example/invite/abc",
    "https://user:pass@likecord.example/invite/abc",
    "https://likecord.example:444/invite/abc",
    "https://likecord.example/invite/abc?code=other",
    "https://likecord.example/invite/abc#fragment",
    "https://likecord.example/invite/abc/extra",
    "/invite/abc?code=other",
    "/invite/abc#fragment",
    "/invite/abc/extra",
    "\\invite\\abc",
    "/invite/%2Fabc",
    "https:likecord.example/invite/abc",
    "a".repeat(17),
    "not valid",
  ])("rejects unsafe or malformed input %s", (input) => {
    expect(normalizeInviteInput(input, origin)).toBeNull();
  });
});

describe("Add a Server modal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with distinct choices, supports Back, X, Escape, and backdrop close", () => {
    const onClose = jest.fn();
    const { container, rerender } = render(<AddServerModal onClose={onClose} onComplete={jest.fn()} />);

    expect(screen.getByRole("heading", { name: "Add a Server" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("button", { name: /Create a Server/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Join a Server/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Server name")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Create a Server/ }));
    expect(screen.getByLabelText("Server name")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add a Server" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close Add a Server" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(container.querySelector(".modal-overlay")!);
    expect(onClose).toHaveBeenCalledTimes(3);

    rerender(<AddServerModal onClose={onClose} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Join a Server/ }));
    expect(screen.getByLabelText("Invite code or URL")).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.getByText("/invite/abc123")).toBeInTheDocument();
    expect(screen.getByText("https://staging.example.com/invite/abc123")).toBeInTheDocument();
  });

  it("validates Create, preserves failures, and completes once on success", async () => {
    const onComplete = jest.fn().mockResolvedValue(undefined);
    mockCreate.mockRejectedValueOnce(new Error("Creation unavailable")).mockResolvedValueOnce({ id: "s2", name: "Garden", ownerId: "u1" });
    render(<AddServerModal onClose={jest.fn()} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /Create a Server/ }));

    fireEvent.change(screen.getByLabelText("Server name"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Server" }));
    expect(screen.getByRole("alert")).toHaveTextContent("between 2 and 100");
    expect(screen.getByLabelText("Server name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Server name")).toHaveAttribute("aria-describedby", "add-server-create-error");
    expect(mockCreate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Server name"), { target: { value: "  Garden  " } });
    fireEvent.click(screen.getByRole("button", { name: "Create Server" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Creation unavailable");
    expect(screen.getByLabelText("Server name")).toHaveValue("  Garden  ");

    fireEvent.click(screen.getByRole("button", { name: "Create Server" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ id: "s2", name: "Garden", ownerId: "u1" }));
    expect(mockCreate).toHaveBeenLastCalledWith({ name: "Garden" });
  });

  it("shows NOT_MEMBER preview, preserves input on Back, and explicitly joins", async () => {
    const onComplete = jest.fn().mockResolvedValue(undefined);
    mockValidate.mockResolvedValue({ inviteStatus: "VALID", membershipStatus: "NOT_MEMBER", serverName: "Private Garden" });
    mockAccept.mockResolvedValue({ result: "JOINED", memberId: "m1", serverId: "s2", serverName: "Private Garden" });
    render(<AddServerModal onClose={jest.fn()} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /Join a Server/ }));
    fireEvent.change(screen.getByLabelText("Invite code or URL"), { target: { value: " /invite/abc_123 " } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Private Garden")).toBeInTheDocument();
    expect(mockValidate).toHaveBeenCalledWith("abc_123");
    expect(mockAccept).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Invite code or URL")).toHaveValue(" /invite/abc_123 ");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Join Server" }));
    expect(await screen.findByRole("button", { name: "Joining…" })).toBeDisabled();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ id: "s2", name: "Private Garden" }));
  });

  it("opens an ALREADY_MEMBER server without accepting the invite", async () => {
    const onComplete = jest.fn().mockResolvedValue(undefined);
    mockValidate.mockResolvedValue({ inviteStatus: "VALID", membershipStatus: "ALREADY_MEMBER", serverName: "Garden", serverId: "s2" });
    render(<AddServerModal onClose={jest.fn()} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole("button", { name: /Join a Server/ }));
    fireEvent.change(screen.getByLabelText("Invite code or URL"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open Server" }));

    expect(mockAccept).not.toHaveBeenCalled();
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ id: "s2", name: "Garden" }));
  });

  it("keeps unavailable and network failures safe, visible, and actionable", async () => {
    mockValidate.mockResolvedValueOnce({ inviteStatus: "UNAVAILABLE" }).mockRejectedValueOnce(new Error("Network unavailable"));
    const first = render(<AddServerModal onClose={jest.fn()} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Join a Server/ }));
    fireEvent.change(screen.getByLabelText("Invite code or URL"), { target: { value: "gone" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("This invite is unavailable. Ask for a new invite and try again.")).toBeInTheDocument();
    expect(screen.queryByText(/expired|revoked|exhausted|banned|deleted/i)).not.toBeInTheDocument();
    expect(mockAccept).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Join Server" })).not.toBeInTheDocument();
    first.unmount();

    render(<AddServerModal onClose={jest.fn()} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Join a Server/ }));
    fireEvent.change(screen.getByLabelText("Invite code or URL"), { target: { value: "retry_me" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    expect(screen.getByLabelText("Invite code or URL")).toHaveValue("retry_me");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

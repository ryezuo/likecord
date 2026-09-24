import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockSearchParams = new URLSearchParams();
let mockUser: { id: string } | null = null;
let mockAuthLoading = false;
const mockRegister = jest.fn();
const mockValidate = jest.fn();
const mockAccept = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ code: "abc123" }),
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockAuthLoading,
    register: mockRegister,
  }),
}));

jest.mock("../lib/api", () => ({
  inviteApi: {
    validate: (...args: unknown[]) => mockValidate(...args),
    accept: (...args: unknown[]) => mockAccept(...args),
  },
}));

describe("canonical invite entry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockUser = null;
    mockAuthLoading = false;
  });

  it("renders the anonymous allowlisted preview and safe auth return links", async () => {
    mockValidate.mockResolvedValue({
      inviteStatus: "VALID",
      membershipStatus: "UNAUTHENTICATED",
      serverName: "Private Garden",
    });
    const InvitePage = (await import("../app/invite/[code]/page")).default;
    const { container } = render(<InvitePage />);

    expect(await screen.findByText("Private Garden")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Invitation" })).toBeInTheDocument();
    expect(container.querySelector(".auth-brand-mark")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[style]")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/?returnTo=%2Finvite%2Fabc123");
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "href",
      "/register?code=abc123&returnTo=%2Finvite%2Fabc123",
    );
    expect(mockAccept).not.toHaveBeenCalled();
  });

  it("exposes invite loading as a status without changing validation timing", async () => {
    mockValidate.mockImplementation(() => new Promise(() => {}));
    const InvitePage = (await import("../app/invite/[code]/page")).default;
    render(<InvitePage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading invite...");
  });

  it("requires explicit acceptance and navigates through the canonical server route", async () => {
    mockUser = { id: "user-1" };
    mockValidate.mockResolvedValue({
      inviteStatus: "VALID",
      membershipStatus: "NOT_MEMBER",
      serverName: "Private Garden",
    });
    let resolveAccept!: (value: { result: "JOINED"; memberId: string; serverId: string; serverName: string }) => void;
    mockAccept.mockImplementation(() => new Promise((resolve) => { resolveAccept = resolve; }));
    const InvitePage = (await import("../app/invite/[code]/page")).default;
    render(<InvitePage />);

    const accept = await screen.findByRole("button", { name: "Accept Invite" });
    expect(mockAccept).not.toHaveBeenCalled();
    fireEvent.click(accept);
    const pending = await screen.findByRole("button", { name: "Joining..." });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");
    resolveAccept({ result: "JOINED", memberId: "member-1", serverId: "server-1", serverName: "Private Garden" });
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/channels/server-1"));
  });

  it("shows Already a member and opens without calling Accept", async () => {
    mockUser = { id: "user-1" };
    mockValidate.mockResolvedValue({
      inviteStatus: "VALID",
      membershipStatus: "ALREADY_MEMBER",
      serverName: "Private Garden",
      serverId: "server-1",
    });
    const InvitePage = (await import("../app/invite/[code]/page")).default;
    render(<InvitePage />);

    expect(await screen.findByText("Already a member")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept Invite" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Server" }));
    expect(mockAccept).not.toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/channels/server-1");
  });

  it("keeps retained membership actionable and generic unavailable invites private", async () => {
    mockUser = { id: "user-1" };
    mockValidate.mockResolvedValueOnce({
      inviteStatus: "UNAVAILABLE",
      membershipStatus: "ALREADY_MEMBER",
      serverName: "Private Garden",
      serverId: "server-1",
    });
    const InvitePage = (await import("../app/invite/[code]/page")).default;
    const retained = render(<InvitePage />);
    expect(await screen.findByText(/invite is unavailable, but/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Server" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Server" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/channels/server-1");
    expect(mockAccept).not.toHaveBeenCalled();
    retained.unmount();

    mockValidate.mockResolvedValueOnce({ inviteStatus: "UNAVAILABLE" });
    render(<InvitePage />);
    expect(await screen.findByText("This invite is unavailable. Ask for a new invite and try again.")).toBeInTheDocument();
    expect(screen.queryByText("Private Garden")).not.toBeInTheDocument();
    expect(screen.queryByText(/expired|revoked|exhausted|banned|deleted/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept Invite" })).not.toBeInTheDocument();
  });

  it("F7.3 W4 keeps operational preview failures distinct from an unavailable invite", async () => {
    mockValidate.mockRejectedValueOnce(new Error("Unable to load invite"));
    const InvitePage = (await import("../app/invite/[code]/page")).default;
    render(<InvitePage />);
    expect(await screen.findByText("Unable to load invite")).toBeInTheDocument();
    expect(screen.queryByText(/Ask for a new invite/)).not.toBeInTheDocument();
    expect(mockAccept).not.toHaveBeenCalled();
  });

  it("keeps accept failures on the invite page", async () => {
    mockUser = { id: "user-1" };
    mockValidate.mockResolvedValue({
      inviteStatus: "VALID",
      membershipStatus: "NOT_MEMBER",
      serverName: "Private Garden",
    });
    mockAccept.mockRejectedValue(new Error("Invite expired"));
    const InvitePage = (await import("../app/invite/[code]/page")).default;
    render(<InvitePage />);
    fireEvent.click(await screen.findByRole("button", { name: "Accept Invite" }));
    expect(await screen.findByText("Invite expired")).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

describe("registration return to invite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = null;
    mockSearchParams = new URLSearchParams({ code: "abc123", returnTo: "/invite/abc123" });
    mockValidate.mockResolvedValue({
      inviteStatus: "VALID",
      membershipStatus: "UNAUTHENTICATED",
      serverName: "Private Garden",
    });
    mockRegister.mockResolvedValue(undefined);
  });

  it("registers the account, safely returns to the invite, and never auto-accepts", async () => {
    const RegisterPage = (await import("../app/register/page")).default;
    const { container } = render(<RegisterPage />);
    await waitFor(() => expect(mockValidate).toHaveBeenCalledWith("abc123"));
    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(container.querySelector(".auth-brand-mark")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByLabelText("Invite Code")).toHaveAttribute("id", "invite-code");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@invite.test" } });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "new_user" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password-9" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith("new@invite.test", "new_user", "password-9", "abc123"));
    expect(mockRouter.push).toHaveBeenCalledWith("/invite/abc123");
    expect(mockAccept).not.toHaveBeenCalled();
  });
});

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AuthGate from "../components/AuthGate";

let mockPathname = "/channels/s1/c1";
let mockAuth = { user: null as null | { id: string }, loading: true };
const mockRouter = { replace: jest.fn() };

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => mockRouter,
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => mockAuth,
}));

describe("AuthGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/channels/s1/c1";
    mockAuth = { user: null, loading: true };
  });

  it("keeps a truthful branded status visible while authentication resolves", () => {
    render(<AuthGate><div>Private workspace</div></AuthGate>);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Starting Likecord…");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Private workspace")).not.toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("preserves the protected deep-link redirect while presenting its transition", async () => {
    mockAuth = { user: null, loading: false };
    render(<AuthGate><div>Private workspace</div></AuthGate>);

    expect(screen.getByRole("status")).toHaveTextContent("Opening sign in…");
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/?returnTo=%2Fchannels%2Fs1%2Fc1"));
    expect(screen.queryByText("Private workspace")).not.toBeInTheDocument();
  });

  it("renders authenticated content without an intermediate system state", () => {
    mockAuth = { user: { id: "u1" }, loading: false };
    render(<AuthGate><div>Private workspace</div></AuthGate>);

    expect(screen.getByText("Private workspace")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

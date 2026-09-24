import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "../components/layout/Home";
import { navigationApi } from "../lib/api";

jest.mock("../lib/api", () => ({ navigationApi: { continue: jest.fn() } }));
const lookup = navigationApi.continue as jest.Mock;
const destination = { serverId: "s2", serverName: "Garden", channelId: "c2", channelName: "general" };
const props = {
  displayName: "Alex",
  servers: [{ id: "s2", name: "Garden" }, { id: "s1", name: "Workshop" }],
  serversStatus: "ready" as const,
  refreshKey: "0",
  onRetryServers: jest.fn(),
  onAddServer: jest.fn(),
  onNavigate: jest.fn(),
};

beforeEach(() => {
  jest.resetAllMocks();
  lookup.mockResolvedValue({ destination: null });
});

it("renders welcome, server order and explicit server/Add Server actions without auto-navigation", async () => {
  render(<Home {...props} />);
  expect(screen.getByRole("heading", { name: "Welcome back, Alex" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Your servers" })).toBeInTheDocument();
  const items = within(screen.getByRole("list")).getAllByRole("button");
  expect(items.map((item) => item.getAttribute("aria-label"))).toEqual(["Open Garden", "Open Workshop"]);
  await waitFor(() => expect(screen.queryByText("Finding where you left off…")).not.toBeInTheDocument());
  expect(props.onNavigate).not.toHaveBeenCalled();
  fireEvent.click(items[1]);
  expect(props.onNavigate).toHaveBeenCalledWith("/channels/s1");
  fireEvent.click(screen.getByRole("button", { name: "Add a Server" }));
  expect(props.onAddServer).toHaveBeenCalledTimes(1);
});

it("keeps servers and Add Server usable while Continue loads", () => {
  lookup.mockReturnValue(new Promise(() => {}));
  render(<Home {...props} />);
  expect(screen.getByRole("status")).toHaveTextContent("Finding where you left off…");
  expect(screen.getByRole("button", { name: "Open Garden" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Add a Server" })).toBeEnabled();
});

it("renders only returned server/channel labels and navigates on explicit Continue", async () => {
  lookup.mockResolvedValue({ destination });
  render(<Home {...props} />);
  const button = await screen.findByRole("button", { name: "Continue where you left off Garden #general" });
  expect(props.onNavigate).not.toHaveBeenCalled();
  fireEvent.click(button);
  expect(props.onNavigate).toHaveBeenCalledTimes(1);
  expect(props.onNavigate).toHaveBeenCalledWith("/channels/s2/c2");
});

it("omits Continue when no durable destination exists", async () => {
  render(<Home {...props} />);
  await waitFor(() => expect(screen.queryByText("Finding where you left off…")).not.toBeInTheDocument());
  expect(screen.queryByRole("button", { name: /Continue/ })).not.toBeInTheDocument();
  expect(props.onNavigate).not.toHaveBeenCalled();
});

it("offers a bounded Continue retry without blocking servers or Add Server", async () => {
  lookup.mockRejectedValueOnce(new Error("temporary failure")).mockResolvedValueOnce({ destination });
  render(<Home {...props} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your saved destination.");
  fireEvent.click(screen.getByRole("button", { name: "Open Workshop" }));
  expect(props.onNavigate).toHaveBeenCalledWith("/channels/s1");
  fireEvent.click(screen.getByRole("button", { name: "Add a Server" }));
  expect(props.onAddServer).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Retry Continue" }));
  expect(await screen.findByRole("button", { name: /Continue where you left off/ })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("distinguishes server loading, failure and successful empty state", async () => {
  const view = render(<Home {...props} servers={[]} serversStatus="loading" />);
  expect(screen.getByText("Loading your servers…")).toHaveAttribute("role", "status");
  expect(screen.queryByText("You have not joined any servers yet.")).not.toBeInTheDocument();
  view.rerender(<Home {...props} servers={[]} serversStatus="error" />);
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load your servers.");
  expect(screen.queryByText("You have not joined any servers yet.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry servers" }));
  expect(props.onRetryServers).toHaveBeenCalledTimes(1);
  view.rerender(<Home {...props} servers={[]} />);
  expect(screen.getByText("You have not joined any servers yet.")).toBeInTheDocument();
  expect(screen.getByText("Use Add a Server to create one or join with an invite.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add a Server" })).toBeEnabled();
  await waitFor(() => expect(screen.queryByText("Finding where you left off…")).not.toBeInTheDocument());
});

it("supports keyboard traversal and Enter/Space for Continue and server buttons", async () => {
  lookup.mockResolvedValue({ destination });
  const keyboard = userEvent.setup();
  render(<Home {...props} />);
  const button = await screen.findByRole("button", { name: /Continue where you left off/ });
  await keyboard.tab();
  expect(screen.getByRole("button", { name: "Add a Server" })).toHaveFocus();
  await keyboard.tab();
  expect(button).toHaveFocus();
  await keyboard.keyboard("{Enter}");
  expect(props.onNavigate).toHaveBeenLastCalledWith("/channels/s2/c2");
  await keyboard.tab();
  expect(screen.getByRole("button", { name: "Open Garden" })).toHaveFocus();
  await keyboard.keyboard(" ");
  expect(props.onNavigate).toHaveBeenLastCalledWith("/channels/s2");
});

it("clears visible labels on invalidation and ignores the older pending response", async () => {
  let finishOld!: (value: unknown) => void;
  lookup.mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }))
    .mockResolvedValueOnce({ destination }).mockResolvedValueOnce({ destination: null });
  const view = render(<Home {...props} />);
  const oldSignal = lookup.mock.calls[0][0] as AbortSignal;
  view.rerender(<Home {...props} refreshKey="1" />);
  expect(oldSignal.aborted).toBe(true);
  await screen.findByRole("button", { name: /Continue where you left off/ });
  view.rerender(<Home {...props} refreshKey="2" />);
  expect(screen.queryByRole("button", { name: /Continue where you left off/ })).not.toBeInTheDocument();
  await act(async () => finishOld({ destination: { ...destination, serverName: "Old private server" } }));
  expect(screen.queryByText(/Old private server/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Continue where you left off/ })).not.toBeInTheDocument();
});

it.each(["resolve", "reject"])("aborts on unmount and ignores a late %s even when transport ignores abort", async (outcome) => {
  let finish!: (value: unknown) => void;
  lookup.mockReturnValue(new Promise((resolve, reject) => { finish = outcome === "resolve" ? resolve : reject; }));
  const view = render(<Home {...props} />);
  const signal = lookup.mock.calls[0][0] as AbortSignal;
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => finish(outcome === "resolve" ? { destination } : new Error("late")));
  expect(screen.queryByText(/Continue where you left off/)).not.toBeInTheDocument();
});

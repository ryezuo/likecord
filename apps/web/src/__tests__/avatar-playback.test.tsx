import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import UserAvatar from "../components/ui/UserAvatar";

const id = "11111111-1111-4111-8111-111111111111";
const url = `/api/v1/users/${id}/avatar/1788710000001-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp`;
const poster = url.replace(".webp", ".poster.webp");
let notifyMotion: () => void;
let intersect: IntersectionObserverCallback;
let focused = true, reduced = false, visible = true;
const observe = jest.fn(), unobserve = jest.fn(), disconnect = jest.fn();
const recover = jest.fn(async () => true);
jest.mock("../hooks/useAvatars", () => ({ useAvatar: () => ({ url, store: { recoverImage: recover } }) }));

describe("AV2.2 poster-default playback", () => {
  beforeEach(() => {
    focused = true; reduced = false; visible = true; jest.clearAllMocks();
    jest.spyOn(document, "hasFocus").mockImplementation(() => focused);
    jest.spyOn(document, "visibilityState", "get").mockImplementation(() => visible ? "visible" : "hidden");
    window.matchMedia = jest.fn(() => ({ get matches() { return reduced; }, addEventListener: (_event: string, callback: () => void) => { notifyMotion = callback; }, removeEventListener: jest.fn() })) as unknown as typeof matchMedia;
    global.IntersectionObserver = jest.fn((callback) => { intersect = callback; return { observe, unobserve, disconnect }; }) as unknown as typeof IntersectionObserver;
  });
  afterEach(() => jest.restoreAllMocks());
  const onscreen = (root: Element, value = true) => act(() => intersect([{ target: root, isIntersecting: value, intersectionRatio: value ? 1 : 0 } as IntersectionObserverEntry], {} as IntersectionObserver));
  it("requires avatar interaction, intersection and all global gates; row hover and focus recovery alone do nothing", () => {
    const view = render(<div data-testid="row"><UserAvatar userId={id} name="Alice" interactive /></div>);
    const avatar = view.container.querySelector(".user-avatar-content")!;
    const src = () => view.container.querySelector("img")!.getAttribute("src");
    expect(src()).toBe(poster); fireEvent.mouseEnter(avatar); expect(src()).toBe(poster);
    onscreen(avatar); expect(src()).toBe(url);
    fireEvent.mouseLeave(avatar); fireEvent.mouseEnter(view.getByTestId("row")); expect(src()).toBe(poster);
    fireEvent.focus(avatar); expect(src()).toBe(url);
    focused = false; fireEvent.blur(window); expect(src()).toBe(poster);
    focused = true; fireEvent.focus(window); expect(src()).toBe(url);
    visible = false; fireEvent(document, new Event("visibilitychange")); expect(src()).toBe(poster);
    visible = true; fireEvent(document, new Event("visibilitychange")); expect(src()).toBe(url);
    reduced = true; act(() => notifyMotion()); expect(src()).toBe(poster);
    reduced = false; act(() => notifyMotion()); expect(src()).toBe(url);
    onscreen(avatar, false); expect(src()).toBe(poster);
    fireEvent.blur(avatar); onscreen(avatar); expect(src()).toBe(poster);
    fireEvent.focus(window); expect(src()).toBe(poster);
    expect(recover).not.toHaveBeenCalled();
  });
  it("reduced motion prevents even the first animated mount for speaking/open context", () => {
    reduced = true;
    const view = render(<UserAvatar userId={id} name="Alice" interactive speaking contextOpen />);
    const avatar = view.container.querySelector(".user-avatar-content")!; onscreen(avatar); fireEvent.mouseEnter(avatar); fireEvent.focus(avatar);
    expect(view.container.querySelector("img")).toHaveAttribute("src", poster);
  });
  it("speaking and intentional open context independently trigger playback; ending activity restores poster", () => {
    const view = render(<UserAvatar userId={id} name="Alice" />);
    const avatar = view.container.querySelector(".user-avatar-content")!; onscreen(avatar);
    expect(view.container.querySelector("img")).toHaveAttribute("src", poster);
    view.rerender(<UserAvatar userId={id} name="Alice" speaking />); expect(view.container.querySelector("img")).toHaveAttribute("src", url);
    view.rerender(<UserAvatar userId={id} name="Alice" />); expect(view.container.querySelector("img")).toHaveAttribute("src", poster);
    view.rerender(<UserAvatar userId={id} name="Alice" contextOpen />); expect(view.container.querySelector("img")).toHaveAttribute("src", url);
    view.rerender(<UserAvatar userId={id} name="Alice" />); expect(view.container.querySelector("img")).toHaveAttribute("src", poster);
  });
  it("shares one intersection owner and releases it when the last avatar unmounts", () => {
    const view = render(<><UserAvatar userId={id} /><UserAvatar userId={id} /></>);
    expect(IntersectionObserver).toHaveBeenCalledTimes(1); expect(observe).toHaveBeenCalledTimes(2);
    view.unmount(); expect(unobserve).toHaveBeenCalledTimes(2); expect(disconnect).toHaveBeenCalledTimes(1);
  });
  it("poster failure has one canonical recovery and never loads main in poster-only mode", async () => {
    const view = render(<UserAvatar userId={id} name="Alice" interactive />);
    await act(async () => { fireEvent.error(view.container.querySelector("img")!); });
    expect(recover).toHaveBeenCalledWith(id, url); expect(recover).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector("img")).toHaveAttribute("src", poster);
    await act(async () => { fireEvent.error(view.container.querySelector("img")!); });
    expect(view.container.querySelector("img")).toBeNull(); expect(recover).toHaveBeenCalledTimes(1);
  });
});

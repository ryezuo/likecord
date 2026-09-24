import "@testing-library/jest-dom";
import React, { useRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContextMenu, { type ContextMenuItem } from "../components/ui/ContextMenu";

function MenuHarness({ items, position = { x: 20, y: 20 }, onClose = () => {} }: {
  items: ContextMenuItem[];
  position?: { x: number; y: number };
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <div>
    <button ref={triggerRef} onClick={() => setOpen(true)}>Open menu</button>
    <button>Next control</button>
    {open && <ContextMenu items={items} position={position} returnFocusTo={triggerRef.current}
      onClose={() => { onClose(); setOpen(false); }} ariaLabel="Test actions" />}
  </div>;
}

describe("shared ContextMenu accessibility", () => {
  afterEach(() => jest.restoreAllMocks());

  it("skips labels, separators and disabled actions; arrows stop at the ends", async () => {
    const interaction = userEvent.setup();
    render(<MenuHarness items={[
      { type: "label", label: "Target identity", emphasis: true },
      { label: "Unavailable", disabled: true, onClick: jest.fn() },
      { label: "First", onClick: jest.fn() },
      { label: "", divider: true, onClick: jest.fn() },
      { type: "label", label: "Roles" },
      { label: "Assigned", checked: true, onClick: jest.fn() },
      { label: "Unassigned", checked: false, onClick: jest.fn() },
    ]} />);
    await interaction.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Target identity" })).not.toBeInTheDocument();
    await interaction.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus();
    await interaction.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitemcheckbox", { name: "Assigned", checked: true })).toHaveFocus();
    await interaction.keyboard("{End}{ArrowDown}");
    expect(screen.getByRole("menuitemcheckbox", { name: "Unassigned", checked: false })).toHaveFocus();
    await interaction.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus();
    await interaction.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it.each(["{Enter}", " "])("activates an action once with %s and restores the trigger", async (key) => {
    const interaction = userEvent.setup();
    const action = jest.fn();
    const close = jest.fn();
    render(<MenuHarness items={[{ label: "Action", onClick: action }]} onClose={close} />);
    await interaction.click(screen.getByRole("button", { name: "Open menu" }));
    await interaction.keyboard(key);
    expect(action).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("retains click modifiers and restores focus before handing off to an action", async () => {
    const interaction = userEvent.setup();
    const action = jest.fn((event: React.MouseEvent) => {
      expect(event.shiftKey).toBe(true);
      expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
      screen.getByRole("button", { name: "Next control" }).focus();
    });
    render(<MenuHarness items={[{ label: "Delete", danger: true, onClick: action }]} />);
    await interaction.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }), { shiftKey: true });
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Next control" })).toHaveFocus();
  });

  it("dismisses outside without stealing focus from the clicked control", async () => {
    const interaction = userEvent.setup();
    render(<MenuHarness items={[{ label: "Action", onClick: jest.fn() }]} />);
    await interaction.click(screen.getByRole("button", { name: "Open menu" }));
    await interaction.click(screen.getByRole("button", { name: "Next control" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next control" })).toHaveFocus();
  });

  it.each([false, true])("exits on Tab (shift=%s), then resumes page traversal", async (shift) => {
    const interaction = userEvent.setup();
    render(<MenuHarness items={[{ label: "Action", onClick: jest.fn() }]} />);
    await interaction.click(screen.getByRole("button", { name: "Open menu" }));
    await interaction.tab({ shift });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
    await interaction.tab();
    expect(screen.getByRole("button", { name: "Next control" })).toHaveFocus();
  });

  it("returns to the trigger after an outside click on blank space", async () => {
    const interaction = userEvent.setup();
    render(<MenuHarness items={[{ label: "Action", onClick: jest.fn() }]} />);
    await interaction.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("keeps internal scrolling open but closes on external scroll or resize", async () => {
    const interaction = userEvent.setup();
    const close = jest.fn();
    render(<MenuHarness items={[{ label: "Action", onClick: jest.fn() }]} onClose={close} />);
    const trigger = screen.getByRole("button", { name: "Open menu" });
    await interaction.click(trigger);
    fireEvent.scroll(screen.getByRole("menu"));
    expect(close).not.toHaveBeenCalled();
    fireEvent.scroll(document);
    expect(close).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
    await interaction.click(trigger);
    fireEvent(window, new Event("resize"));
    expect(close).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("clamps measured bounds into the viewport and updates for changed contents", async () => {
    const interaction = userEvent.setup();
    let width = 220;
    let height = 140;
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON: () => ({}) };
    });
    const position = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    const view = render(<MenuHarness position={position} items={[{ label: "First", onClick: jest.fn() }]} />);
    await interaction.click(screen.getByRole("button", { name: "Open menu" }));
    const expectContained = () => {
      const menu = screen.getByRole("menu");
      const left = parseFloat(menu.style.left);
      const top = parseFloat(menu.style.top);
      expect(left).toBeGreaterThanOrEqual(8);
      expect(top).toBeGreaterThanOrEqual(8);
      expect(left + width).toBeLessThanOrEqual(window.innerWidth - 8);
      expect(top + height).toBeLessThanOrEqual(window.innerHeight - 8);
    };
    expectContained();
    width = 300;
    height = 400;
    view.rerender(<MenuHarness position={position} items={[{ label: "Longer roles list", onClick: jest.fn() }]} />);
    expectContained();
  });

  it("uses a surviving fallback when the original trigger was removed", () => {
    const trigger = document.createElement("button");
    const fallback = document.createElement("button");
    document.body.append(trigger, fallback);
    const view = render(<ContextMenu items={[{ label: "Action", onClick: jest.fn() }]} position={{ x: 10, y: 10 }}
      returnFocusTo={trigger} fallbackFocusTo={fallback} onClose={jest.fn()} />);
    trigger.remove();
    act(() => view.unmount());
    expect(fallback).toHaveFocus();
    fallback.remove();
  });
});

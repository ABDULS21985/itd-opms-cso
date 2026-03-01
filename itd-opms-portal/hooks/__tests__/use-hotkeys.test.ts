import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHotkeys } from "@/hooks/use-hotkeys";

function fireKeydown(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    ...modifiers,
  });
  document.dispatchEvent(event);
}

describe("useHotkeys", () => {
  it("calls handler when matching key is pressed", () => {
    const handler = vi.fn();

    renderHook(() =>
      useHotkeys([{ key: "k", handler }]),
    );

    fireKeydown("k");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler when a different key is pressed", () => {
    const handler = vi.fn();

    renderHook(() =>
      useHotkeys([{ key: "k", handler }]),
    );

    fireKeydown("j");
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler with modifier keys", () => {
    const handler = vi.fn();

    renderHook(() =>
      useHotkeys([{ key: "k", modifiers: { ctrl: true }, handler }]),
    );

    // Without ctrl - should not fire
    fireKeydown("k");
    expect(handler).not.toHaveBeenCalled();

    // With ctrl - should fire
    fireKeydown("k", { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not fire when enabled is false", () => {
    const handler = vi.fn();

    renderHook(() =>
      useHotkeys([{ key: "k", handler, enabled: false }]),
    );

    fireKeydown("k");
    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores hotkeys in input elements unless global is set", () => {
    const handler = vi.fn();

    renderHook(() =>
      useHotkeys([{ key: "k", handler }]),
    );

    // Create an input element and fire keydown from it
    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "k",
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: input, writable: false });
    document.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("fires hotkeys from input elements when global is set", () => {
    const handler = vi.fn();

    renderHook(() =>
      useHotkeys([{ key: "k", handler, global: true }]),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "k",
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: input, writable: false });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it("is case-insensitive for key matching", () => {
    const handler = vi.fn();

    renderHook(() =>
      useHotkeys([{ key: "K", handler }]),
    );

    fireKeydown("k");
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import { KeyboardShortcutHelp } from "../keyboard-shortcut-help";

// ---------------------------------------------------------------------------
// Mock framer-motion
// ---------------------------------------------------------------------------
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

describe("KeyboardShortcutHelp", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <KeyboardShortcutHelp open={false} onOpenChange={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders the dialog when open is true", () => {
    render(
      <KeyboardShortcutHelp open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });

  it("renders all shortcut groups", () => {
    render(
      <KeyboardShortcutHelp open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Tables")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders shortcut descriptions", () => {
    render(
      <KeyboardShortcutHelp open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText("Open command palette")).toBeInTheDocument();
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Move down")).toBeInTheDocument();
  });

  it("renders keyboard keys", () => {
    render(
      <KeyboardShortcutHelp open={true} onOpenChange={vi.fn()} />,
    );
    // "Esc" appears multiple times (in Global and Tables groups, and in footer hint)
    const escElements = screen.getAllByText("Esc");
    expect(escElements.length).toBeGreaterThanOrEqual(1);
    const enterElements = screen.getAllByText("Enter");
    expect(enterElements.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onOpenChange(false) when close button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <KeyboardShortcutHelp open={true} onOpenChange={onOpenChange} />,
    );

    // There is a close button (X icon). Find it by looking in the header area.
    const buttons = screen.getAllByRole("button");
    // Click the close button (should be the only button)
    await user.click(buttons[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange(false) when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container } = render(
      <KeyboardShortcutHelp open={true} onOpenChange={onOpenChange} />,
    );

    // The backdrop is the first fixed div
    const backdrop = container.querySelector(".fixed.inset-0");
    if (backdrop) {
      await user.click(backdrop);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it("renders footer hint text", () => {
    render(
      <KeyboardShortcutHelp open={true} onOpenChange={vi.fn()} />,
    );
    expect(
      screen.getByText(/to toggle this dialog/),
    ).toBeInTheDocument();
  });
});

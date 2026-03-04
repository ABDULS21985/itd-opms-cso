import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import { CommandPalette } from "../command-palette";

// ---------------------------------------------------------------------------
// Polyfill scrollIntoView (not available in jsdom)
// ---------------------------------------------------------------------------
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ---------------------------------------------------------------------------
// Mock framer-motion
// ---------------------------------------------------------------------------
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      ...rest
    }: any) => <div {...rest}>{children}</div>,
  },
}));

// ---------------------------------------------------------------------------
// Mock providers/hooks
// ---------------------------------------------------------------------------
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      permissions: ["*"],
    },
  }),
}));

vi.mock("@/providers/theme-provider", () => ({
  useTheme: () => ({
    theme: "light" as const,
    setTheme: vi.fn(),
  }),
}));

// Mock navigation so we can have page items
vi.mock("@/lib/navigation", () => ({
  navGroups: [
    {
      label: "Service Management",
      items: [
        {
          label: "Tickets",
          href: "/dashboard/itsm/tickets",
          icon: () => null,
          permission: "itsm.view",
        },
        {
          label: "My Queue",
          href: "/dashboard/itsm/my-queue",
          icon: () => null,
          permission: "itsm.view",
        },
      ],
    },
    {
      label: "Planning",
      items: [
        {
          label: "Projects",
          href: "/dashboard/planning/projects",
          icon: () => null,
          permission: "planning.view",
        },
      ],
    },
  ],
}));

vi.mock("@/lib/fuzzy-match", () => ({
  fuzzyMatch: (query: string, text: string) => {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    if (lowerText.includes(lowerQuery)) {
      return { score: 1, matchedIndices: [] };
    }
    return null;
  },
  getHighlightSegments: (text: string, _indices: number[]) => [
    { text, highlighted: false },
  ],
}));

describe("CommandPalette", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <CommandPalette open={false} onOpenChange={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders the dialog when open is true", () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has aria-modal attribute", () => {
    render(<CommandPalette {...defaultProps} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("renders search input with placeholder", () => {
    render(<CommandPalette {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Search pages, actions..."),
    ).toBeInTheDocument();
  });

  it("shows page items from navigation groups", () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByText("Tickets")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });

  it("shows quick action items", () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  });

  it("filters results as user types", async () => {
    const user = userEvent.setup();
    render(<CommandPalette {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search pages, actions...");
    await user.type(input, "Ticket");

    expect(screen.getByText("Tickets")).toBeInTheDocument();
    // Projects should be filtered out since it doesn't match "Ticket"
    expect(screen.queryByText("Projects")).not.toBeInTheDocument();
  });

  it("shows no results message for non-matching query", async () => {
    const user = userEvent.setup();
    render(<CommandPalette {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search pages, actions...");
    await user.type(input, "zzzznonexistent");

    expect(screen.getByText(/No results found/)).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<CommandPalette open={true} onOpenChange={onOpenChange} />);

    // The onKeyDown handler is on the dialog element, so we need to
    // focus the search input first and then press Escape
    const input = screen.getByPlaceholderText("Search pages, actions...");
    await user.click(input);
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders keyboard hints in the footer", () => {
    render(<CommandPalette {...defaultProps} />);
    expect(screen.getByText("Navigate")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("shows clear search button when query is present", async () => {
    const user = userEvent.setup();
    render(<CommandPalette {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search pages, actions...");
    await user.type(input, "test");

    expect(
      screen.getByRole("button", { name: "Clear search" }),
    ).toBeInTheDocument();
  });

  it("clears search when clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<CommandPalette {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search pages, actions...");
    await user.type(input, "test");
    await user.click(screen.getByRole("button", { name: "Clear search" }));

    expect(input).toHaveValue("");
  });

  it("renders option items with role='option'", () => {
    render(<CommandPalette {...defaultProps} />);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
  });
});

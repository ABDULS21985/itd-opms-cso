import type { PropsWithChildren, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";

vi.mock("framer-motion", () => {
  const React = require("react");
  const motion = new Proxy(
    {},
    {
      get:
        (_target: unknown, prop: string) =>
        ({ children, ...rest }: Record<string, unknown>) => {
          const {
            initial,
            animate,
            exit,
            transition,
            layout,
            layoutId,
            whileHover,
            whileTap,
            whileFocus,
            variants,
            ...safeRest
          } = rest;
          return React.createElement(prop, safeRest, children);
        },
    },
  );

  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: PropsWithChildren<{ href: string }> & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockUseMeetings = vi.fn();
const mockUseActionItems = vi.fn();
const mockUseCompleteAction = vi.fn();

vi.mock("@/hooks/use-governance", () => ({
  useMeetings: (...args: unknown[]) => mockUseMeetings(...args),
  useActionItems: (...args: unknown[]) => mockUseActionItems(...args),
  useCompleteAction: (...args: unknown[]) => mockUseCompleteAction(...args),
}));

vi.mock("@/lib/utils", () => ({
  formatDate: (date: string) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-US");
  },
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/components/shared/data-table", () => {
  const React = require("react");

  return {
    DataTable: ({
      data,
      loading,
      emptyTitle,
      emptyDescription,
      columns,
    }: {
      data: Array<Record<string, unknown>>;
      loading: boolean;
      emptyTitle?: string;
      emptyDescription?: string;
      columns: { header: string }[];
    }) => {
      if (loading) {
        return React.createElement(
          "div",
          { "data-testid": "loading-skeleton" },
          "Loading...",
        );
      }

      if (data.length === 0) {
        return React.createElement(
          "div",
          { "data-testid": "empty-state" },
          React.createElement("p", null, emptyTitle),
          React.createElement("p", null, emptyDescription),
        );
      }

      return React.createElement(
        "table",
        { "data-testid": "data-table" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            columns.map((column: { header: string }, index: number) =>
              React.createElement("th", { key: index }, column.header),
            ),
          ),
        ),
        React.createElement(
          "tbody",
          null,
          data.map((item, index) =>
            React.createElement(
              "tr",
              { key: (item.id as string) ?? index },
              React.createElement("td", null, item.title as string),
            ),
          ),
        ),
      );
    },
  };
});

vi.mock("@/components/shared/status-badge", () => {
  const React = require("react");

  return {
    StatusBadge: ({ status }: { status: string }) =>
      React.createElement("span", { "data-testid": "status-badge" }, status),
  };
});

import MeetingsAndActionsPage from "../meetings/page";

const mockMeetings = [
  {
    id: "mtg-1",
    title: "IT Steering Committee Q1",
    meetingType: "steering_committee",
    scheduledAt: "2026-03-15T10:00:00Z",
    durationMinutes: 60,
    organizerId: "user-abc-12345678",
    status: "scheduled",
    tenantId: "tenant-1",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "mtg-2",
    title: "Change Advisory Board",
    meetingType: "advisory",
    scheduledAt: "2026-03-20T14:00:00Z",
    durationMinutes: 45,
    organizerId: "user-def-87654321",
    status: "completed",
    tenantId: "tenant-1",
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-03-20T16:00:00Z",
  },
];

const mockActions = [
  {
    id: "act-1",
    sourceId: "mtg-1",
    title: "Update disaster recovery plan",
    sourceType: "meeting_decision",
    ownerId: "user-abc-12345678",
    dueDate: "2026-04-01T00:00:00Z",
    priority: "high",
    status: "open",
    tenantId: "tenant-1",
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "act-2",
    sourceId: "mtg-2",
    title: "Finalize vendor exit checklist",
    sourceType: "meeting_decision",
    ownerId: "user-def-87654321",
    dueDate: "2026-03-10T00:00:00Z",
    priority: "critical",
    status: "overdue",
    tenantId: "tenant-1",
    createdAt: "2026-03-02T00:00:00Z",
    updatedAt: "2026-03-03T00:00:00Z",
  },
];

const mockMeetingMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 2,
  totalPages: 1,
};

const mockActionMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 2,
  totalPages: 1,
};

describe("MeetingsAndActionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseMeetings.mockReturnValue({
      data: { data: mockMeetings, meta: mockMeetingMeta },
      isLoading: false,
    });
    mockUseActionItems.mockReturnValue({
      data: { data: mockActions, meta: mockActionMeta },
      isLoading: false,
    });
    mockUseCompleteAction.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders the upgraded meetings workspace", () => {
    render(<MeetingsAndActionsPage />);

    expect(screen.getByText("Meetings & Action Items")).toBeInTheDocument();
    expect(screen.getByText("Governance pulse")).toBeInTheDocument();
    expect(screen.getAllByText("Meeting board").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("Action tracker")).toBeInTheDocument();
    expect(screen.getByText("Action pressure")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Governance cadence, decision follow-through, and action pressure/,
      ),
    ).toBeInTheDocument();
  });

  it("renders loading state when meetings are being fetched", () => {
    mockUseMeetings.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<MeetingsAndActionsPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when there are no meetings", () => {
    mockUseMeetings.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      },
      isLoading: false,
    });

    render(<MeetingsAndActionsPage />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No meetings found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Schedule your first meeting to establish the governance cadence.",
      ),
    ).toBeInTheDocument();
  });

  it("renders meetings in the data table when meeting data is available", () => {
    render(<MeetingsAndActionsPage />);

    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(screen.getByText("IT Steering Committee Q1")).toBeInTheDocument();
    expect(screen.getByText("Change Advisory Board")).toBeInTheDocument();
  });

  it("switches to the action tracker workspace", async () => {
    const user = userEvent.setup();

    render(<MeetingsAndActionsPage />);

    await user.click(screen.getByRole("button", { name: /Action tracker/i }));

    expect(
      screen.getByText("Update disaster recovery plan"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Finalize vendor exit checklist"),
    ).toBeInTheDocument();
    expect(screen.getByText("All Actions")).toBeInTheDocument();
  });

  it("shows the primary governance actions", () => {
    render(<MeetingsAndActionsPage />);

    expect(screen.getByText("Schedule Meeting")).toBeInTheDocument();
    expect(screen.getByText("Open Action Hub")).toBeInTheDocument();
    expect(screen.getByText("All Meetings")).toBeInTheDocument();
  });
});

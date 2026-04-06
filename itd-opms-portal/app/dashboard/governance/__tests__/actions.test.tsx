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

const mockUseActionItems = vi.fn();
const mockUseOverdueActionStats = vi.fn();
const mockUseMyOverdueActions = vi.fn();
const mockCompleteMutate = vi.fn();
const mockUseBreadcrumbs = vi.fn();

vi.mock("@/hooks/use-governance", () => ({
  useActionItems: (...args: unknown[]) => mockUseActionItems(...args),
  useOverdueActionStats: (...args: unknown[]) =>
    mockUseOverdueActionStats(...args),
  useMyOverdueActions: (...args: unknown[]) => mockUseMyOverdueActions(...args),
  useCompleteAction: () => ({
    mutate: mockCompleteMutate,
    isPending: false,
  }),
}));

vi.mock("@/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: (...args: unknown[]) => mockUseBreadcrumbs(...args),
}));

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-current-12345678",
      permissions: ["*"],
    },
    isLoading: false,
  }),
}));

vi.mock("@/components/shared/permission-gate", () => ({
  PermissionGate: ({ children }: PropsWithChildren) => children,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/utils", () => ({
  formatDate: (date: string) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString("en-US");
  },
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/components/shared/status-badge", () => {
  const React = require("react");
  return {
    StatusBadge: ({ status }: { status: string }) =>
      React.createElement("span", { "data-testid": "status-badge" }, status),
  };
});

vi.mock("@/components/shared/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <p>{title}</p>
        <p>{message}</p>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button">{cancelLabel}</button>
      </div>
    ) : null,
}));

vi.mock("@/components/shared/data-table", () => {
  const React = require("react");

  return {
    DataTable: ({
      columns,
      data,
      loading,
      emptyTitle,
      emptyDescription,
    }: {
      columns: Array<{
        key: string;
        header: string;
        render: (item: Record<string, unknown>) => ReactNode;
      }>;
      data: Record<string, unknown>[];
      loading: boolean;
      emptyTitle?: string;
      emptyDescription?: string;
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
            columns.map((column) =>
              React.createElement("th", { key: column.key }, column.header),
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
              columns.map((column) =>
                React.createElement(
                  "td",
                  { key: column.key },
                  column.render(item),
                ),
              ),
            ),
          ),
        ),
      );
    },
  };
});

import ActionTrackerPage from "../actions/page";

const actionItems = [
  {
    id: "act-1",
    tenantId: "tenant-1",
    sourceType: "meeting_decision",
    sourceId: "mtg-1",
    title: "Refresh business continuity walkthrough",
    description: "Revalidate the executive tabletop workflow.",
    ownerId: "user-current-12345678",
    dueDate: "2099-04-10T00:00:00Z",
    status: "open",
    priority: "high",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "act-2",
    tenantId: "tenant-1",
    sourceType: "policy_review",
    sourceId: "pol-1",
    title: "Close vendor concentration exception",
    description: "Escalate the mitigation plan with procurement and risk.",
    ownerId: "user-risk-99999999",
    dueDate: "2000-03-05T00:00:00Z",
    status: "overdue",
    priority: "critical",
    createdAt: "2026-03-02T00:00:00Z",
  },
  {
    id: "act-3",
    tenantId: "tenant-1",
    sourceType: "meeting_decision",
    sourceId: "mtg-2",
    title: "Publish CAB summary",
    description: "Distribute approved change summary to stakeholders.",
    ownerId: "user-current-12345678",
    dueDate: "2099-03-15T00:00:00Z",
    status: "completed",
    priority: "low",
    createdAt: "2026-03-03T00:00:00Z",
  },
];

function setDynamicActionMock() {
  mockUseActionItems.mockImplementation(
    (
      page: number,
      limit: number,
      status?: string,
      ownerId?: string,
      sourceType?: string,
      sourceId?: string,
      priority?: string,
    ) => {
      let filtered = actionItems;

      if (status) {
        filtered = filtered.filter((item) => item.status === status);
      }
      if (ownerId) {
        filtered = filtered.filter((item) => item.ownerId === ownerId);
      }
      if (sourceType) {
        filtered = filtered.filter((item) => item.sourceType === sourceType);
      }
      if (sourceId) {
        filtered = filtered.filter((item) => item.sourceId === sourceId);
      }
      if (priority) {
        filtered = filtered.filter((item) => item.priority === priority);
      }

      return {
        data: {
          data: filtered,
          meta: {
            page,
            pageSize: limit,
            totalItems: filtered.length,
            totalPages: 1,
          },
        },
        isLoading: false,
      };
    },
  );
}

describe("ActionTrackerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDynamicActionMock();
    mockUseOverdueActionStats.mockReturnValue({
      data: {
        totalOverdue: 7,
        overdueByPriority: {
          critical: 3,
          high: 2,
          medium: 1,
          low: 1,
        },
        overdueByOwner: [
          {
            ownerId: "user-risk-99999999",
            ownerName: "Risk Lead",
            count: 3,
          },
          {
            ownerId: "user-current-12345678",
            ownerName: "Current User",
            count: 2,
          },
        ],
        oldestOverdueDays: 21,
        avgDaysOverdue: 8.2,
        dueThisWeek: 4,
        completedThisMonth: 11,
      },
      isLoading: false,
    });
    mockUseMyOverdueActions.mockReturnValue({
      data: [actionItems[0], actionItems[1]],
      isLoading: false,
    });
    mockCompleteMutate.mockImplementation(
      (
        payload: { id: string },
        options?: { onSuccess?: () => void; onError?: () => void },
      ) => {
        options?.onSuccess?.();
      },
    );
  });

  it("renders the upgraded action workspace", () => {
    render(<ActionTrackerPage />);

    expect(screen.getByText("Action Tracker")).toBeInTheDocument();
    expect(screen.getByText("Action pulse")).toBeInTheDocument();
    expect(screen.getByText("Action control board")).toBeInTheDocument();
    expect(screen.getByText("Top overdue owners")).toBeInTheDocument();
    expect(screen.getByText("Execution notes")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Ownership, deadlines, and overdue pressure in a stronger governance workspace/,
      ),
    ).toBeInTheDocument();
  });

  it("renders loading state when action data is being fetched", () => {
    mockUseActionItems.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<ActionTrackerPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when there are no action items", () => {
    mockUseActionItems.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      },
      isLoading: false,
    });

    render(<ActionTrackerPage />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No action items found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Action items from meetings and governance decisions will appear here.",
      ),
    ).toBeInTheDocument();
  });

  it("filters to the current user's action lane", async () => {
    const user = userEvent.setup();

    render(<ActionTrackerPage />);

    await user.click(screen.getByRole("button", { name: /My Action Lane/i }));

    expect(
      screen.getByText("Refresh business continuity walkthrough"),
    ).toBeInTheDocument();
    expect(screen.getByText("Publish CAB summary")).toBeInTheDocument();
    expect(
      screen.queryByText("Close vendor concentration exception"),
    ).not.toBeInTheDocument();
  });

  it("filters by priority lens", async () => {
    const user = userEvent.setup();

    render(<ActionTrackerPage />);

    await user.selectOptions(
      screen.getByLabelText("Priority lens"),
      "critical",
    );

    expect(
      screen.getByText("Close vendor concentration exception"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Refresh business continuity walkthrough"),
    ).not.toBeInTheDocument();
  });

  it("opens the completion dialog and submits the completion action", async () => {
    const user = userEvent.setup();

    render(<ActionTrackerPage />);

    await user.click(screen.getAllByRole("button", { name: "Complete" })[0]);

    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(screen.getByText("Complete Action Item")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mark Complete" }));

    expect(mockCompleteMutate).toHaveBeenCalledWith(
      { id: "act-1" },
      expect.any(Object),
    );
  });
});

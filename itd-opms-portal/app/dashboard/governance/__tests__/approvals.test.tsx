import type { PropsWithChildren, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  userEvent,
  within,
} from "@/test/test-utils";

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

const mockUseMyPendingApprovals = vi.fn();
const mockUseMyPendingApprovalCount = vi.fn();
const mockUseApproveStep = vi.fn();
const mockUseRejectStep = vi.fn();
const mockUseApprovalHistory = vi.fn();
const mockUseBreadcrumbs = vi.fn();
const mockApproveMutate = vi.fn();
const mockRejectMutate = vi.fn();

vi.mock("@/hooks/use-approvals", () => ({
  useMyPendingApprovals: (...args: unknown[]) =>
    mockUseMyPendingApprovals(...args),
  useMyPendingApprovalCount: (...args: unknown[]) =>
    mockUseMyPendingApprovalCount(...args),
  useApproveStep: (...args: unknown[]) => mockUseApproveStep(...args),
  useRejectStep: (...args: unknown[]) => mockUseRejectStep(...args),
  useApprovalHistory: (...args: unknown[]) => mockUseApprovalHistory(...args),
}));

vi.mock("@/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: (...args: unknown[]) => mockUseBreadcrumbs(...args),
}));

vi.mock("@/components/shared/permission-gate", () => ({
  PermissionGate: ({ children }: PropsWithChildren) => children,
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
      keyExtractor,
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
      keyExtractor: (item: Record<string, unknown>) => string;
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
          data.map((item) =>
            React.createElement(
              "tr",
              { key: keyExtractor(item) },
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

import ApprovalsPage from "../approvals/page";

const pendingItems = [
  {
    stepId: "step-1",
    chainId: "chain-1",
    entityType: "policy",
    entityId: "policy-12345678",
    stepOrder: 1,
    stepName: "Policy Council Review",
    urgency: "critical",
    deadline: "2000-01-01T00:00:00Z",
    requestedBy: "Amina Johnson",
    requestedAt: "2026-03-10T00:00:00Z",
    chainStatus: "pending",
  },
  {
    stepId: "step-2",
    chainId: "chain-2",
    entityType: "project",
    entityId: "project-87654321",
    stepOrder: 2,
    stepName: "Budget Validation",
    urgency: "high",
    deadline: "2099-05-01T00:00:00Z",
    requestedBy: "Tobi Peters",
    requestedAt: "2026-03-11T00:00:00Z",
    chainStatus: "pending",
  },
  {
    stepId: "step-3",
    chainId: "chain-3",
    entityType: "risk",
    entityId: "risk-11223344",
    stepOrder: 1,
    stepName: "Risk Owner Review",
    urgency: "normal",
    deadline: "2099-06-01T00:00:00Z",
    requestedBy: "Lara King",
    requestedAt: "2026-03-12T00:00:00Z",
    chainStatus: "pending",
  },
];

const historyItems = [
  {
    chainId: "hist-1",
    entityType: "policy",
    entityId: "policy-12345678",
    status: "approved",
    currentStep: 3,
    totalSteps: 3,
    urgency: "high",
    createdBy: "Amina Johnson",
    createdAt: "2026-03-01T00:00:00Z",
    completedAt: "2026-03-05T00:00:00Z",
  },
  {
    chainId: "hist-2",
    entityType: "project",
    entityId: "project-87654321",
    status: "rejected",
    currentStep: 2,
    totalSteps: 3,
    urgency: "critical",
    createdBy: "Tobi Peters",
    createdAt: "2026-03-02T00:00:00Z",
    completedAt: "2026-03-06T00:00:00Z",
  },
  {
    chainId: "hist-3",
    entityType: "risk",
    entityId: "risk-11223344",
    status: "in_progress",
    currentStep: 1,
    totalSteps: 2,
    urgency: "normal",
    createdBy: "Lara King",
    createdAt: "2026-03-03T00:00:00Z",
    completedAt: null,
  },
];

describe("ApprovalsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseMyPendingApprovals.mockReturnValue({
      data: {
        data: pendingItems,
        meta: { page: 1, pageSize: 20, totalItems: 3, totalPages: 1 },
      },
      isLoading: false,
    });
    mockUseMyPendingApprovalCount.mockReturnValue({
      data: { count: 3 },
      isLoading: false,
    });
    mockUseApprovalHistory.mockReturnValue({
      data: {
        data: historyItems,
        meta: { page: 1, pageSize: 20, totalItems: 3, totalPages: 1 },
      },
      isLoading: false,
    });
    mockUseApproveStep.mockReturnValue({
      mutate: mockApproveMutate,
      isPending: false,
    });
    mockUseRejectStep.mockReturnValue({
      mutate: mockRejectMutate,
      isPending: false,
    });
  });

  it("renders the upgraded approvals workspace", () => {
    render(<ApprovalsPage />);

    expect(screen.getByText("My Approvals")).toBeInTheDocument();
    expect(screen.getByText("Approval pulse")).toBeInTheDocument();
    expect(screen.getAllByText("Pending queue").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getByText("Approval history")).toBeInTheDocument();
    expect(screen.getByText("Priority approvals")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Pending approvals, decision history, and queue pressure in a stronger approval workspace/,
      ),
    ).toBeInTheDocument();
  });

  it("renders loading state when pending approvals are being fetched", () => {
    mockUseMyPendingApprovals.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<ApprovalsPage />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when there are no pending approvals", () => {
    mockUseMyPendingApprovals.mockReturnValue({
      data: {
        data: [],
        meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      },
      isLoading: false,
    });
    mockUseMyPendingApprovalCount.mockReturnValue({
      data: { count: 0 },
      isLoading: false,
    });

    render(<ApprovalsPage />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No pending approvals")).toBeInTheDocument();
    expect(
      screen.getByText("You have no approval requests awaiting your review."),
    ).toBeInTheDocument();
  });

  it("filters the pending queue by urgency", async () => {
    const user = userEvent.setup();

    render(<ApprovalsPage />);

    await user.click(screen.getByRole("button", { name: "Critical" }));

    expect(
      screen.getAllByText("Policy · policy-1...").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Project · project-...")).not.toBeInTheDocument();
  });

  it("switches to the history workspace", async () => {
    const user = userEvent.setup();

    render(<ApprovalsPage />);

    await user.click(screen.getByRole("button", { name: /Approval history/i }));

    expect(screen.getByText("Approval history board")).toBeInTheDocument();
    expect(
      screen.getAllByText("Chain hist-1...").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Chain hist-2...").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("All chain history")).toBeInTheDocument();
  });

  it("opens the reject modal and submits a rejection comment", async () => {
    const user = userEvent.setup();

    render(<ApprovalsPage />);

    await user.click(screen.getAllByRole("button", { name: "Reject" })[0]);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Reason/), {
      target: { value: "Insufficient evidence" },
    });
    await user.click(within(dialog).getByRole("button", { name: "Reject" }));

    expect(mockRejectMutate).toHaveBeenCalledWith(
      { stepId: "step-1", comments: "Insufficient evidence" },
      expect.any(Object),
    );
  });
});

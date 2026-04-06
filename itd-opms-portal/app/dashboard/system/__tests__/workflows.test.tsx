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

const mockUseWorkflowDefinitions = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockUseSearchUsers = vi.fn();

vi.mock("@/hooks/use-approvals", () => ({
  useWorkflowDefinitions: (...args: unknown[]) =>
    mockUseWorkflowDefinitions(...args),
  useCreateWorkflowDefinition: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateWorkflowDefinition: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteWorkflowDefinition: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/use-system", () => ({
  useSearchUsers: (...args: unknown[]) => mockUseSearchUsers(...args),
}));

vi.mock("@/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("@/components/shared/permission-gate", () => ({
  PermissionGate: ({ children }: PropsWithChildren) => children,
}));

vi.mock("@/components/shared/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock("@/components/shared/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    message,
    confirmLabel,
  }: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <p>{title}</p>
        <p>{message}</p>
        <button type="button">{confirmLabel}</button>
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
      emptyAction,
      keyExtractor,
    }: {
      columns: {
        key: string;
        header: string;
        render: (item: Record<string, unknown>) => ReactNode;
      }[];
      data: Record<string, unknown>[];
      loading?: boolean;
      emptyTitle?: string;
      emptyDescription?: string;
      emptyAction?: ReactNode;
      keyExtractor: (item: Record<string, unknown>) => string;
    }) => {
      if (loading) {
        return <div data-testid="loading-skeleton">Loading...</div>;
      }

      if (data.length === 0) {
        return (
          <div data-testid="empty-state">
            <p>{emptyTitle}</p>
            <p>{emptyDescription}</p>
            {emptyAction}
          </div>
        );
      }

      return (
        <table data-testid="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={keyExtractor(item)}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(item)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    },
  };
});

import WorkflowsPage from "../workflows/page";

const workflowDefinitions = [
  {
    id: "wf-1",
    tenantId: "tenant-1",
    name: "Project Capital Approval",
    description:
      "Routes capital-intensive project requests through finance and PMO.",
    entityType: "project",
    steps: [
      {
        stepOrder: 1,
        name: "Portfolio Lead Review",
        mode: "sequential",
        quorum: 1,
        approverType: "user",
        approverIds: ["user-1"],
        timeoutHours: 12,
        allowDelegation: true,
      },
      {
        stepOrder: 2,
        name: "Finance Validation",
        mode: "parallel",
        quorum: 1,
        approverType: "user",
        approverIds: ["user-2", "user-3"],
        timeoutHours: 24,
        allowDelegation: true,
      },
      {
        stepOrder: 3,
        name: "Executive Sign-off",
        mode: "sequential",
        quorum: 1,
        approverType: "user",
        approverIds: ["user-4"],
        timeoutHours: 48,
        allowDelegation: true,
      },
    ],
    isActive: true,
    version: 3,
    createdBy: "user-admin",
    createdAt: "2026-01-02T09:00:00Z",
    updatedAt: "2026-03-20T10:00:00Z",
  },
  {
    id: "wf-2",
    tenantId: "tenant-1",
    name: "Risk Exception Signoff",
    description:
      "Escalates exception approvals for risk owners and control leads.",
    entityType: "risk",
    steps: [
      {
        stepOrder: 1,
        name: "Risk Owner Review",
        mode: "sequential",
        quorum: 1,
        approverType: "user",
        approverIds: ["user-5"],
        timeoutHours: 8,
        allowDelegation: false,
      },
      {
        stepOrder: 2,
        name: "Control Committee",
        mode: "any_of",
        quorum: 2,
        approverType: "user",
        approverIds: ["user-6", "user-7", "user-8"],
        timeoutHours: 24,
        allowDelegation: false,
      },
    ],
    isActive: false,
    version: 1,
    createdBy: "user-admin",
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-03-11T10:00:00Z",
  },
  {
    id: "wf-3",
    tenantId: "tenant-1",
    name: "Policy Publish Review",
    description:
      "Validates policy readiness before publication and communication.",
    entityType: "policy",
    steps: [
      {
        stepOrder: 1,
        name: "Author QA",
        mode: "sequential",
        quorum: 1,
        approverType: "user",
        approverIds: ["user-9"],
        timeoutHours: 6,
        allowDelegation: true,
      },
      {
        stepOrder: 2,
        name: "Policy Council",
        mode: "parallel",
        quorum: 1,
        approverType: "user",
        approverIds: ["user-10", "user-11"],
        timeoutHours: 12,
        allowDelegation: true,
      },
      {
        stepOrder: 3,
        name: "Legal Review",
        mode: "sequential",
        quorum: 1,
        approverType: "user",
        approverIds: ["user-12"],
        timeoutHours: 24,
        allowDelegation: true,
      },
      {
        stepOrder: 4,
        name: "Communications Release",
        mode: "sequential",
        quorum: 1,
        approverType: "user",
        approverIds: ["user-13"],
        timeoutHours: 8,
        allowDelegation: true,
      },
    ],
    isActive: true,
    version: 2,
    createdBy: "user-admin",
    createdAt: "2026-02-01T09:00:00Z",
    updatedAt: "2026-03-24T10:00:00Z",
  },
];

describe("WorkflowsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkflowDefinitions.mockReturnValue({
      data: workflowDefinitions,
      isLoading: false,
    });
    mockUseSearchUsers.mockReturnValue({
      data: [],
      isFetching: false,
    });
  });

  it("renders the upgraded workflow workspace", () => {
    render(<WorkflowsPage />);

    expect(screen.getByText("Workflow Definitions")).toBeInTheDocument();
    expect(screen.getByText("Orchestration pulse")).toBeInTheDocument();
    expect(screen.getByText("Workflow registry")).toBeInTheDocument();
    expect(screen.getByText("Template spotlight")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Approval templates, routing logic, and escalation design/,
      ),
    ).toBeInTheDocument();
  });

  it("renders workflow metrics and table content", () => {
    render(<WorkflowsPage />);

    expect(screen.getByText("Templates in system")).toBeInTheDocument();
    expect(
      screen.getAllByText("Entity coverage").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
    expect(
      screen.getAllByText("Project Capital Approval").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Risk Exception Signoff").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Policy Publish Review").length).toBeGreaterThan(
      0,
    );
  });

  it("filters the registry to inactive workflows", async () => {
    const user = userEvent.setup();

    render(<WorkflowsPage />);

    await user.click(screen.getByRole("button", { name: "Inactive only" }));

    expect(
      screen.getAllByText("Risk Exception Signoff").length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText("Project Capital Approval"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Policy Publish Review")).not.toBeInTheDocument();
  });

  it("shows the empty state when no workflows exist", () => {
    mockUseWorkflowDefinitions.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<WorkflowsPage />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No workflow definitions")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first approval workflow to get started."),
    ).toBeInTheDocument();
  });

  it("opens the create workflow modal and allows step creation", async () => {
    const user = userEvent.setup();

    render(<WorkflowsPage />);

    await user.click(
      screen.getAllByRole("button", { name: "Create Workflow" })[0],
    );

    expect(screen.getByText("Create Workflow Definition")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Step" }));

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Show Step Flow Preview")).toBeInTheDocument();
  });
});

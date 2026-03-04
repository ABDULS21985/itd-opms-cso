import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import { ApprovalStatus } from "../approval-status";

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

// ---------------------------------------------------------------------------
// Mock hooks
// ---------------------------------------------------------------------------
const mockUseAuth = vi.fn();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockApprovalChain = vi.fn();
const mockApproveMutate = vi.fn();
const mockRejectMutate = vi.fn();
const mockDelegateMutate = vi.fn();
const mockStartMutate = vi.fn();
const mockWorkflowDefinitions = vi.fn();

vi.mock("@/hooks/use-approvals", () => ({
  useApprovalChainForEntity: (...args: any[]) => mockApprovalChain(...args),
  useApproveStep: () => ({
    mutate: mockApproveMutate,
    isPending: false,
  }),
  useRejectStep: () => ({
    mutate: mockRejectMutate,
    isPending: false,
  }),
  useDelegateStep: () => ({
    mutate: mockDelegateMutate,
    isPending: false,
  }),
  useStartApproval: () => ({
    mutate: mockStartMutate,
    isPending: false,
  }),
  useWorkflowDefinitions: (...args: any[]) => mockWorkflowDefinitions(...args),
}));

describe("ApprovalStatus", () => {
  const defaultProps = {
    entityType: "ticket",
    entityId: "ticket-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", permissions: ["*"] },
    });
    mockWorkflowDefinitions.mockReturnValue({ data: [] });
  });

  it("renders loading skeleton when data is loading", () => {
    mockApprovalChain.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<ApprovalStatus {...defaultProps} />);
    const pulsingElements = container.querySelectorAll(".animate-pulse");
    expect(pulsingElements.length).toBeGreaterThan(0);
  });

  it("shows 'Start Approval' button when no chain exists (error)", () => {
    mockApprovalChain.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
    });

    render(<ApprovalStatus {...defaultProps} />);

    expect(screen.getByText("Approval Status")).toBeInTheDocument();
    expect(
      screen.getByText(/No approval workflow has been started/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Start Approval/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Start Approval' button when chain is null", () => {
    mockApprovalChain.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    render(<ApprovalStatus {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /Start Approval/i }),
    ).toBeInTheDocument();
  });

  it("renders approval chain with steps", () => {
    mockApprovalChain.mockReturnValue({
      data: {
        id: "chain-1",
        status: "in_progress",
        currentStep: 1,
        urgency: "normal",
        steps: [
          {
            id: "step-1",
            stepOrder: 1,
            decision: "pending",
            approverId: "user-1",
            approverName: "Test User",
            decidedAt: null,
            comments: null,
            delegatedFrom: null,
          },
        ],
        completedAt: null,
      },
      isLoading: false,
      isError: false,
    });

    render(<ApprovalStatus {...defaultProps} />);

    expect(screen.getByText("Approval Status")).toBeInTheDocument();
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("shows action buttons for the current user on a pending step", () => {
    mockApprovalChain.mockReturnValue({
      data: {
        id: "chain-1",
        status: "in_progress",
        currentStep: 1,
        urgency: "normal",
        steps: [
          {
            id: "step-1",
            stepOrder: 1,
            decision: "pending",
            approverId: "user-1",
            approverName: "Test User",
            decidedAt: null,
            comments: null,
            delegatedFrom: null,
          },
        ],
        completedAt: null,
      },
      isLoading: false,
      isError: false,
    });

    render(<ApprovalStatus {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /Approve/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reject/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Delegate/i }),
    ).toBeInTheDocument();
  });

  it("does not show action buttons for another user's step", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-2", permissions: ["*"] },
    });

    mockApprovalChain.mockReturnValue({
      data: {
        id: "chain-1",
        status: "in_progress",
        currentStep: 1,
        urgency: "normal",
        steps: [
          {
            id: "step-1",
            stepOrder: 1,
            decision: "pending",
            approverId: "user-1",
            approverName: "Other User",
            decidedAt: null,
            comments: null,
            delegatedFrom: null,
          },
        ],
        completedAt: null,
      },
      isLoading: false,
      isError: false,
    });

    render(<ApprovalStatus {...defaultProps} />);

    expect(
      screen.queryByRole("button", { name: /Approve/i }),
    ).not.toBeInTheDocument();
  });

  it("calls approve mutation when Approve button is clicked", async () => {
    const user = userEvent.setup();
    mockApprovalChain.mockReturnValue({
      data: {
        id: "chain-1",
        status: "in_progress",
        currentStep: 1,
        urgency: "normal",
        steps: [
          {
            id: "step-1",
            stepOrder: 1,
            decision: "pending",
            approverId: "user-1",
            approverName: "Test User",
            decidedAt: null,
            comments: null,
            delegatedFrom: null,
          },
        ],
        completedAt: null,
      },
      isLoading: false,
      isError: false,
    });

    render(<ApprovalStatus {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Approve/i }));
    expect(mockApproveMutate).toHaveBeenCalledWith({ stepId: "step-1" });
  });

  it("shows urgency badge when urgency is not normal", () => {
    mockApprovalChain.mockReturnValue({
      data: {
        id: "chain-1",
        status: "in_progress",
        currentStep: 1,
        urgency: "critical",
        steps: [
          {
            id: "step-1",
            stepOrder: 1,
            decision: "pending",
            approverId: "user-1",
            approverName: "Test User",
            decidedAt: null,
            comments: null,
            delegatedFrom: null,
          },
        ],
        completedAt: null,
      },
      isLoading: false,
      isError: false,
    });

    render(<ApprovalStatus {...defaultProps} />);

    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  it("shows completed date when chain is completed", () => {
    mockApprovalChain.mockReturnValue({
      data: {
        id: "chain-1",
        status: "approved",
        currentStep: 1,
        urgency: "normal",
        steps: [
          {
            id: "step-1",
            stepOrder: 1,
            decision: "approved",
            approverId: "user-1",
            approverName: "Test User",
            decidedAt: "2024-01-15T10:00:00Z",
            comments: null,
            delegatedFrom: null,
          },
        ],
        completedAt: "2024-01-15T10:00:00Z",
      },
      isLoading: false,
      isError: false,
    });

    render(<ApprovalStatus {...defaultProps} />);

    expect(screen.getByText(/Completed on/)).toBeInTheDocument();
  });
});

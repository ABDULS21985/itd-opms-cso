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
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

const mockUseSSARequests = vi.fn();
const mockUseBulkApprove = vi.fn();
const mockUseBulkStatusUpdate = vi.fn();
const mockUseBulkExport = vi.fn();

vi.mock("@/hooks/use-ssa", () => ({
  useSSARequests: (...args: unknown[]) => mockUseSSARequests(...args),
  useBulkApprove: (...args: unknown[]) => mockUseBulkApprove(...args),
  useBulkStatusUpdate: (...args: unknown[]) => mockUseBulkStatusUpdate(...args),
  useBulkExport: (...args: unknown[]) => mockUseBulkExport(...args),
}));

import BulkOperationsPage from "../bulk/page";

const approvalRequests = [
  {
    id: "req-1",
    tenantId: "tenant-1",
    referenceNo: "SSA-2026-001",
    requestorId: "user-1",
    requestorName: "Ada Requestor",
    requestorStaffId: "STF-001",
    requestorEmail: "ada@example.com",
    divisionOffice: "Operations",
    status: "APPR_DC_PENDING",
    appName: "Core Banking",
    dbName: "cbank",
    operatingSystem: "RHEL 9",
    serverType: "virtual",
    vcpuCount: 8,
    memoryGb: 32,
    spaceGb: 500,
    vlanZone: "production",
    justification: "Capacity increase",
    presentSpaceAllocatedGb: 300,
    presentSpaceInUseGb: 250,
    revisionCount: 1,
    submittedAt: "2026-03-27T10:00:00.000Z",
    createdAt: "2026-03-26T10:00:00.000Z",
    updatedAt: "2026-03-27T10:00:00.000Z",
  },
];

const rejectedRequests = [
  {
    id: "req-2",
    tenantId: "tenant-1",
    referenceNo: "SSA-2026-002",
    requestorId: "user-2",
    requestorName: "Musa Requestor",
    requestorStaffId: "STF-002",
    requestorEmail: "musa@example.com",
    divisionOffice: "Finance",
    status: "REJECTED",
    appName: "Treasury Hub",
    dbName: "treasury",
    operatingSystem: "RHEL 8",
    serverType: "physical",
    vcpuCount: 4,
    memoryGb: 16,
    spaceGb: 200,
    vlanZone: "core",
    justification: "Recovery environment",
    presentSpaceAllocatedGb: 120,
    presentSpaceInUseGb: 110,
    revisionCount: 0,
    submittedAt: "2026-03-20T10:00:00.000Z",
    createdAt: "2026-03-19T10:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
  },
];

function setLoadedState() {
  mockUseSSARequests.mockImplementation(
    (_page: number, _limit: number, status?: string) => {
      if (status === "APPR_DC_PENDING") {
        return {
          data: { data: approvalRequests },
          isLoading: false,
        };
      }

      if (status === "REJECTED") {
        return {
          data: { data: rejectedRequests },
          isLoading: false,
        };
      }

      if (status === "DRAFT") {
        return {
          data: { data: [] },
          isLoading: false,
        };
      }

      return {
        data: { data: [] },
        isLoading: false,
      };
    },
  );

  mockUseBulkApprove.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mockUseBulkStatusUpdate.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mockUseBulkExport.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
    data: approvalRequests,
  });
}

function setEmptyState() {
  mockUseSSARequests.mockReturnValue({
    data: { data: [] },
    isLoading: false,
  });

  mockUseBulkApprove.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mockUseBulkStatusUpdate.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mockUseBulkExport.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
    data: [],
  });
}

describe("BulkOperationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the upgraded bulk operations workspace", () => {
    setLoadedState();

    render(<BulkOperationsPage />);

    expect(screen.getByText("Bulk Operations")).toBeInTheDocument();
    expect(screen.getByText(/SSA bulk operations/)).toBeInTheDocument();
    expect(screen.getByText("Operation pulse")).toBeInTheDocument();
    expect(screen.getByText("Run controlled approvals")).toBeInTheDocument();
    expect(
      screen.getByText("Requests waiting for Head Data Centre"),
    ).toBeInTheDocument();
    expect(screen.getByText("SSA-2026-001")).toBeInTheDocument();
  });

  it("switches into the status repair lane", async () => {
    setLoadedState();
    const user = userEvent.setup();

    render(<BulkOperationsPage />);

    await user.click(screen.getByRole("button", { name: /^Status Update$/ }));

    expect(screen.getByText("Repair state drift safely")).toBeInTheDocument();
    expect(
      screen.getByText("Requests currently in Rejected"),
    ).toBeInTheDocument();
    expect(screen.getByText("SSA-2026-002")).toBeInTheDocument();
  });

  it("switches into the export studio lane", async () => {
    setLoadedState();
    const user = userEvent.setup();

    render(<BulkOperationsPage />);

    await user.click(screen.getByRole("button", { name: /^Export$/ }));

    expect(screen.getByText("Export request portfolios")).toBeInTheDocument();
    expect(screen.getByText("CSV delivery lane")).toBeInTheDocument();
    expect(
      screen.getByText("Exported 1 request(s) to CSV."),
    ).toBeInTheDocument();
  });

  it("renders the stronger empty state when no approval requests are eligible", () => {
    setEmptyState();

    render(<BulkOperationsPage />);

    expect(screen.getByText("Bulk Operations")).toBeInTheDocument();
    expect(
      screen.getByText("No requests pending at this stage"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This approval lane is currently clear. Switch to another stage or wait for the queue to refill.",
      ),
    ).toBeInTheDocument();
  });
});

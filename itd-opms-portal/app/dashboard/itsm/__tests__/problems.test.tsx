import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/itsm/problems",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, whileHover, whileTap,
        whileFocus, layout, layoutId, variants, ...rest
      } = props;
      return <div {...rest}>{children}</div>;
    },
    form: ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, whileHover, whileTap,
        whileFocus, layout, layoutId, variants, ...rest
      } = props;
      return <form {...rest}>{children}</form>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock StatusBadge and FormField
vi.mock("@/components/shared/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock("@/components/shared/form-field", () => ({
  FormField: ({ label, name, value, onChange, placeholder, required, error, type, rows }: any) => (
    <div>
      <label htmlFor={name}>{label}</label>
      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
        />
      ) : (
        <input
          id={name}
          name={name}
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      )}
      {error && <span>{error}</span>}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// ITSM hook mocks
// ---------------------------------------------------------------------------

const mockUseProblems = vi.fn();
const mockUseKnownErrors = vi.fn();
const mockUseCreateProblem = vi.fn();
const mockUseCreateKnownError = vi.fn();

vi.mock("@/hooks/use-itsm", () => ({
  useProblems: (...args: any[]) => mockUseProblems(...args),
  useKnownErrors: (...args: any[]) => mockUseKnownErrors(...args),
  useCreateProblem: (...args: any[]) => mockUseCreateProblem(...args),
  useCreateKnownError: (...args: any[]) => mockUseCreateKnownError(...args),
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks
// ---------------------------------------------------------------------------

import ProblemsPage from "../problems/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProblemsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateProblem.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseCreateKnownError.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseKnownErrors.mockReturnValue({ data: [], isLoading: false });
  });

  it("renders page heading and description", () => {
    mockUseProblems.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });

    render(<ProblemsPage />);

    expect(screen.getByText("Problem Management")).toBeInTheDocument();
    expect(
      screen.getByText("Track root causes, known errors, and permanent fixes"),
    ).toBeInTheDocument();
  });

  it("renders the New Problem button in the header", () => {
    mockUseProblems.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<ProblemsPage />);

    // When loading, only the header button is shown (not the empty state button)
    expect(screen.getByText("New Problem")).toBeInTheDocument();
  });

  it("renders the Filters button", () => {
    mockUseProblems.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<ProblemsPage />);

    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("shows loading state when problems are being fetched", () => {
    mockUseProblems.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<ProblemsPage />);

    expect(screen.getByText("Loading problems...")).toBeInTheDocument();
  });

  it("shows empty state when no problems exist", () => {
    mockUseProblems.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });

    render(<ProblemsPage />);

    expect(screen.getByText("No problems found")).toBeInTheDocument();
    expect(
      screen.getByText("Create a problem record to track root causes and known errors."),
    ).toBeInTheDocument();
  });

  it("renders problem list with problem numbers and titles", () => {
    const mockProblems = [
      {
        id: "p-1",
        problemNumber: "PRB-001",
        title: "Recurring DNS resolution failures",
        status: "investigating",
        description: "DNS queries intermittently fail.",
        rootCause: null,
        workaround: "Restart DNS forwarder",
        permanentFix: null,
        ownerId: "user-1",
        linkedIncidentIds: ["t-1", "t-2"],
        linkedChangeId: null,
        createdAt: "2025-05-15T08:00:00Z",
        updatedAt: "2025-05-16T10:00:00Z",
        tenantId: "tenant-1",
      },
      {
        id: "p-2",
        problemNumber: "PRB-002",
        title: "Email delivery delays",
        status: "root_cause_identified",
        description: "Emails delayed by 15+ minutes.",
        rootCause: "Spam filter queue backup",
        workaround: null,
        permanentFix: null,
        ownerId: null,
        linkedIncidentIds: ["t-3"],
        linkedChangeId: null,
        createdAt: "2025-06-01T14:00:00Z",
        updatedAt: "2025-06-02T09:00:00Z",
        tenantId: "tenant-1",
      },
    ];

    mockUseProblems.mockReturnValue({
      data: {
        data: mockProblems,
        meta: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<ProblemsPage />);

    expect(screen.getByText("PRB-001")).toBeInTheDocument();
    expect(screen.getByText("Recurring DNS resolution failures")).toBeInTheDocument();
    expect(screen.getByText("PRB-002")).toBeInTheDocument();
    expect(screen.getByText("Email delivery delays")).toBeInTheDocument();
  });

  it("displays status labels for problems", () => {
    mockUseProblems.mockReturnValue({
      data: {
        data: [
          {
            id: "p-1",
            problemNumber: "PRB-001",
            title: "Test Problem",
            status: "investigating",
            description: "",
            rootCause: null,
            workaround: null,
            permanentFix: null,
            ownerId: null,
            linkedIncidentIds: [],
            linkedChangeId: null,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
            tenantId: "tenant-1",
          },
        ],
        meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<ProblemsPage />);

    // The status is rendered with replace(/_/g, " ")
    expect(screen.getByText("investigating")).toBeInTheDocument();
  });

  it("shows linked incident count", () => {
    mockUseProblems.mockReturnValue({
      data: {
        data: [
          {
            id: "p-1",
            problemNumber: "PRB-001",
            title: "Test Problem",
            status: "logged",
            description: "",
            rootCause: null,
            workaround: null,
            permanentFix: null,
            ownerId: null,
            linkedIncidentIds: ["t-1", "t-2", "t-3"],
            linkedChangeId: null,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
            tenantId: "tenant-1",
          },
        ],
        meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
      },
      isLoading: false,
    });

    render(<ProblemsPage />);

    expect(screen.getByText("3 incidents")).toBeInTheDocument();
  });
});

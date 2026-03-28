import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";

// ---------------------------------------------------------------------------
// Mock: framer-motion
// ---------------------------------------------------------------------------
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...rest
    }: any) => <div {...rest}>{children}</div>,
    form: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...rest
    }: any) => <form {...rest}>{children}</form>,
  },
}));

// ---------------------------------------------------------------------------
// Mock: next/link
// ---------------------------------------------------------------------------
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }> & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: shared inputs
// ---------------------------------------------------------------------------
vi.mock("@/components/shared/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/components/shared/form-field", () => ({
  FormField: ({
    label,
    name,
    value,
    onChange,
    placeholder,
    required,
    error,
    type,
    rows,
  }: any) => (
    <div>
      <label htmlFor={name}>{label}</label>
      {type === "textarea" ? (
        <textarea
          id={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
        />
      ) : (
        <input
          id={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
        />
      )}
      {error && <span>{error}</span>}
    </div>
  ),
}));

vi.mock("@/components/shared/pickers", () => ({
  UserPicker: ({
    label,
    displayValue,
    onChange,
    placeholder,
  }: {
    label: string;
    displayValue?: string;
    onChange: (id?: string, name?: string) => void;
    placeholder?: string;
  }) => (
    <div>
      <label>{label}</label>
      <button type="button" onClick={() => onChange("user-1", "Jane Owner")}>
        {displayValue || placeholder || "Pick user"}
      </button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: ITSM hooks
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

// Import after mocks
import ProblemsPage from "../problems/page";

function setLoadedState() {
  mockUseProblems.mockReturnValue({
    data: {
      data: [
        {
          id: "problem-1",
          problemNumber: "PRB-001",
          title: "Recurring DNS resolution failures",
          status: "investigating",
          description: "DNS queries intermittently fail across branches.",
          rootCause: "Forwarder saturation",
          workaround: "Restart the DNS forwarder service",
          permanentFix: "Move to a larger caching tier",
          ownerId: "owner-1",
          linkedIncidentIds: ["inc-1", "inc-2"],
          linkedChangeId: "chg-101",
          createdAt: "2026-03-27T09:00:00.000Z",
          updatedAt: "2026-03-28T11:00:00.000Z",
          tenantId: "tenant-1",
        },
      ],
      meta: {
        page: 1,
        pageSize: 12,
        totalItems: 1,
        totalPages: 1,
      },
    },
    isLoading: false,
  });

  mockUseKnownErrors.mockImplementation((problemId?: string) => {
    if (problemId) {
      return {
        data: [
          {
            id: "ke-problem-1",
            problemId,
            title: "Branch DNS workaround",
            workaround: "Restart the forwarder and flush the cache.",
            status: "published",
            createdAt: "2026-03-27T12:00:00.000Z",
            updatedAt: "2026-03-28T08:00:00.000Z",
          },
        ],
        isLoading: false,
      };
    }

    return {
      data: [
        {
          id: "ke-global-1",
          problemId: "problem-1",
          title: "Branch DNS workaround",
          workaround: "Restart the forwarder and flush the cache.",
          status: "published",
          createdAt: "2026-03-27T12:00:00.000Z",
          updatedAt: "2026-03-28T08:00:00.000Z",
        },
      ],
      isLoading: false,
    };
  });
}

function setEmptyState() {
  mockUseProblems.mockReturnValue({
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 12,
        totalItems: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  });

  mockUseKnownErrors.mockReturnValue({
    data: [],
    isLoading: false,
  });
}

describe("ProblemsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateProblem.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseCreateKnownError.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders the upgraded investigation workspace", () => {
    setLoadedState();

    render(<ProblemsPage />);

    expect(screen.getByText("Problem Management")).toBeInTheDocument();
    expect(screen.getByText(/Investigation workspace/)).toBeInTheDocument();
    expect(screen.getByText("Problems tracked")).toBeInTheDocument();
    expect(screen.getByText("Current board mix")).toBeInTheDocument();
    expect(screen.getByText("Known error library")).toBeInTheDocument();

    expect(screen.getByText("Recurring DNS resolution failures")).toBeInTheDocument();
    expect(screen.getByText("Branch DNS workaround")).toBeInTheDocument();
    expect(screen.getAllByText("Investigating").length).toBeGreaterThan(0);
  });

  it("reveals the create form when New Problem is clicked", async () => {
    setLoadedState();
    const user = userEvent.setup();

    render(<ProblemsPage />);

    await user.click(screen.getByRole("button", { name: "New Problem" }));

    expect(screen.getByText("Create a problem record")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Problem" })).toBeInTheDocument();
  });

  it("renders the stronger empty state when no problems exist", () => {
    setEmptyState();

    render(<ProblemsPage />);

    expect(screen.getByText("No problems found")).toBeInTheDocument();
    expect(
      screen.getByText(/Create a problem record to connect repeated incidents/),
    ).toBeInTheDocument();
  });
});

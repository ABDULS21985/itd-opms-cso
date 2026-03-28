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
      <button type="button" onClick={() => onChange("user-42", "Ada Hire")}>
        {displayValue || placeholder || "Pick user"}
      </button>
    </div>
  ),
}));

const mockUseChecklists = vi.fn();
const mockUseChecklistTasks = vi.fn();
const mockUseCompleteChecklistTask = vi.fn();
const mockUseCreateChecklist = vi.fn();
const mockUseUpdateChecklistStatus = vi.fn();
const mockUseDeleteChecklist = vi.fn();
const mockUseChecklistTemplates = vi.fn();
const mockUseCreateChecklistTemplate = vi.fn();
const mockUseUpdateChecklistTemplate = vi.fn();
const mockUseDeleteChecklistTemplate = vi.fn();
const mockUseCreateChecklistTask = vi.fn();
const mockUseDeleteChecklistTask = vi.fn();

vi.mock("@/hooks/use-people", () => ({
  useChecklists: (...args: unknown[]) => mockUseChecklists(...args),
  useChecklistTasks: (...args: unknown[]) => mockUseChecklistTasks(...args),
  useCompleteChecklistTask: (...args: unknown[]) =>
    mockUseCompleteChecklistTask(...args),
  useCreateChecklist: (...args: unknown[]) => mockUseCreateChecklist(...args),
  useUpdateChecklistStatus: (...args: unknown[]) =>
    mockUseUpdateChecklistStatus(...args),
  useDeleteChecklist: (...args: unknown[]) => mockUseDeleteChecklist(...args),
  useChecklistTemplates: (...args: unknown[]) =>
    mockUseChecklistTemplates(...args),
  useCreateChecklistTemplate: (...args: unknown[]) =>
    mockUseCreateChecklistTemplate(...args),
  useUpdateChecklistTemplate: (...args: unknown[]) =>
    mockUseUpdateChecklistTemplate(...args),
  useDeleteChecklistTemplate: (...args: unknown[]) =>
    mockUseDeleteChecklistTemplate(...args),
  useCreateChecklistTask: (...args: unknown[]) =>
    mockUseCreateChecklistTask(...args),
  useDeleteChecklistTask: (...args: unknown[]) =>
    mockUseDeleteChecklistTask(...args),
}));

import OnboardingPage from "../onboarding/page";

const pagedChecklists = [
  {
    id: "checklist-1",
    tenantId: "tenant-1",
    templateId: "template-1",
    userId: "new-hire-001",
    type: "onboarding",
    status: "in_progress",
    completionPct: 64,
    startedAt: "2026-03-25T09:00:00.000Z",
    createdAt: "2026-03-24T09:00:00.000Z",
    updatedAt: "2026-03-27T09:00:00.000Z",
  },
  {
    id: "checklist-2",
    tenantId: "tenant-1",
    templateId: "template-2",
    userId: "new-hire-002",
    type: "onboarding",
    status: "pending",
    completionPct: 18,
    createdAt: "2026-03-26T09:00:00.000Z",
    updatedAt: "2026-03-27T09:00:00.000Z",
  },
];

const allChecklists = [
  ...pagedChecklists,
  {
    id: "checklist-3",
    tenantId: "tenant-1",
    templateId: "template-1",
    userId: "new-hire-003",
    type: "onboarding",
    status: "completed",
    completionPct: 100,
    completedAt: "2026-03-27T17:00:00.000Z",
    createdAt: "2026-03-21T09:00:00.000Z",
    updatedAt: "2026-03-27T17:00:00.000Z",
  },
];

const templates = [
  {
    id: "template-1",
    tenantId: "tenant-1",
    type: "onboarding",
    name: "Security Analyst Launch",
    roleType: "analyst",
    tasks: [
      { title: "Issue laptop", required: true },
      { title: "Grant SIEM access", required: true },
      { title: "Schedule shadow shift" },
    ],
    isActive: true,
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-26T09:00:00.000Z",
  },
  {
    id: "template-2",
    tenantId: "tenant-1",
    type: "onboarding",
    name: "Field Support Sprint",
    roleType: "support",
    tasks: [{ title: "Schedule walkthrough", required: true }],
    isActive: false,
    createdAt: "2026-03-03T09:00:00.000Z",
    updatedAt: "2026-03-20T09:00:00.000Z",
  },
];

function setMutationMocks() {
  mockUseChecklistTasks.mockReturnValue({ data: [], isLoading: false });
  mockUseCompleteChecklistTask.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockUseCreateChecklist.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mockUseUpdateChecklistStatus.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockUseDeleteChecklist.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mockUseCreateChecklistTemplate.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockUseUpdateChecklistTemplate.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockUseDeleteChecklistTemplate.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockUseCreateChecklistTask.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockUseDeleteChecklistTask.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
}

function setLoadedState() {
  mockUseChecklists.mockImplementation((_page: number, limit: number) => ({
    data: {
      data: limit === 100 ? allChecklists : pagedChecklists,
      meta: {
        page: 1,
        pageSize: limit,
        totalItems:
          limit === 100 ? allChecklists.length : pagedChecklists.length,
        totalPages: 1,
      },
    },
    isLoading: false,
  }));

  mockUseChecklistTemplates.mockReturnValue({
    data: templates,
    isLoading: false,
  });
}

function setEmptyState() {
  mockUseChecklists.mockReturnValue({
    data: {
      data: [],
      meta: {
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
      },
    },
    isLoading: false,
  });

  mockUseChecklistTemplates.mockReturnValue({
    data: [],
    isLoading: false,
  });
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMutationMocks();
  });

  it("renders the upgraded onboarding workspace", () => {
    setLoadedState();

    render(<OnboardingPage />);

    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByText(/Onboarding pulse/)).toBeInTheDocument();
    expect(screen.getByText("Active onboarding runs")).toBeInTheDocument();
    expect(screen.getByText("new-hire-001")).toBeInTheDocument();
    expect(screen.getAllByText("Security Analyst Launch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Start Onboarding").length).toBeGreaterThan(0);
  });

  it("opens the create onboarding modal from the hero action", async () => {
    setLoadedState();
    const user = userEvent.setup();

    render(<OnboardingPage />);

    await user.click(screen.getByRole("button", { name: "Start Onboarding" }));

    expect(screen.getByText("Start New Onboarding")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("Template (Optional)")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Start Onboarding" }).length,
    ).toBeGreaterThan(1);
  });

  it("switches into the template studio view", async () => {
    setLoadedState();
    const user = userEvent.setup();

    render(<OnboardingPage />);

    await user.click(screen.getByRole("button", { name: "Manage Templates" }));

    expect(screen.getByText("Template studio")).toBeInTheDocument();
    expect(
      screen.getByText("Build repeatable onboarding blueprints"),
    ).toBeInTheDocument();
    expect(screen.getByText("Security Analyst Launch")).toBeInTheDocument();
    expect(screen.getByText("Field Support Sprint")).toBeInTheDocument();
  });

  it("renders the stronger empty state when no onboarding runs exist", () => {
    setEmptyState();

    render(<OnboardingPage />);

    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(
      screen.getByText("No onboarding checklists yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Start a new onboarding to begin tracking the setup process for new team members./,
      ),
    ).toBeInTheDocument();
  });
});

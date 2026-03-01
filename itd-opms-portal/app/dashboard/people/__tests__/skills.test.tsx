import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@/test/test-utils";
import { render } from "@/test/test-utils";

// =============================================================================
// Mock: framer-motion
// =============================================================================
vi.mock("framer-motion", () => {
  const React = require("react");
  const motion = new Proxy(
    {},
    {
      get:
        (_target: unknown, prop: string) =>
        ({ children, ...rest }: Record<string, unknown>) =>
          React.createElement(prop, rest, children),
    },
  );
  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// =============================================================================
// Mock: @/hooks/use-people
// =============================================================================
const mockUseSkillCategories = vi.fn();
const mockUseSkills = vi.fn();
const mockUseUsersBySkill = vi.fn();

vi.mock("@/hooks/use-people", () => ({
  useSkillCategories: (...args: unknown[]) => mockUseSkillCategories(...args),
  useSkills: (...args: unknown[]) => mockUseSkills(...args),
  useUsersBySkill: (...args: unknown[]) => mockUseUsersBySkill(...args),
}));

// =============================================================================
// Import after mocks
// =============================================================================
import SkillsPage from "../skills/page";

// =============================================================================
// Test data
// =============================================================================
const mockCategories = [
  {
    id: "cat-1",
    name: "Cloud Engineering",
    parentId: null,
    tenantId: "tenant-1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "cat-2",
    name: "Security Operations",
    parentId: null,
    tenantId: "tenant-1",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

const mockSkills = [
  {
    id: "skill-1",
    name: "AWS Solutions Architecture",
    description: "Designing and deploying scalable AWS solutions",
    categoryId: "cat-1",
    tenantId: "tenant-1",
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "skill-2",
    name: "Incident Response",
    description: "Handling security incidents effectively",
    categoryId: "cat-2",
    tenantId: "tenant-1",
    createdAt: "2025-02-01T00:00:00Z",
    updatedAt: "2025-02-01T00:00:00Z",
  },
  {
    id: "skill-3",
    name: "Kubernetes Administration",
    description: null,
    categoryId: "cat-1",
    tenantId: "tenant-1",
    createdAt: "2025-03-01T00:00:00Z",
    updatedAt: "2025-03-01T00:00:00Z",
  },
];

const mockSkillsMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 3,
  totalPages: 1,
};

// =============================================================================
// Tests
// =============================================================================
describe("SkillsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: useUsersBySkill returns nothing (not expanded)
    mockUseUsersBySkill.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders the page header with title and description", { timeout: 15000 }, () => {
    mockUseSkillCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });
    mockUseSkills.mockReturnValue({
      data: { data: mockSkills, meta: mockSkillsMeta },
      isLoading: false,
    });

    render(<SkillsPage />);

    expect(screen.getByText("Skills Directory")).toBeInTheDocument();
    expect(
      screen.getByText("Browse skill categories and track team proficiencies"),
    ).toBeInTheDocument();
  });

  it("renders loading state while skills are being fetched", () => {
    mockUseSkillCategories.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    mockUseSkills.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<SkillsPage />);

    // The page shows a Loader2 spinner when skills are loading
    expect(screen.queryByText("AWS Solutions Architecture")).not.toBeInTheDocument();
    expect(screen.queryByText("No skills found")).not.toBeInTheDocument();
  });

  it("renders empty state when there are no skills", () => {
    mockUseSkillCategories.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseSkills.mockReturnValue({
      data: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } },
      isLoading: false,
    });

    render(<SkillsPage />);

    expect(screen.getByText("No skills found")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first skill to start building the directory."),
    ).toBeInTheDocument();
  });

  it("renders skill cards when data is available", () => {
    mockUseSkillCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });
    mockUseSkills.mockReturnValue({
      data: { data: mockSkills, meta: mockSkillsMeta },
      isLoading: false,
    });

    render(<SkillsPage />);

    expect(screen.getByText("AWS Solutions Architecture")).toBeInTheDocument();
    expect(screen.getByText("Incident Response")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes Administration")).toBeInTheDocument();
  });

  it("shows skill descriptions when available", () => {
    mockUseSkillCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });
    mockUseSkills.mockReturnValue({
      data: { data: mockSkills, meta: mockSkillsMeta },
      isLoading: false,
    });

    render(<SkillsPage />);

    expect(
      screen.getByText("Designing and deploying scalable AWS solutions"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Handling security incidents effectively"),
    ).toBeInTheDocument();
  });

  it("shows the search bar for filtering skills", () => {
    mockUseSkillCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });
    mockUseSkills.mockReturnValue({
      data: { data: mockSkills, meta: mockSkillsMeta },
      isLoading: false,
    });

    render(<SkillsPage />);

    expect(screen.getByPlaceholderText("Search skills...")).toBeInTheDocument();
  });

  it("shows 'Add Category' and 'Add Skill' buttons", () => {
    mockUseSkillCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });
    mockUseSkills.mockReturnValue({
      data: { data: mockSkills, meta: mockSkillsMeta },
      isLoading: false,
    });

    render(<SkillsPage />);

    expect(screen.getByText("Add Category")).toBeInTheDocument();
    expect(screen.getByText("Add Skill")).toBeInTheDocument();
  });

  it("shows 'All Skills' option in the sidebar area", () => {
    mockUseSkillCategories.mockReturnValue({
      data: mockCategories,
      isLoading: false,
    });
    mockUseSkills.mockReturnValue({
      data: { data: mockSkills, meta: mockSkillsMeta },
      isLoading: false,
    });

    render(<SkillsPage />);

    expect(screen.getByText("All Skills")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
  });
});

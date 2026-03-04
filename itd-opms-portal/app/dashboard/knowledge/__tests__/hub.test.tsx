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
  usePathname: () => "/dashboard/knowledge",
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

// Mock next/link
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// Mock auth
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "admin@test.com",
      displayName: "Admin User",
    },
    isLoading: false,
    isLoggedIn: true,
  }),
}));

// ---------------------------------------------------------------------------
// Knowledge hook mocks
// ---------------------------------------------------------------------------

const mockUseKBArticles = vi.fn();
const mockUseKBCategories = vi.fn();
const mockUseAnnouncements = vi.fn();

vi.mock("@/hooks/use-knowledge", () => ({
  useKBArticles: (...args: any[]) => mockUseKBArticles(...args),
  useKBCategories: (...args: any[]) => mockUseKBCategories(...args),
  useAnnouncements: (...args: any[]) => mockUseAnnouncements(...args),
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks
// ---------------------------------------------------------------------------

import KnowledgeHubPage from "../../knowledge/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KnowledgeHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page heading", () => {
    mockUseKBArticles.mockReturnValue({ data: undefined, isLoading: true });
    mockUseKBCategories.mockReturnValue({ data: undefined, isLoading: true });
    mockUseAnnouncements.mockReturnValue({ data: undefined, isLoading: true });

    render(<KnowledgeHubPage />);

    expect(screen.getByText("Knowledge Management")).toBeInTheDocument();
  });

  it("displays greeting with user display name", () => {
    mockUseKBArticles.mockReturnValue({ data: undefined, isLoading: true });
    mockUseKBCategories.mockReturnValue({ data: undefined, isLoading: true });
    mockUseAnnouncements.mockReturnValue({ data: undefined, isLoading: true });

    render(<KnowledgeHubPage />);

    // The greeting should contain the user display name
    expect(screen.getByText(/Admin User/)).toBeInTheDocument();
  });

  it("renders summary cards", () => {
    mockUseKBArticles.mockReturnValue({ data: undefined, isLoading: false });
    mockUseKBCategories.mockReturnValue({ data: undefined, isLoading: false });
    mockUseAnnouncements.mockReturnValue({ data: undefined, isLoading: false });

    render(<KnowledgeHubPage />);

    expect(screen.getByText("Published Articles")).toBeInTheDocument();
    expect(screen.getByText("Draft Articles")).toBeInTheDocument();
    // "Categories" appears in both the summary card and the module nav section
    const categoriesElements = screen.getAllByText("Categories");
    expect(categoriesElements.length).toBeGreaterThanOrEqual(1);
    // "Announcements" also appears in both sections
    const announcementElements = screen.getAllByText("Announcements");
    expect(announcementElements.length).toBeGreaterThanOrEqual(1);
  });

  it("displays summary card values when data is loaded", () => {
    // Published articles query (first call with status=published)
    mockUseKBArticles
      .mockReturnValueOnce({
        data: { meta: { totalItems: 25 } },
        isLoading: false,
      })
      // Draft articles query (second call with status=draft)
      .mockReturnValueOnce({
        data: { meta: { totalItems: 8 } },
        isLoading: false,
      });

    mockUseKBCategories.mockReturnValue({
      data: [
        { id: "c-1", name: "IT" },
        { id: "c-2", name: "HR" },
        { id: "c-3", name: "Engineering" },
      ],
      isLoading: false,
    });

    mockUseAnnouncements.mockReturnValue({
      data: { meta: { totalItems: 4 } },
      isLoading: false,
    });

    render(<KnowledgeHubPage />);

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders quick action links", () => {
    mockUseKBArticles.mockReturnValue({ data: undefined, isLoading: true });
    mockUseKBCategories.mockReturnValue({ data: undefined, isLoading: true });
    mockUseAnnouncements.mockReturnValue({ data: undefined, isLoading: true });

    render(<KnowledgeHubPage />);

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Create Article")).toBeInTheDocument();
    expect(screen.getByText("Create Category")).toBeInTheDocument();
    expect(screen.getByText("New Announcement")).toBeInTheDocument();
  });

  it("renders knowledge module navigation cards", () => {
    mockUseKBArticles.mockReturnValue({ data: undefined, isLoading: true });
    mockUseKBCategories.mockReturnValue({ data: undefined, isLoading: true });
    mockUseAnnouncements.mockReturnValue({ data: undefined, isLoading: true });

    render(<KnowledgeHubPage />);

    expect(screen.getByText("Knowledge Modules")).toBeInTheDocument();
    expect(screen.getByText("Articles")).toBeInTheDocument();
    // "Categories" is also a summary card, so check for the module description
    expect(
      screen.getByText(
        "Organize articles into hierarchical categories for easy navigation",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Full-text search across all articles and knowledge content",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Publish and manage announcements for teams and the organization",
      ),
    ).toBeInTheDocument();
  });

  it("shows placeholder dashes when data values are undefined", () => {
    mockUseKBArticles.mockReturnValue({ data: undefined, isLoading: false });
    mockUseKBCategories.mockReturnValue({ data: undefined, isLoading: false });
    mockUseAnnouncements.mockReturnValue({ data: undefined, isLoading: false });

    render(<KnowledgeHubPage />);

    // When value is undefined, the card shows "--"
    const dashes = screen.getAllByText("--");
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });
});

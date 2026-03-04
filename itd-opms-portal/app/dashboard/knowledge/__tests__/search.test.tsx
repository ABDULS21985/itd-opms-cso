import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent, waitFor, act } from "@/test/test-utils";

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
  usePathname: () => "/dashboard/knowledge/search",
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
    p: ({ children, ...props }: any) => {
      const {
        initial, animate, exit, transition, whileHover, whileTap,
        whileFocus, layout, layoutId, variants, ...rest
      } = props;
      return <p {...rest}>{children}</p>;
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

// ---------------------------------------------------------------------------
// Knowledge hook mocks
// ---------------------------------------------------------------------------

const mockUseSearchKBArticles = vi.fn();

vi.mock("@/hooks/use-knowledge", () => ({
  useSearchKBArticles: (...args: any[]) => mockUseSearchKBArticles(...args),
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER mocks
// ---------------------------------------------------------------------------

import KnowledgeSearchPage from "../../knowledge/search/page";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KnowledgeSearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchKBArticles.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
    });
  });

  it("renders page heading and description", () => {
    render(<KnowledgeSearchPage />);

    expect(screen.getByText("Search Knowledge Base")).toBeInTheDocument();
    expect(
      screen.getByText("Find articles, how-tos, runbooks, and troubleshooting guides."),
    ).toBeInTheDocument();
  });

  it("renders the search input with placeholder", () => {
    render(<KnowledgeSearchPage />);

    expect(
      screen.getByPlaceholderText("Search articles by title, content, or tags..."),
    ).toBeInTheDocument();
  });

  it("renders back link to Knowledge Hub", () => {
    render(<KnowledgeSearchPage />);

    expect(screen.getByText("Back to Knowledge Hub")).toBeInTheDocument();
  });

  it("shows initial state when no search query is entered", () => {
    render(<KnowledgeSearchPage />);

    expect(screen.getByText("Search the Knowledge Base")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Start typing to search across all articles, how-tos, runbooks, and troubleshooting guides.",
      ),
    ).toBeInTheDocument();
  });

  it("displays search results after typing and debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const mockArticles = [
      {
        id: "art-1",
        title: "How to configure VPN",
        slug: "how-to-configure-vpn",
        content: "This guide explains step-by-step how to configure a VPN connection.",
        type: "how_to",
        status: "published",
        publishedAt: "2025-03-10T08:00:00Z",
        viewCount: 150,
        tags: ["vpn", "networking"],
      },
    ];

    // The mock will return results whenever called with a non-empty query
    mockUseSearchKBArticles.mockImplementation((query: string) => {
      if (query && query.length > 0) {
        return {
          data: {
            data: mockArticles,
            meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          },
          isLoading: false,
          isFetching: false,
        };
      }
      return { data: undefined, isLoading: false, isFetching: false };
    });

    render(<KnowledgeSearchPage />);

    const input = screen.getByPlaceholderText("Search articles by title, content, or tags...");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input, "VPN");

    // Advance past the 400ms debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("How to configure VPN")).toBeInTheDocument();
    });

    vi.useRealTimers();
  }, 15000);

  it("shows empty state when search returns no results", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockUseSearchKBArticles.mockImplementation((query: string) => {
      if (query && query.length > 0) {
        return {
          data: {
            data: [],
            meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
          },
          isLoading: false,
          isFetching: false,
        };
      }
      return { data: undefined, isLoading: false, isFetching: false };
    });

    render(<KnowledgeSearchPage />);

    const input = screen.getByPlaceholderText("Search articles by title, content, or tags...");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input, "nonexistent");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    vi.useRealTimers();
  }, 15000);

  it("displays article metadata including view count and tags", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const mockArticles = [
      {
        id: "art-1",
        title: "DNS Troubleshooting Guide",
        slug: "dns-troubleshooting-guide",
        content: "A comprehensive guide to diagnosing and resolving DNS issues.",
        type: "troubleshooting",
        status: "published",
        publishedAt: "2025-02-20T10:00:00Z",
        viewCount: 320,
        tags: ["dns", "networking", "infrastructure", "troubleshooting"],
      },
    ];

    mockUseSearchKBArticles.mockImplementation((query: string) => {
      if (query && query.length > 0) {
        return {
          data: {
            data: mockArticles,
            meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
          },
          isLoading: false,
          isFetching: false,
        };
      }
      return { data: undefined, isLoading: false, isFetching: false };
    });

    render(<KnowledgeSearchPage />);

    const input = screen.getByPlaceholderText("Search articles by title, content, or tags...");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.type(input, "DNS");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("DNS Troubleshooting Guide")).toBeInTheDocument();
    });

    expect(screen.getByText("320 views")).toBeInTheDocument();
    expect(screen.getByText("dns")).toBeInTheDocument();
    expect(screen.getByText("networking")).toBeInTheDocument();
    expect(screen.getByText("infrastructure")).toBeInTheDocument();
    // Only 3 tags shown, 4th is "+1 more"
    expect(screen.getByText("+1 more")).toBeInTheDocument();

    vi.useRealTimers();
  }, 15000);
});

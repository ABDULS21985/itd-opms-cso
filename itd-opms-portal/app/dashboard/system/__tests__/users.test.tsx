import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";

// =============================================================================
// Mocks
// =============================================================================

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/system/users",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockUseUsers = vi.fn();
const mockUseRoles = vi.fn();
const mockDeactivateMutate = vi.fn();

vi.mock("@/hooks/use-system", () => ({
  useUsers: (...args: unknown[]) => mockUseUsers(...args),
  useRoles: (...args: unknown[]) => mockUseRoles(...args),
  useDeactivateUser: () => ({
    mutate: mockDeactivateMutate,
    isPending: false,
  }),
}));

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "admin@example.com",
      displayName: "Admin",
      permissions: ["*"],
    },
    isLoading: false,
  }),
}));

vi.mock("@/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const {
        initial: _i,
        animate: _a,
        transition: _t,
        exit: _e,
        whileHover: _wh,
        whileTap: _wt,
        ...rest
      } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import UsersPage from "../users/page";

// =============================================================================
// Test Data
// =============================================================================

const mockUsers = [
  {
    id: "u1",
    email: "john@example.com",
    displayName: "John Doe",
    department: "IT",
    isActive: true,
    roles: [{ roleName: "global_admin", roleId: "r1" }],
    lastLoginAt: "2025-01-15T10:00:00Z",
    photoUrl: null,
  },
  {
    id: "u2",
    email: "jane@example.com",
    displayName: "Jane Smith",
    department: "Finance",
    isActive: false,
    roles: [
      { roleName: "manager", roleId: "r2" },
      { roleName: "analyst", roleId: "r3" },
    ],
    lastLoginAt: null,
    photoUrl: "https://example.com/photo.jpg",
  },
];

const mockMeta = {
  page: 1,
  pageSize: 20,
  totalItems: 2,
  totalPages: 1,
};

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockUseUsers.mockReturnValue({
    data: { data: mockUsers, meta: mockMeta },
    isLoading: false,
  });
  mockUseRoles.mockReturnValue({
    data: [
      { name: "global_admin", id: "r1" },
      { name: "manager", id: "r2" },
    ],
  });
});

// =============================================================================
// Tests
// =============================================================================

describe("UsersPage", () => {
  it("renders the page header", async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
    });
  }, 15_000);

  it("renders user list with user details", async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("displays total user count from meta", async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("2 users total")).toBeInTheDocument();
    });
  });

  it("shows loading state when data is loading", async () => {
    mockUseUsers.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<UsersPage />);

    // When loading and no meta, the subtitle shows the default text
    await waitFor(() => {
      expect(
        screen.getByText("Manage users, roles, and access"),
      ).toBeInTheDocument();
    });
  });

  it("shows department for each user", async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("IT")).toBeInTheDocument();
    });
    expect(screen.getByText("Finance")).toBeInTheDocument();
  });

  it("renders role badges for users", async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("global admin")).toBeInTheDocument();
    });
  });

  it("renders Add User button", async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Add User")).toBeInTheDocument();
    });
  });

  it("renders Filters button", async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Filters")).toBeInTheDocument();
    });
  });

  it("renders search input", async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Search users by name or email..."),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no users", async () => {
    mockUseUsers.mockReturnValue({
      data: { data: [], meta: { ...mockMeta, totalItems: 0 } },
      isLoading: false,
    });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("No users found")).toBeInTheDocument();
    });
  });
});

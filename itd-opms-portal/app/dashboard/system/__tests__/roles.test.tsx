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
  usePathname: () => "/dashboard/system/roles",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockUseRoles = vi.fn();
const mockCreateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("@/hooks/use-system", () => ({
  useRoles: (...args: unknown[]) => mockUseRoles(...args),
  useCreateRole: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useDeleteRole: () => ({
    mutate: mockDeleteMutate,
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

import RolesPage from "../roles/page";

// =============================================================================
// Test Data
// =============================================================================

const mockRoles = [
  {
    id: "role-1",
    name: "global_admin",
    description: "Full system administrator",
    isSystem: true,
    userCount: 3,
    permissions: ["*"],
  },
  {
    id: "role-2",
    name: "manager",
    description: "Department manager role",
    isSystem: false,
    userCount: 12,
    permissions: ["read", "write", "approve"],
  },
  {
    id: "role-3",
    name: "viewer",
    description: "",
    isSystem: false,
    userCount: 0,
    permissions: ["read"],
  },
];

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRoles.mockReturnValue({
    data: mockRoles,
    isLoading: false,
  });
});

// =============================================================================
// Tests
// =============================================================================

describe("RolesPage", () => {
  it("renders page header", async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText("Roles & Permissions")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Manage system and custom roles with their associated permissions",
      ),
    ).toBeInTheDocument();
  }, 15_000);

  it("renders role list", async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText("global_admin")).toBeInTheDocument();
    });
    expect(screen.getByText("manager")).toBeInTheDocument();
    expect(screen.getByText("viewer")).toBeInTheDocument();
  });

  it("displays role descriptions", async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Full system administrator"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Department manager role")).toBeInTheDocument();
  });

  it("shows user counts for each role", async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText("3 users")).toBeInTheDocument();
    });
    expect(screen.getByText("12 users")).toBeInTheDocument();
    expect(screen.getByText("0 users")).toBeInTheDocument();
  });

  it("shows permission counts for each role", async () => {
    render(<RolesPage />);

    await waitFor(() => {
      const singlePermissions = screen.getAllByText("1 permission");
      expect(singlePermissions.length).toBe(2); // role-1 (1 perm) and role-3 (1 perm)
    });
    expect(screen.getByText("3 permissions")).toBeInTheDocument();
  });

  it("shows System Role badge for system roles", async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText("System Role")).toBeInTheDocument();
    });
  });

  it("shows Custom badge for custom roles", async () => {
    render(<RolesPage />);

    await waitFor(() => {
      const customBadges = screen.getAllByText("Custom");
      expect(customBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("renders Create Role button", async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText("Create Role")).toBeInTheDocument();
    });
  });

  it("shows loading skeleton when loading", async () => {
    mockUseRoles.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<RolesPage />);

    await waitFor(() => {
      const pulsingElements = container.querySelectorAll(".animate-pulse");
      expect(pulsingElements.length).toBeGreaterThan(0);
    });
  });

  it("shows empty state when no roles", async () => {
    mockUseRoles.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<RolesPage />);

    await waitFor(() => {
      expect(screen.getByText("No roles found")).toBeInTheDocument();
    });
  });

  it("shows 'No description provided.' for roles without description", async () => {
    render(<RolesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No description provided."),
      ).toBeInTheDocument();
    });
  });
});

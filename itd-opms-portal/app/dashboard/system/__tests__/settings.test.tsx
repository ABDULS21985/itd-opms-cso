import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";

// =============================================================================
// Mocks
// =============================================================================

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard/system/settings",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockUseSettings = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock("@/hooks/use-system", () => ({
  useSettings: (...args: unknown[]) => mockUseSettings(...args),
  useUpdateSetting: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteSetting: () => ({
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
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

import SettingsPage from "../settings/page";

// =============================================================================
// Test Data
// =============================================================================

const mockSettings = [
  {
    key: "platform_name",
    value: "ITD OPMS",
    category: "general",
    tenantId: null,
  },
  {
    key: "tagline",
    value: "IT Operations Management",
    category: "general",
    tenantId: null,
  },
  {
    key: "timezone",
    value: "Africa/Lagos",
    category: "general",
    tenantId: null,
  },
  {
    key: "date_format",
    value: "DD/MM/YYYY",
    category: "general",
    tenantId: null,
  },
  {
    key: "items_per_page",
    value: "20",
    category: "general",
    tenantId: null,
  },
];

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSettings.mockReturnValue({
    data: mockSettings,
    isLoading: false,
  });
});

// =============================================================================
// Tests
// =============================================================================

describe("SettingsPage", () => {
  it("renders the page header", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("System Settings")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Configure platform behavior and integrations"),
    ).toBeInTheDocument();
  }, 15_000);

  it("renders all tab buttons", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("General")).toBeInTheDocument();
    });
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Branding")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
  });

  it("renders general settings form fields", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Platform Name")).toBeInTheDocument();
    });
    expect(screen.getByText("Tagline")).toBeInTheDocument();
    expect(screen.getByText("Default Timezone")).toBeInTheDocument();
    expect(screen.getByText("Date Format")).toBeInTheDocument();
    expect(screen.getByText("Items Per Page")).toBeInTheDocument();
  });

  it("renders setting descriptions", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Display name for the platform"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Short description shown on login page"),
    ).toBeInTheDocument();
  });

  it("renders Save Changes button", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Save Changes")).toBeInTheDocument();
    });
  });

  it("shows loading skeleton when settings are loading", async () => {
    mockUseSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<SettingsPage />);

    await waitFor(() => {
      const pulsingElements = container.querySelectorAll(".animate-pulse");
      expect(pulsingElements.length).toBeGreaterThan(0);
    });
  });

  it("populates form values from settings data", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      const inputs = screen.getAllByRole("textbox");
      const platformNameInput = inputs.find(
        (input) => (input as HTMLInputElement).value === "ITD OPMS",
      );
      expect(platformNameInput).toBeDefined();
    });
  });

  it("renders Global scope badges for settings without tenantId", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      const globalBadges = screen.getAllByText("Global");
      expect(globalBadges.length).toBeGreaterThan(0);
    });
  });
});

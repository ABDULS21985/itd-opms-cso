import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { PermissionGate } from "../permission-gate";

// ---------------------------------------------------------------------------
// Mock the auth provider
// ---------------------------------------------------------------------------
const mockUseAuth = vi.fn();

vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("PermissionGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when user has the required permission", () => {
    mockUseAuth.mockReturnValue({
      user: { permissions: ["itsm.manage"] },
      isLoading: false,
    });

    render(
      <PermissionGate permission="itsm.manage">
        <div>Protected Content</div>
      </PermissionGate>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders children when user has wildcard permission", () => {
    mockUseAuth.mockReturnValue({
      user: { permissions: ["*"] },
      isLoading: false,
    });

    render(
      <PermissionGate permission="any.permission">
        <div>Protected Content</div>
      </PermissionGate>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("shows access denied when user lacks the required permission", () => {
    mockUseAuth.mockReturnValue({
      user: { permissions: ["itsm.view"] },
      isLoading: false,
    });

    render(
      <PermissionGate permission="itsm.manage">
        <div>Protected Content</div>
      </PermissionGate>,
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.getByText(/itsm\.manage/)).toBeInTheDocument();
  });

  it("renders custom fallback when user lacks permission", () => {
    mockUseAuth.mockReturnValue({
      user: { permissions: [] },
      isLoading: false,
    });

    render(
      <PermissionGate
        permission="admin.manage"
        fallback={<div>Custom Fallback</div>}
      >
        <div>Protected Content</div>
      </PermissionGate>,
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Custom Fallback")).toBeInTheDocument();
  });

  it("renders nothing while loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { container } = render(
      <PermissionGate permission="itsm.manage">
        <div>Protected Content</div>
      </PermissionGate>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("shows access denied when user is null (not logged in)", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(
      <PermissionGate permission="itsm.manage">
        <div>Protected Content</div>
      </PermissionGate>,
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });
});

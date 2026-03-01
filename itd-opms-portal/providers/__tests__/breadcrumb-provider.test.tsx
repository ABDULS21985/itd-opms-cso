import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import React from "react";
import {
  BreadcrumbProvider,
  useBreadcrumbs,
  useBreadcrumbOverrides,
  type BreadcrumbItem,
} from "../breadcrumb-provider";

// =============================================================================
// BreadcrumbProvider rendering
// =============================================================================
describe("BreadcrumbProvider", () => {
  it("renders children", () => {
    render(
      <BreadcrumbProvider>
        <div data-testid="child">Hello Breadcrumbs</div>
      </BreadcrumbProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello Breadcrumbs")).toBeInTheDocument();
  });

  it("renders multiple children", () => {
    render(
      <BreadcrumbProvider>
        <div data-testid="child-1">First</div>
        <div data-testid="child-2">Second</div>
      </BreadcrumbProvider>,
    );

    expect(screen.getByTestId("child-1")).toBeInTheDocument();
    expect(screen.getByTestId("child-2")).toBeInTheDocument();
  });
});

// =============================================================================
// useBreadcrumbOverrides
// =============================================================================
describe("useBreadcrumbOverrides", () => {
  it("returns null when no overrides are set", () => {
    const { result } = renderHook(() => useBreadcrumbOverrides(), {
      wrapper: BreadcrumbProvider,
    });

    expect(result.current).toBeNull();
  });

  it("returns overrides set by useBreadcrumbs", () => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "Projects", href: "/projects" },
      { label: "My Project", href: "/projects/123" },
    ];

    function SetBreadcrumbs() {
      useBreadcrumbs(breadcrumbs);
      return null;
    }

    function ReadBreadcrumbs() {
      const overrides = useBreadcrumbOverrides();
      return (
        <div data-testid="overrides">
          {overrides ? JSON.stringify(overrides) : "null"}
        </div>
      );
    }

    render(
      <BreadcrumbProvider>
        <SetBreadcrumbs />
        <ReadBreadcrumbs />
      </BreadcrumbProvider>,
    );

    const el = screen.getByTestId("overrides");
    const parsed = JSON.parse(el.textContent!);
    expect(parsed).toEqual(breadcrumbs);
  });
});

// =============================================================================
// useBreadcrumbs
// =============================================================================
describe("useBreadcrumbs", () => {
  it("sets breadcrumb overrides on mount", () => {
    const items: BreadcrumbItem[] = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/dashboard/settings" },
    ];

    function TestComponent() {
      useBreadcrumbs(items);
      const overrides = useBreadcrumbOverrides();
      return (
        <div data-testid="result">
          {overrides ? overrides.map((o) => o.label).join(" > ") : "none"}
        </div>
      );
    }

    render(
      <BreadcrumbProvider>
        <TestComponent />
      </BreadcrumbProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe(
      "Dashboard > Settings",
    );
  });

  it("clears overrides on unmount", () => {
    const items: BreadcrumbItem[] = [
      { label: "Page", href: "/page" },
    ];

    function PageComponent() {
      useBreadcrumbs(items);
      return <div>Page Content</div>;
    }

    function ReaderComponent() {
      const overrides = useBreadcrumbOverrides();
      return (
        <div data-testid="reader">{overrides ? "has-overrides" : "null"}</div>
      );
    }

    const { rerender } = render(
      <BreadcrumbProvider>
        <PageComponent />
        <ReaderComponent />
      </BreadcrumbProvider>,
    );

    // Overrides should be set while PageComponent is mounted
    expect(screen.getByTestId("reader").textContent).toBe("has-overrides");

    // Unmount PageComponent — overrides should be cleared
    rerender(
      <BreadcrumbProvider>
        <ReaderComponent />
      </BreadcrumbProvider>,
    );

    expect(screen.getByTestId("reader").textContent).toBe("null");
  });

  it("updates when breadcrumb items change", () => {
    function TestComponent({ items }: { items: BreadcrumbItem[] }) {
      useBreadcrumbs(items);
      const overrides = useBreadcrumbOverrides();
      return (
        <div data-testid="result">
          {overrides ? overrides.map((o) => o.label).join(", ") : "none"}
        </div>
      );
    }

    const initialItems: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
    ];

    const updatedItems: BreadcrumbItem[] = [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
    ];

    const { rerender } = render(
      <BreadcrumbProvider>
        <TestComponent items={initialItems} />
      </BreadcrumbProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("Home");

    rerender(
      <BreadcrumbProvider>
        <TestComponent items={updatedItems} />
      </BreadcrumbProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("Home, About");
  });
});

// =============================================================================
// Context without provider
// =============================================================================
describe("context without provider", () => {
  it("useBreadcrumbOverrides returns null without provider", () => {
    const { result } = renderHook(() => useBreadcrumbOverrides());
    expect(result.current).toBeNull();
  });
});

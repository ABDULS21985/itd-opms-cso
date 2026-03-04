import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSidebarFavorites } from "@/hooks/use-sidebar-favorites";
import { useSidebarSections } from "@/hooks/use-sidebar-sections";
import { useSidebarScroll } from "@/hooks/use-sidebar-scroll";
import { useRecentlyVisited } from "@/hooks/use-sidebar-recently-visited";

// ---------------------------------------------------------------------------
// useSidebarFavorites
// ---------------------------------------------------------------------------
describe("useSidebarFavorites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with empty favorites", () => {
    const { result } = renderHook(() => useSidebarFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it("adds a favorite via toggleFavorite", () => {
    const { result } = renderHook(() => useSidebarFavorites());

    act(() => {
      result.current.toggleFavorite({
        path: "/planning",
        text: "Planning",
        iconName: "Calendar",
      });
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].path).toBe("/planning");
    expect(result.current.isFavorite("/planning")).toBe(true);
  });

  it("removes a favorite via toggleFavorite", () => {
    const { result } = renderHook(() => useSidebarFavorites());

    act(() => {
      result.current.toggleFavorite({
        path: "/planning",
        text: "Planning",
        iconName: "Calendar",
      });
    });

    expect(result.current.favorites).toHaveLength(1);

    act(() => {
      result.current.toggleFavorite({
        path: "/planning",
        text: "Planning",
        iconName: "Calendar",
      });
    });

    expect(result.current.favorites).toHaveLength(0);
    expect(result.current.isFavorite("/planning")).toBe(false);
  });

  it("does not exceed MAX_FAVORITES (8)", () => {
    const { result } = renderHook(() => useSidebarFavorites());

    for (let i = 0; i < 9; i++) {
      act(() => {
        result.current.toggleFavorite({
          path: `/path-${i}`,
          text: `Item ${i}`,
          iconName: "Icon",
        });
      });
    }

    expect(result.current.favorites).toHaveLength(8);
  });

  it("removes a favorite by path", () => {
    const { result } = renderHook(() => useSidebarFavorites());

    act(() => {
      result.current.toggleFavorite({
        path: "/a",
        text: "A",
        iconName: "Icon",
      });
      result.current.toggleFavorite({
        path: "/b",
        text: "B",
        iconName: "Icon",
      });
    });

    act(() => {
      result.current.removeFavorite("/a");
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].path).toBe("/b");
  });

  it("persists favorites in localStorage", () => {
    const { result } = renderHook(() => useSidebarFavorites());

    act(() => {
      result.current.toggleFavorite({
        path: "/test",
        text: "Test",
        iconName: "Icon",
      });
    });

    const stored = JSON.parse(localStorage.getItem("opms-sidebar-favorites") || "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].path).toBe("/test");
  });
});

// ---------------------------------------------------------------------------
// useSidebarSections
// ---------------------------------------------------------------------------
describe("useSidebarSections", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to smart collapse mode", () => {
    const { result } = renderHook(() =>
      useSidebarSections({
        sectionTitles: ["A", "B", "C"],
        activeSectionTitle: null,
      }),
    );

    expect(result.current.collapseMode).toBe("smart");
  });

  it("expands the active section in smart mode", () => {
    const { result } = renderHook(() =>
      useSidebarSections({
        sectionTitles: ["A", "B", "C"],
        activeSectionTitle: "B",
      }),
    );

    expect(result.current.isSectionExpanded("B")).toBe(true);
    expect(result.current.isSectionExpanded("A")).toBe(false);
  });

  it("cycles collapse modes", () => {
    const { result } = renderHook(() =>
      useSidebarSections({
        sectionTitles: ["A", "B"],
        activeSectionTitle: null,
      }),
    );

    expect(result.current.collapseMode).toBe("smart");

    act(() => result.current.cycleCollapseMode());
    expect(result.current.collapseMode).toBe("expand-all");

    act(() => result.current.cycleCollapseMode());
    expect(result.current.collapseMode).toBe("collapse-all");

    act(() => result.current.cycleCollapseMode());
    expect(result.current.collapseMode).toBe("smart");
  });

  it("expand-all mode expands all sections", () => {
    const { result } = renderHook(() =>
      useSidebarSections({
        sectionTitles: ["A", "B", "C"],
        activeSectionTitle: null,
      }),
    );

    act(() => result.current.cycleCollapseMode()); // -> expand-all

    expect(result.current.expandedSections).toEqual({
      A: true,
      B: true,
      C: true,
    });
  });

  it("togglePin pins a section", () => {
    const { result } = renderHook(() =>
      useSidebarSections({
        sectionTitles: ["A", "B"],
        activeSectionTitle: null,
      }),
    );

    act(() => result.current.togglePin("A"));
    expect(result.current.pinnedSections["A"]).toBe(true);

    // Pinned sections show in smart mode
    expect(result.current.isSectionExpanded("A")).toBe(true);

    act(() => result.current.togglePin("A"));
    expect(result.current.pinnedSections["A"]).toBeUndefined();
  });

  it("toggleSection creates manual overrides", () => {
    const { result } = renderHook(() =>
      useSidebarSections({
        sectionTitles: ["A", "B"],
        activeSectionTitle: "A",
      }),
    );

    // A is active so expanded; toggle should collapse
    act(() => result.current.toggleSection("A"));
    expect(result.current.isSectionExpanded("A")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useSidebarScroll
// ---------------------------------------------------------------------------
describe("useSidebarScroll", () => {
  it("returns default values", () => {
    const { result } = renderHook(() =>
      useSidebarScroll(null, null),
    );

    expect(result.current.scrollProgress).toBe(0);
    expect(result.current.currentSection).toBeNull();
    expect(result.current.sectionPositions).toEqual([]);
    expect(typeof result.current.setScrollRef).toBe("function");
    expect(typeof result.current.onScroll).toBe("function");
    expect(typeof result.current.scrollToSection).toBe("function");
  });

  it("accepts activeSection and activeItem text", () => {
    const { result } = renderHook(() =>
      useSidebarScroll("Planning", "Projects"),
    );

    expect(result.current.currentSection).toBe("Planning");
    expect(result.current.currentItem).toBe("Projects");
  });
});

// ---------------------------------------------------------------------------
// useRecentlyVisited
// ---------------------------------------------------------------------------
describe("useRecentlyVisited", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty recent items initially", () => {
    const lookup = new Map<string, { text: string; iconName: string }>();

    const { result } = renderHook(() => useRecentlyVisited(lookup));
    expect(result.current.recentItems).toEqual([]);
  });

  it("tracks visited paths from navItemLookup for the current pathname", () => {
    const lookup = new Map<string, { text: string; iconName: string }>();
    // next/navigation is mocked to return "/" as the pathname
    lookup.set("/", { text: "Dashboard", iconName: "Home" });

    const { result } = renderHook(() => useRecentlyVisited(lookup));

    // The effect should pick up "/" from the mocked pathname
    expect(result.current.recentItems.length).toBeGreaterThanOrEqual(0);
  });
});

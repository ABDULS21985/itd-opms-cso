import { describe, it, expect } from "vitest";
import { navGroups, type NavItem, type NavGroup } from "../navigation";

// =============================================================================
// navGroups structure
// =============================================================================
describe("navGroups", () => {
  it("is a non-empty array of navigation groups", () => {
    expect(Array.isArray(navGroups)).toBe(true);
    expect(navGroups.length).toBeGreaterThan(0);
  });

  it("each group has a label and items array", () => {
    navGroups.forEach((group: NavGroup) => {
      expect(typeof group.label).toBe("string");
      expect(group.label.length).toBeGreaterThan(0);
      expect(Array.isArray(group.items)).toBe(true);
      expect(group.items.length).toBeGreaterThan(0);
    });
  });

  it("each nav item has href, label, and icon", () => {
    navGroups.forEach((group: NavGroup) => {
      group.items.forEach((item: NavItem) => {
        expect(typeof item.href).toBe("string");
        expect(item.href.startsWith("/")).toBe(true);
        expect(typeof item.label).toBe("string");
        expect(item.label.length).toBeGreaterThan(0);
        expect(item.icon).toBeDefined();
      });
    });
  });

  it("all hrefs start with /dashboard", () => {
    navGroups.forEach((group: NavGroup) => {
      group.items.forEach((item: NavItem) => {
        expect(item.href.startsWith("/dashboard")).toBe(true);
      });
    });
  });

  it("has no duplicate hrefs", () => {
    const allHrefs = navGroups.flatMap((g) => g.items.map((i) => i.href));
    const uniqueHrefs = new Set(allHrefs);
    expect(uniqueHrefs.size).toBe(allHrefs.length);
  });
});

// =============================================================================
// Specific groups
// =============================================================================
describe("specific navigation groups", () => {
  it("contains an Overview group with Dashboard link", () => {
    const overview = navGroups.find((g) => g.label === "Overview");
    expect(overview).toBeDefined();
    const dashItem = overview!.items.find((i) => i.href === "/dashboard");
    expect(dashItem).toBeDefined();
    expect(dashItem!.label).toBe("Dashboard");
  });

  it("contains an Analytics group", () => {
    const analytics = navGroups.find((g) => g.label === "Analytics");
    expect(analytics).toBeDefined();
    expect(analytics!.items.length).toBeGreaterThan(0);
  });

  it("contains a Governance group with Policies and OKRs", () => {
    const governance = navGroups.find((g) => g.label === "Governance");
    expect(governance).toBeDefined();
    const policies = governance!.items.find((i) => i.label === "Policies");
    expect(policies).toBeDefined();
    const okrs = governance!.items.find((i) => i.label === "OKRs");
    expect(okrs).toBeDefined();
  });

  it("contains a People group", () => {
    const people = navGroups.find((g) => g.label === "People");
    expect(people).toBeDefined();
    expect(people!.items.length).toBeGreaterThan(0);
  });

  it("contains a Planning group with Projects and Work Items", () => {
    const planning = navGroups.find((g) => g.label === "Planning");
    expect(planning).toBeDefined();
    const projects = planning!.items.find((i) => i.label === "Projects");
    expect(projects).toBeDefined();
    const workItems = planning!.items.find((i) => i.label === "Work Items");
    expect(workItems).toBeDefined();
  });

  it("contains an ITSM group with Tickets", () => {
    const itsm = navGroups.find((g) => g.label === "ITSM");
    expect(itsm).toBeDefined();
    const tickets = itsm!.items.find((i) => i.label === "Tickets");
    expect(tickets).toBeDefined();
  });

  it("contains an Assets group", () => {
    const assets = navGroups.find((g) => g.label === "Assets");
    expect(assets).toBeDefined();
    expect(assets!.items.length).toBeGreaterThan(0);
  });

  it("contains a Knowledge group", () => {
    const knowledge = navGroups.find((g) => g.label === "Knowledge");
    expect(knowledge).toBeDefined();
    expect(knowledge!.items.length).toBeGreaterThan(0);
  });

  it("contains a GRC group", () => {
    const grc = navGroups.find((g) => g.label === "GRC");
    expect(grc).toBeDefined();
    expect(grc!.items.length).toBeGreaterThan(0);
  });

  it("contains a System group with Users and Roles", () => {
    const system = navGroups.find((g) => g.label === "System");
    expect(system).toBeDefined();
    const users = system!.items.find((i) => i.label === "Users");
    expect(users).toBeDefined();
    const roles = system!.items.find(
      (i) => i.label === "Roles & Permissions",
    );
    expect(roles).toBeDefined();
  });
});

// =============================================================================
// Permissions
// =============================================================================
describe("navigation permissions", () => {
  it("Dashboard has no permission requirement", () => {
    const overview = navGroups.find((g) => g.label === "Overview");
    const dashboard = overview!.items.find((i) => i.href === "/dashboard");
    expect(dashboard!.permission).toBeUndefined();
  });

  it("Analytics items require reporting.view permission", () => {
    const analytics = navGroups.find((g) => g.label === "Analytics");
    analytics!.items.forEach((item) => {
      expect(item.permission).toBe("reporting.view");
    });
  });

  it("Governance items require governance.view or approval.view", () => {
    const governance = navGroups.find((g) => g.label === "Governance");
    governance!.items.forEach((item) => {
      expect(["governance.view", "approval.view"]).toContain(item.permission);
    });
  });

  it("ITSM items require itsm.view permission", () => {
    const itsm = navGroups.find((g) => g.label === "ITSM");
    itsm!.items.forEach((item) => {
      expect(item.permission).toBe("itsm.view");
    });
  });

  it("all items except Dashboard have a permission string", () => {
    navGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.href !== "/dashboard") {
          expect(typeof item.permission).toBe("string");
          expect(item.permission!.length).toBeGreaterThan(0);
        }
      });
    });
  });
});

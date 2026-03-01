import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import {
  Skeleton,
  CardSkeleton,
  TableRowSkeleton,
  PageSkeleton,
} from "../loading-skeleton";

describe("Skeleton", () => {
  it("renders with aria-hidden", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild!;
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-24");
  });

  it("applies custom style", () => {
    const { container } = render(<Skeleton style={{ width: "200px" }} />);
    const el = container.firstElementChild!;
    expect(el).toHaveStyle({ width: "200px" });
  });

  it("has animate-pulse class", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild!;
    expect(el.className).toContain("animate-pulse");
  });
});

describe("CardSkeleton", () => {
  it("renders default 1 card", () => {
    const { container } = render(<CardSkeleton />);
    // The outer wrapper contains one card div
    const cards = container.querySelectorAll(":scope > div");
    expect(cards).toHaveLength(1);
  });

  it("renders specified count of cards", () => {
    const { container } = render(<CardSkeleton count={3} />);
    const cards = container.querySelectorAll(":scope > div");
    expect(cards).toHaveLength(3);
  });
});

describe("TableRowSkeleton", () => {
  it("renders default 5 rows with 5 columns", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRowSkeleton />
        </tbody>
      </table>,
    );
    const rows = container.querySelectorAll("tr");
    expect(rows).toHaveLength(5);
    // Each row should have 5 cells
    const firstRowCells = rows[0].querySelectorAll("td");
    expect(firstRowCells).toHaveLength(5);
  });

  it("renders custom rows and columns", () => {
    const { container } = render(
      <table>
        <tbody>
          <TableRowSkeleton rows={3} columns={2} />
        </tbody>
      </table>,
    );
    const rows = container.querySelectorAll("tr");
    expect(rows).toHaveLength(3);
    const firstRowCells = rows[0].querySelectorAll("td");
    expect(firstRowCells).toHaveLength(2);
  });
});

describe("PageSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<PageSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("contains skeleton pulse elements", () => {
    const { container } = render(<PageSkeleton />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});

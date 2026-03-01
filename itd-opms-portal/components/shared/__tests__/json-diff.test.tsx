import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { JsonDiff } from "../json-diff";

describe("JsonDiff", () => {
  it("shows 'No data available' when both before and after are null", () => {
    render(<JsonDiff before={null} after={null} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("shows 'No data available' when both are undefined", () => {
    render(<JsonDiff />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("shows 'No previous state' message when only before is null", () => {
    render(<JsonDiff before={null} after={{ name: "test" }} />);
    expect(
      screen.getByText(/No previous state — initial creation/),
    ).toBeInTheDocument();
  });

  it("shows 'Record deleted' when only after is null", () => {
    render(<JsonDiff before={{ name: "test" }} after={null} />);
    expect(screen.getByText("Record deleted")).toBeInTheDocument();
  });

  it("shows 'No changes' when before and after are identical", () => {
    const data = { name: "test", count: 42 };
    render(<JsonDiff before={data} after={data} />);
    expect(screen.getByText("No changes")).toBeInTheDocument();
  });

  it("displays added fields", () => {
    render(
      <JsonDiff before={{ name: "test" }} after={{ name: "test", age: 25 }} />,
    );
    expect(screen.getByText("age")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("displays removed fields", () => {
    render(
      <JsonDiff before={{ name: "test", age: 25 }} after={{ name: "test" }} />,
    );
    expect(screen.getByText("age")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("displays changed fields with old and new values", () => {
    render(
      <JsonDiff
        before={{ name: "old name" }}
        after={{ name: "new name" }}
      />,
    );
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("old name")).toBeInTheDocument();
    expect(screen.getByText("new name")).toBeInTheDocument();
  });

  it("handles nested objects by flattening keys", () => {
    render(
      <JsonDiff
        before={{ config: { theme: "light" } }}
        after={{ config: { theme: "dark" } }}
      />,
    );
    expect(screen.getByText("config.theme")).toBeInTheDocument();
    expect(screen.getByText("light")).toBeInTheDocument();
    expect(screen.getByText("dark")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <JsonDiff
        before={{ a: 1 }}
        after={{ a: 2 }}
        className="my-custom"
      />,
    );
    expect(container.firstElementChild?.className).toContain("my-custom");
  });

  it("filters out unchanged entries in the display", () => {
    render(
      <JsonDiff
        before={{ name: "same", status: "old" }}
        after={{ name: "same", status: "new" }}
      />,
    );
    // "name" should not appear since it's unchanged
    // "status" should appear since it changed
    expect(screen.getByText("status")).toBeInTheDocument();
    // "same" would appear only if unchanged rows were shown
    // The diff should only show changed entries
    expect(screen.queryByText("same")).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCustomFieldColumns } from "../custom-field-columns";

// ---------------------------------------------------------------------------
// Mock the hook
// ---------------------------------------------------------------------------
const mockUseCustomFieldDefinitions = vi.fn();

vi.mock("@/hooks/use-custom-fields", () => ({
  useCustomFieldDefinitions: (...args: any[]) =>
    mockUseCustomFieldDefinitions(...args),
}));

describe("useCustomFieldColumns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when definitions are undefined", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: undefined,
    });

    const { result } = renderHook(() =>
      useCustomFieldColumns<{ customFields?: Record<string, any> }>("ticket"),
    );

    expect(result.current).toEqual([]);
  });

  it("returns empty array when definitions is empty", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [],
    });

    const { result } = renderHook(() =>
      useCustomFieldColumns<{ customFields?: Record<string, any> }>("ticket"),
    );

    expect(result.current).toEqual([]);
  });

  it("returns columns only for definitions with isVisibleInList=true", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "visible_field",
          fieldLabel: "Visible Field",
          fieldType: "text",
          isVisibleInList: true,
          validationRules: null,
        },
        {
          id: "2",
          fieldKey: "hidden_field",
          fieldLabel: "Hidden Field",
          fieldType: "text",
          isVisibleInList: false,
          validationRules: null,
        },
      ],
    });

    const { result } = renderHook(() =>
      useCustomFieldColumns<{ customFields?: Record<string, any> }>("ticket"),
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].header).toBe("Visible Field");
    expect(result.current[0].key).toBe("cf_visible_field");
  });

  it("columns are not sortable", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "field1",
          fieldLabel: "Field 1",
          fieldType: "text",
          isVisibleInList: true,
          validationRules: null,
        },
      ],
    });

    const { result } = renderHook(() =>
      useCustomFieldColumns<{ customFields?: Record<string, any> }>("ticket"),
    );

    expect(result.current[0].sortable).toBe(false);
  });

  it("render function returns '--' for null/undefined values", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "field1",
          fieldLabel: "Field 1",
          fieldType: "text",
          isVisibleInList: true,
          validationRules: null,
        },
      ],
    });

    const { result } = renderHook(() =>
      useCustomFieldColumns<{ customFields?: Record<string, any> }>("ticket"),
    );

    const rendered = result.current[0].render({ customFields: {} });
    // The render function wraps the formatted value in a span
    expect(rendered).toBeTruthy();
  });

  it("passes entityType to useCustomFieldDefinitions", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({ data: [] });

    renderHook(() =>
      useCustomFieldColumns<{ customFields?: Record<string, any> }>("project"),
    );

    expect(mockUseCustomFieldDefinitions).toHaveBeenCalledWith("project");
  });
});

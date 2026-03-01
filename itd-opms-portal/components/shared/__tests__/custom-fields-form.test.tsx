import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import { CustomFieldsForm } from "../custom-fields-form";

// ---------------------------------------------------------------------------
// Mock the hook
// ---------------------------------------------------------------------------
const mockUseCustomFieldDefinitions = vi.fn();

vi.mock("@/hooks/use-custom-fields", () => ({
  useCustomFieldDefinitions: (...args: any[]) =>
    mockUseCustomFieldDefinitions(...args),
}));

describe("CustomFieldsForm", () => {
  const baseProps = {
    entityType: "ticket",
    values: {} as Record<string, any>,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton when definitions are loading", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<CustomFieldsForm {...baseProps} />);
    const pulsingElements = container.querySelectorAll(".animate-pulse");
    expect(pulsingElements.length).toBeGreaterThan(0);
    expect(screen.getByText("Custom Fields")).toBeInTheDocument();
  });

  it("renders nothing when there are no definitions", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [],
      isLoading: false,
    });

    const { container } = render(<CustomFieldsForm {...baseProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when definitions is null", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: null,
      isLoading: false,
    });

    const { container } = render(<CustomFieldsForm {...baseProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders text fields", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "department_code",
          fieldLabel: "Department Code",
          fieldType: "text",
          isRequired: false,
          description: "Enter code",
          isVisibleInList: true,
          validationRules: null,
        },
      ],
      isLoading: false,
    });

    render(<CustomFieldsForm {...baseProps} />);
    expect(screen.getByText("Department Code")).toBeInTheDocument();
    expect(screen.getByText("Custom Fields")).toBeInTheDocument();
  });

  it("renders required indicator for required fields", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "required_field",
          fieldLabel: "Required Field",
          fieldType: "text",
          isRequired: true,
          description: null,
          isVisibleInList: true,
          validationRules: null,
        },
      ],
      isLoading: false,
    });

    render(<CustomFieldsForm {...baseProps} />);
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("renders field description", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "some_field",
          fieldLabel: "Some Field",
          fieldType: "text",
          isRequired: false,
          description: "Help text for the field",
          isVisibleInList: true,
          validationRules: null,
        },
      ],
      isLoading: false,
    });

    render(<CustomFieldsForm {...baseProps} />);
    expect(screen.getByText("Help text for the field")).toBeInTheDocument();
  });

  it("calls onChange when a text field value changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "name",
          fieldLabel: "Name",
          fieldType: "text",
          isRequired: false,
          description: null,
          isVisibleInList: true,
          validationRules: null,
        },
      ],
      isLoading: false,
    });

    render(
      <CustomFieldsForm {...baseProps} values={{}} onChange={onChange} />,
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "test");

    expect(onChange).toHaveBeenCalled();
  });

  it("renders boolean field as a toggle switch", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "is_active",
          fieldLabel: "Is Active",
          fieldType: "boolean",
          isRequired: false,
          description: null,
          isVisibleInList: true,
          validationRules: null,
        },
      ],
      isLoading: false,
    });

    render(<CustomFieldsForm {...baseProps} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("renders select field with options", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "priority",
          fieldLabel: "Priority",
          fieldType: "select",
          isRequired: false,
          description: null,
          isVisibleInList: true,
          validationRules: { options: ["low", "medium", "high"] },
        },
      ],
      isLoading: false,
    });

    render(<CustomFieldsForm {...baseProps} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("low")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("renders multiselect field with option buttons", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "tags",
          fieldLabel: "Tags",
          fieldType: "multiselect",
          isRequired: false,
          description: null,
          isVisibleInList: true,
          validationRules: { options: ["frontend", "backend", "devops"] },
        },
      ],
      isLoading: false,
    });

    render(<CustomFieldsForm {...baseProps} />);
    expect(
      screen.getByRole("button", { name: "frontend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "backend" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "devops" }),
    ).toBeInTheDocument();
  });

  it("shows validation error for empty required fields", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "required_field",
          fieldLabel: "Required Field",
          fieldType: "text",
          isRequired: true,
          description: null,
          isVisibleInList: true,
          validationRules: null,
        },
      ],
      isLoading: false,
    });

    render(<CustomFieldsForm {...baseProps} values={{}} />);
    expect(screen.getByText("Required Field is required")).toBeInTheDocument();
  });

  it("does not show validation error when required field has a value", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "required_field",
          fieldLabel: "Required Field",
          fieldType: "text",
          isRequired: true,
          description: null,
          isVisibleInList: true,
          validationRules: null,
        },
      ],
      isLoading: false,
    });

    render(
      <CustomFieldsForm
        {...baseProps}
        values={{ required_field: "has value" }}
      />,
    );
    expect(
      screen.queryByText("Required Field is required"),
    ).not.toBeInTheDocument();
  });

  it("renders in readOnly mode", () => {
    mockUseCustomFieldDefinitions.mockReturnValue({
      data: [
        {
          id: "1",
          fieldKey: "name",
          fieldLabel: "Name",
          fieldType: "text",
          isRequired: false,
          description: null,
          isVisibleInList: true,
          validationRules: null,
        },
      ],
      isLoading: false,
    });

    render(<CustomFieldsForm {...baseProps} readOnly />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("readOnly");
  });
});

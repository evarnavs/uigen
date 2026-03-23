import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state = "result",
  result: unknown = "Success"
) {
  return { toolName, args, state, result };
}

test("str_replace_editor + create → Creating /App.jsx", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })} />);
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("str_replace_editor + str_replace → Editing /components/Button.jsx", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/components/Button.jsx" })} />);
  expect(screen.getByText("Editing /components/Button.jsx")).toBeDefined();
});

test("str_replace_editor + insert → Editing /App.jsx", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "/App.jsx" })} />);
  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("str_replace_editor + view → Reading /App.jsx", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "/App.jsx" })} />);
  expect(screen.getByText("Reading /App.jsx")).toBeDefined();
});

test("str_replace_editor + undo_edit → Undoing edit in /App.jsx", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })} />);
  expect(screen.getByText("Undoing edit in /App.jsx")).toBeDefined();
});

test("str_replace_editor + unknown command → Editing /App.jsx (fallback)", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "unknown_cmd", path: "/App.jsx" })} />);
  expect(screen.getByText("Editing /App.jsx")).toBeDefined();
});

test("file_manager + rename with new_path → Renaming /old.jsx → /new.jsx", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })} />);
  expect(screen.getByText("Renaming /old.jsx → /new.jsx")).toBeDefined();
});

test("file_manager + rename without new_path → Renaming /old.jsx", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/old.jsx" })} />);
  expect(screen.getByText("Renaming /old.jsx")).toBeDefined();
});

test("file_manager + delete → Deleting /App.jsx", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/App.jsx" })} />);
  expect(screen.getByText("Deleting /App.jsx")).toBeDefined();
});

test("unknown toolName → raw tool name rendered", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("some_unknown_tool", {})} />);
  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

test("missing path in args → renders without crashing (just the verb)", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create" })} />);
  expect(screen.getByText("Creating")).toBeDefined();
});

test("state result with truthy result → green dot present, no spinner", () => {
  const { container } = render(
    <ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result", "Success")} />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("state call (in-progress) → spinner present, no green dot", () => {
  const { container } = render(
    <ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "call", undefined)} />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("state result with falsy result → spinner, no green dot", () => {
  const { container } = render(
    <ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result", null)} />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

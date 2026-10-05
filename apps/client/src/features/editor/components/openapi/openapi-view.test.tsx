import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import OpenApiView from "./openapi-view";

vi.mock("@tiptap/react", () => ({
  NodeViewWrapper: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("./openapi-document", () => ({
  default: ({ spec }: any) => <div>API: {spec.info.title}</div>,
}));
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi
    .fn()
    .mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
});
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;
afterEach(cleanup);
const source = JSON.stringify({
  openapi: "3.1.0",
  info: { title: "Pets", version: "1.0" },
  paths: {},
});
function view(props: any) {
  return (
    <MantineProvider env="test">
      <OpenApiView {...props} />
    </MantineProvider>
  );
}
function props(spec = "", editable = true) {
  return {
    node: { attrs: { spec } },
    editor: { isEditable: editable, on: vi.fn(), off: vi.fn() },
    selected: false,
    updateAttributes: vi.fn(),
  } as any;
}

describe("OpenAPI block editing", () => {
  it("saves valid input and rejects invalid input without changing the page", async () => {
    const p = props();
    render(view(p));
    fireEvent.click(screen.getByText("Add specification"));
    fireEvent.change(screen.getByLabelText("OpenAPI specification"), {
      target: { value: "bad: [" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(p.updateAttributes).not.toHaveBeenCalled();
    expect(screen.getByText(/Invalid JSON or YAML/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("OpenAPI specification"), {
      target: { value: source },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(p.updateAttributes).toHaveBeenCalledWith({ spec: source });
  });
  it("renders for read-only viewers without editing controls", async () => {
    render(view(props(source, false)));
    expect(await screen.findByText("API: Pets")).toBeTruthy();
    expect(screen.queryByText("Edit specification")).toBeNull();
  });
  it("updates editing controls immediately when the editor becomes read-only", () => {
    const p = props(source);
    const listeners = new Set<() => void>();
    p.editor.on = (_event: string, notify: () => void) => listeners.add(notify);
    p.editor.off = (_event: string, notify: () => void) =>
      listeners.delete(notify);
    render(view(p));
    expect(screen.queryByText("Edit specification")).not.toBeNull();
    act(() => {
      p.editor.isEditable = false;
      listeners.forEach((notify) => notify());
    });
    expect(screen.queryByText("Edit specification")).toBeNull();
  });
  it("keeps the saved content when editing is cancelled", async () => {
    const p = props(source);
    render(view(p));
    fireEvent.click(screen.getByText("Edit specification"));
    fireEvent.change(screen.getByLabelText("OpenAPI specification"), {
      target: { value: "draft" },
    });
    fireEvent.click(screen.getByText("Cancel"));
    expect(p.updateAttributes).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByLabelText("OpenAPI specification")).toBeNull(),
    );
  });
  it("does not overwrite a concurrent edit", async () => {
    const p = props(source);
    const result = render(view(p));
    fireEvent.click(screen.getByText("Edit specification"));
    result.rerender(
      view({
        ...p,
        node: { attrs: { spec: source.replace("Pets", "Updated") } },
      }),
    );
    fireEvent.click(screen.getByText("Save"));
    expect(p.updateAttributes).not.toHaveBeenCalled();
    expect(screen.getByText(/changed while you were editing/)).toBeTruthy();
  });
});

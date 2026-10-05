import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { OpenApi, htmlToMarkdown, markdownToHtml } from "@docmost/editor-ext";

const source =
  'openapi: 3.1.0\ninfo:\n  title: "<script>alert(1)</script>"\n  version: "1.0"\n  description: "```example```"\npaths: {}';
const editors: Editor[] = [];
const makeEditor = (content: any) => {
  const editor = new Editor({ extensions: [StarterKit, OpenApi], content });
  editors.push(editor);
  return editor;
};
afterEach(() => editors.splice(0).forEach((e) => e.destroy()));

describe("OpenAPI page content", () => {
  it("round-trips JSON and HTML without executing markup", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{ type: "openapi", attrs: { spec: source } }],
    });
    const html = editor.getHTML();
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    const imported = makeEditor(html);
    expect(imported.getJSON().content?.[0]).toEqual(
      editor.getJSON().content?.[0],
    );
    expect(editor.getText()).toContain("openapi: 3.1.0");
  });
  it("keeps the source and block type through Markdown export/import", async () => {
    const editor = makeEditor({
      type: "doc",
      content: [{ type: "openapi", attrs: { spec: source } }],
    });
    const markdown = htmlToMarkdown(editor.getHTML());
    expect(markdown).toContain("````openapi");
    const imported = makeEditor(await markdownToHtml(markdown));
    expect(imported.getJSON().content?.[0]).toEqual(
      editor.getJSON().content?.[0],
    );
  });
  it("inserts and serializes an empty editable block", () => {
    const editor = makeEditor("");
    expect(editor.commands.setOpenApi()).toBe(true);
    expect(editor.getJSON().content?.[0]).toEqual({
      type: "openapi",
      attrs: { spec: "" },
    });
  });
});

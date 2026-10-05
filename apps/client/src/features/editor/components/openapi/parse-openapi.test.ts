import { describe, expect, it } from "vitest";
import { parseOpenApi, MAX_OPENAPI_BYTES } from "./parse-openapi";

const spec = {
  openapi: "3.1.0",
  info: { title: "Pets", version: "1.0" },
  paths: {},
};

describe("OpenAPI document parsing", () => {
  it.each(["3.0.3", "3.1.0", "3.2.0"])("accepts OpenAPI %s JSON", (openapi) => {
    expect(parseOpenApi(JSON.stringify({ ...spec, openapi })).info).toEqual(
      spec.info,
    );
  });
  it("accepts YAML and keeps internal references", () => {
    const source =
      'openapi: 3.1.0\ninfo:\n  title: Pets\n  version: "1.0"\npaths: {}\ncomponents:\n  schemas:\n    Pet:\n      type: object\n    PetList:\n      type: array\n      items:\n        $ref: "#/components/schemas/Pet"';
    expect(parseOpenApi(source).components).toHaveProperty(
      "schemas.PetList.items.$ref",
      "#/components/schemas/Pet",
    );
  });
  it("accepts Swagger 2.0", () => {
    expect(
      parseOpenApi(
        JSON.stringify({ swagger: "2.0", info: spec.info, paths: {} }),
      ).swagger,
    ).toBe("2.0");
  });
  it.each([
    "",
    "info: [",
    "openapi: 3.1.0\nopenapi: 3.0.3",
    "null",
    "[]",
    "hello",
  ])("rejects invalid input: %s", (source) => {
    expect(() => parseOpenApi(source)).toThrow();
  });
  it("rejects missing metadata and invalid paths", () => {
    expect(() => parseOpenApi(JSON.stringify({ ...spec, info: {} }))).toThrow(
      "info.title",
    );
    expect(() => parseOpenApi(JSON.stringify({ ...spec, paths: [] }))).toThrow(
      "paths",
    );
  });
  it.each(["https://example.com/api.yaml", "./models.yaml#/Pet"])(
    "rejects remote and file references: %s",
    ($ref) => {
      expect(() =>
        parseOpenApi(
          JSON.stringify({
            ...spec,
            components: { schemas: { Pet: { $ref } } },
          }),
        ),
      ).toThrow("External references");
    },
  );
  it("rejects recursive aliases and multi-document YAML", () => {
    expect(() => parseOpenApi("a: &a\n  b: *a")).toThrow(
      "Invalid JSON or YAML",
    );
    expect(() =>
      parseOpenApi("---\nopenapi: 3.1.0\n---\nopenapi: 3.0.3"),
    ).toThrow("Invalid JSON or YAML");
  });
  it("limits input by UTF-8 bytes", () => {
    expect(() => parseOpenApi("あ".repeat(MAX_OPENAPI_BYTES / 2))).toThrow(
      "512 KB",
    );
  });
});

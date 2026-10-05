import { parseDocument } from "yaml";

export const MAX_OPENAPI_BYTES = 512 * 1024;

export class OpenApiError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseOpenApi(source: string): Record<string, unknown> {
  if (!source.trim())
    throw new OpenApiError("Paste an OpenAPI specification in JSON or YAML.");
  if (new TextEncoder().encode(source).length > MAX_OPENAPI_BYTES) {
    throw new OpenApiError("The specification must be 512 KB or smaller.");
  }
  let spec: unknown;
  try {
    const document = parseDocument(source, { uniqueKeys: true, strict: true });
    if (document.errors.length || document.warnings.length) throw new Error();
    // Bounded aliases; JSON serialization rejects cyclic YAML graphs.
    spec = JSON.parse(JSON.stringify(document.toJS({ maxAliasCount: 20 })));
  } catch {
    throw new OpenApiError(
      "Invalid JSON or YAML. Check the syntax and duplicate keys.",
    );
  }
  if (
    !isObject(spec) ||
    !(
      spec.swagger === "2.0" ||
      (typeof spec.openapi === "string" && /^3\.[012]\.\d+$/.test(spec.openapi))
    )
  ) {
    throw new OpenApiError(
      "Use an OpenAPI 3.0, 3.1, 3.2 or Swagger 2.0 specification.",
    );
  }
  if (
    !isObject(spec.info) ||
    typeof spec.info.title !== "string" ||
    typeof spec.info.version !== "string"
  ) {
    throw new OpenApiError(
      "The specification needs info.title and info.version.",
    );
  }
  if (
    (spec.paths !== undefined && !isObject(spec.paths)) ||
    (spec.paths === undefined &&
      !isObject(spec.components) &&
      !isObject(spec.webhooks))
  ) {
    throw new OpenApiError(
      "The specification needs a paths, components or webhooks object.",
    );
  }
  const pending: unknown[] = [spec];
  let count = 0;
  while (pending.length) {
    const value = pending.pop();
    if (++count > 50000)
      throw new OpenApiError("The specification is too complex to display.");
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (
          key === "$ref" &&
          (typeof child !== "string" || !child.startsWith("#"))
        ) {
          throw new OpenApiError(
            "External references are not supported. Bundle the specification into one file.",
          );
        }
        pending.push(child);
      }
    }
  }
  return spec;
}

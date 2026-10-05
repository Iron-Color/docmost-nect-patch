import { lazy, Suspense } from "react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";

const OpenApiView = lazy(() => import("./openapi-view"));

export default function OpenApiViewLazy(props: NodeViewProps) {
  return (
    <Suspense fallback={<NodeViewWrapper>OpenAPI</NodeViewWrapper>}>
      <OpenApiView {...props} />
    </Suspense>
  );
}

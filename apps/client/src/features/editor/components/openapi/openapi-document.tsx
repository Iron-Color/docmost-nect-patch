import SwaggerUI from "swagger-ui-react";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import swaggerStyles from "swagger-ui-react/swagger-ui.css?raw";
import classes from "./openapi.module.css";

// Specs remain inside Docmost. Disable remote validation, reference fetching and execution.
export const openApiViewerOptions = {
  supportedSubmitMethods: [],
  validatorUrl: null,
  tryItOutEnabled: false,
  persistAuthorization: false,
  withCredentials: false,
  requestInterceptor: () => {
    throw new Error("External requests are disabled in API documentation.");
  },
};

export default function OpenApiDocument({
  spec,
}: {
  spec: Record<string, unknown>;
}) {
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const attach = useCallback((element: HTMLDivElement | null) => {
    if (element)
      setRoot(element.shadowRoot ?? element.attachShadow({ mode: "open" }));
  }, []);
  return (
    <div className={classes.document} ref={attach}>
      {root &&
        createPortal(
          <>
            <style>
              {swaggerStyles +
                `
        :host { color-scheme: light; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .info .title { font-size: 24px; }
        .swagger-ui .wrapper { padding: 0; }
        .swagger-ui .opblock-summary { flex-wrap: wrap; }
        .swagger-ui .opblock-summary-path { overflow-wrap: anywhere; }
        .swagger-ui .scheme-container { box-shadow: none; margin: 0; padding: 12px 0; }
        .swagger-ui .download-url-wrapper { display: none; }
        .swagger-ui .highlight-code > .microlight,
        .swagger-ui section.models .models-scroll { max-height: none; overflow-y: visible; }
      `}
            </style>
            <SwaggerUI
              {...openApiViewerOptions}
              spec={spec}
              docExpansion="list"
              defaultModelsExpandDepth={-1}
              deepLinking={false}
              filter
              displayOperationId
              plugins={[
                () => ({
                  components: { authorizeBtn: () => null, auths: () => null },
                }),
              ]}
            />
          </>,
          root,
        )}
    </div>
  );
}

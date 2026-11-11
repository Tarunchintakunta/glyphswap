export const openApi = {
  openapi: "3.1.0",
  info: { title: "Glyphswap", version: "1.0.0" },
  paths: {
    "/v1/ocr": { post: { summary: "Detect text. Does not spend a credit." } },
    "/v1/edit": { post: { summary: "Replace or remove text. Spends one credit." } },
    "/v1/jobs/{id}": {
      get: { summary: "Read a job" },
      delete: { summary: "Cancel a queued job and refund the credit" },
    },
    "/v1/account": { get: { summary: "Credit balance and limits" } },
  },
  components: {
    securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
  },
} as const

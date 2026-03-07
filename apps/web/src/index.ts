import "./app/dashboard.css";

export const webSurface = {
  name: "dashboard",
  purpose: "station insights and live monitoring"
} as const;

export * from "./app/providers.js";
export * from "./app/router.js";
export * from "./app/layout.js";
export * from "./lib/api/index.js";
export * from "./lib/firebase/index.js";
export * from "./lib/query/index.js";
import { spawn } from "node:child_process";
import { requireFirebaseProjectId } from "./firebase-project-id.mjs";

const projectId = requireFirebaseProjectId();
const args = process.argv.slice(2);
const hasProjectArgument = args.includes("--project");
const command = process.platform === "win32" ? "corepack.cmd" : "corepack";
const commandArgs = ["pnpm", "dlx", "firebase-tools@latest", ...args];

if (!hasProjectArgument) {
  commandArgs.push("--project", projectId);
}

const child = spawn(command, commandArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || projectId,
    BINSIGHT_FIREBASE_PROJECT_ID: process.env.BINSIGHT_FIREBASE_PROJECT_ID || projectId,
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
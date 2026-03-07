import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDir, "..");
const projectIdEnvNames = ["FIREBASE_PROJECT_ID", "BINSIGHT_FIREBASE_PROJECT_ID"];

function parseEnvFile(content) {
  const values = {};

  for (const line of content.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function readProjectIdFromBackendEnvFiles(repoRoot) {
  const backendDir = path.join(repoRoot, "services", "backend-functions");
  let entries = [];

  try {
    entries = readdirSync(backendDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const envFiles = entries
    .filter((entry) => entry.isFile() && entry.name.startsWith(".env.") && entry.name !== ".env.example")
    .map((entry) => entry.name)
    .sort();

  for (const envFile of envFiles) {
    const values = parseEnvFile(readFileSync(path.join(backendDir, envFile), "utf8"));
    for (const envName of ["BINSIGHT_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID"]) {
      const value = values[envName]?.trim();
      if (value) {
        return value;
      }
    }
  }

  return null;
}

export function resolveFirebaseProjectId({ repoRoot = defaultRepoRoot } = {}) {
  for (const envName of projectIdEnvNames) {
    const value = process.env[envName]?.trim();
    if (value) {
      return value;
    }
  }

  return readProjectIdFromBackendEnvFiles(repoRoot);
}

export function requireFirebaseProjectId(options) {
  const projectId = resolveFirebaseProjectId(options);
  if (!projectId) {
    throw new Error(
      "Unable to resolve a Firebase project id. Set FIREBASE_PROJECT_ID or BINSIGHT_FIREBASE_PROJECT_ID, or add BINSIGHT_FIREBASE_PROJECT_ID to services/backend-functions/.env.<project>."
    );
  }
  return projectId;
}

const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  try {
    process.stdout.write(requireFirebaseProjectId());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
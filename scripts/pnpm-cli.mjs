import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

const candidates = process.platform === "win32"
  ? [
      { command: "corepack.cmd", args: ["pnpm", ...args] },
      { command: "cmd.exe", args: ["/d", "/s", "/c", "npx", "-y", "pnpm@10.6.3", ...args] },
    ]
  : [
      { command: "corepack", args: ["pnpm", ...args] },
      { command: "npx", args: ["-y", "pnpm@10.6.3", ...args] },
    ];

for (const candidate of candidates) {
  const result = spawnSync(candidate.command, candidate.args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status === 0) {
    process.exit(0);
  }

  if (!isRetryableFailure(result.status, result.error)) {
    process.exit(result.status ?? 1);
  }
}

process.exit(1);

function isRetryableFailure(status, error) {
  if (error) {
    return true;
  }

  return status !== 0;
}
# Monorepo Layout Research

## Research Topics

- Best repository and top-level folder structure for BinBuddy as a smart waste-sorting station project.
- How to clearly separate the website, Raspberry Pi code, ESP8266 firmware, backend code, and shared code.
- Monorepo organization patterns that optimize for deployment boundaries rather than abstract layering.
- Practical build, dependency, CI, and developer-workflow implications for a mixed-language repository.

## Status

- Complete.

## Spec-Driven Constraints

- The BinBuddy spec defines at least three real deployment/runtime boundaries: cloud-hosted dashboard/backend, Raspberry Pi 5 station runtime, and ESP8266 firmware.
- The spec explicitly calls out two hardware units: ESP8266 for poster LEDs and ultrasonic sensor, and Raspberry Pi 5 for camera, LCD, and on-device inference.
- The Pi and ESP8266 communicate over Wi-Fi, which implies a shared protocol surface but not a shared runtime.
- Firebase is acceptable for event storage and dashboard data, so the cloud side may be either a thin backend or mostly managed services plus a web app.
- The system uses local rules presets and creates disposal events, so shared schemas and rules configuration are likely useful across web and backend, and potentially as generated artifacts for device code.

## Key Findings

### 1. The strongest top-level organizing principle is deployable unit first

For this project, the cleanest boundary is not frontend versus backend versus library. It is deployable system boundary:

- web dashboard
- cloud backend or serverless functions
- Raspberry Pi station runtime
- ESP8266 firmware

This matches the product architecture in the spec and keeps each runtime isolated behind its own toolchain, lockfile, and release process.

### 2. Use a monorepo, but do not force every language into one package-manager model

The authoritative monorepo guidance is consistent on one point: group deployable apps separately from reusable packages, and make each package a self-contained unit with its own manifest and build configuration.

That maps well to JavaScript or TypeScript code, but the ESP8266 and likely Raspberry Pi code should keep native tooling:

- web/backend/shared TypeScript: workspace package manager such as pnpm
- Raspberry Pi runtime: its own Python project if Python is used, with its own pyproject.toml and lockfile
- ESP8266 firmware: its own PlatformIO project rooted where platformio.ini lives

Trying to make the Pi runtime or firmware behave like JavaScript workspace packages usually increases friction instead of reducing it.

### 3. Shared code should be split by compatibility, not by wishful reuse

There is real value in shared contracts, rules mappings, test fixtures, and docs. There is much less value in trying to directly share runtime code across:

- browser/server code
- Raspberry Pi Python code
- ESP8266 C++ firmware

The practical pattern is:

- share data contracts, schemas, and rules definitions at the repo level
- generate runtime-specific artifacts where needed
- avoid direct imports between incompatible runtimes

### 4. CI and task execution should follow deployment boundaries too

Build pipelines should be independently runnable for:

- web
- backend or functions
- Pi runtime
- ESP8266 firmware

This keeps failures localized and makes it easier to run matrix CI and hardware-targeted checks.

## Most Viable Layout Options

### Option A. Deployment-boundary-first monorepo

This is the strongest default for BinBuddy.

```text
apps/
  web/
  api/
devices/
  pi-station/
firmware/
  esp8266-controller/
packages/
  contracts/
  rules/
  analytics/
  ui/
infra/
  firebase/
docs/
spec/
scripts/
```

Notes:

- `apps/web` is the dashboard website.
- `apps/api` is optional. If the project goes Firebase-first, this may instead become `apps/functions` or be omitted.
- `devices/pi-station` is the Raspberry Pi runtime, likely a Python app with its own `pyproject.toml`.
- `firmware/esp8266-controller` is a standalone PlatformIO project with its own `platformio.ini`.
- `packages/contracts` holds shared schemas, event payload definitions, and protocol contracts.
- `packages/rules` holds disposal rule presets and maybe generated JSON artifacts.
- `packages/analytics` holds shared metric logic only if it is realistically reused by web/backend.
- `packages/ui` is optional if the dashboard grows into multiple web surfaces.

Pros:

- Mirrors the product and deployment model in the spec.
- Makes it obvious where to build, test, flash, or deploy each component.
- Keeps mixed-language tooling from colliding.
- Supports gradual backend decisions: full API, serverless functions, or mostly Firebase.
- Makes CI straightforward because each deployable has a clear root.

Cons:

- Not as conventionally symmetrical as a pure `apps/` and `packages/` JavaScript monorepo.
- Some shared logic will need code generation or duplicated implementations across languages.
- Team members need to understand multiple toolchains.

Best fit when:

- The Pi runtime and ESP8266 firmware are first-class deliverables.
- The repo is expected to stay mixed-language.
- Hardware deployment workflows matter as much as web delivery.

### Option B. Standard apps-packages monorepo with firmware as a special root

This is viable if most non-firmware code is TypeScript and the team wants a familiar JS monorepo shape.

```text
apps/
  web/
  api/
  pi-station/
packages/
  contracts/
  rules/
  analytics/
  ui/
firmware/
  esp8266-controller/
infra/
docs/
spec/
scripts/
```

Notes:

- `apps/pi-station` works if the Pi code is treated as an application root but keeps native Python tooling inside that folder.
- The `apps/` label becomes a human convention, not a single package-manager truth.

Pros:

- Familiar to teams already using pnpm, Turborepo, or Nx.
- Easy to reason about all deployables as “apps”.
- Shared JS or TS packages fit naturally.

Cons:

- `apps/pi-station` looks like a JS workspace package even if it is really Python, which can confuse tooling and contributors.
- It encourages over-centralizing scripts into the root even when native tooling is better.
- Firmware still remains outside the main workspace model.

Best fit when:

- Web and backend dominate the repo.
- The Pi runtime is operationally closer to the backend app than to hardware engineering.
- The team strongly prefers standard JS monorepo conventions.

### Option C. Product-domain-first monorepo

This is workable, but weaker than the first two for operations.

```text
station/
  pi-runtime/
  esp8266-firmware/
cloud/
  web/
  api/
shared/
  contracts/
  rules/
  analytics/
infra/
docs/
spec/
scripts/
```

Pros:

- Reads naturally against the product: station versus cloud.
- Emphasizes the station as one integrated system.

Cons:

- Less compatible with mainstream monorepo tools and examples.
- `shared/` tends to become a dumping ground unless tightly controlled.
- Weaker signal for what is actually deployable or releasable.

Best fit when:

- The team wants business-domain language above ecosystem conventions.
- Repo automation is relatively light.

## Build and Tooling Implications

### Recommended task model

- Use one root task orchestrator only for cross-project convenience, not to erase native tool boundaries.
- If the web/backend stack is TypeScript, `pnpm` plus either Turborepo or Nx is the cleanest fit for those packages.
- Run Pi tasks from the Pi project root using its native Python tooling.
- Run firmware tasks from the firmware root using PlatformIO.

Example command ownership:

- web: install, dev, test, build in `apps/web`
- backend/functions: emulation, deploy, test in `apps/api` or `apps/functions`
- Pi runtime: `uv sync`, `uv run`, tests in `devices/pi-station`
- ESP8266: `pio run`, `pio test`, `pio run --target upload` in `firmware/esp8266-controller`

### Recommended lockfile approach

- One root lockfile for the JS or TS workspace if used.
- One `uv.lock` in the Pi project if Python with uv is used.
- PlatformIO dependency state defined in `platformio.ini` for the firmware project.

This is better than trying to unify all dependencies into one universal root because the toolchains are fundamentally different.

### Shared package guidance

Good candidates for shared packages:

- disposal event schemas
- item and disposal-method enums
- rules presets and station metadata schemas
- analytics aggregation logic used by web and backend
- seeded demo data and fixtures

Bad candidates for shared packages:

- direct camera/inference runtime code shared between Pi and web
- firmware logic shared directly with Python or TypeScript
- hardware-driver abstractions pretending all runtimes are interchangeable

### CI guidance

A practical CI split would be:

- web/backend checks
- Pi runtime checks
- firmware build and tests
- schema/rules validation

That structure also supports selective execution by changed paths.

## Recommendation

The best default is Option A: deployment-boundary-first monorepo.

Recommended top-level structure:

```text
apps/
  web/
  api/                # or functions/
devices/
  pi-station/
firmware/
  esp8266-controller/
packages/
  contracts/
  rules/
  analytics/
infra/
  firebase/
docs/
spec/
scripts/
```

Why this is the best fit for BinBuddy:

- It directly reflects the spec’s real system boundaries.
- It keeps Pi and ESP8266 development honest about their native build and deployment needs.
- It still provides a clean place for shared contracts and cloud-facing code.
- It minimizes the chance that firmware and Python code get awkwardly squeezed into a JavaScript-centric workspace model.

## Recommendation for Further Evaluation

- Decide whether the Raspberry Pi runtime will be Python or Node.js, because that determines whether `devices/pi-station` should remain fully standalone or join a JS workspace.
- Decide whether the cloud side is Firebase-first, serverless functions, or a custom API, because that changes whether `apps/api` exists at all.
- Validate what data truly needs to be shared across runtimes, then choose a schema-first or codegen-first approach instead of direct cross-language imports.
- Define the CI matrix early so the folder layout and root scripts align with real build and deployment steps.

## Evidence

- BinBuddy spec: `/spec/binbuddy-spec.md`
- Turborepo documentation recommends separating `apps/` for deployable applications and `packages/` for reusable libraries, and warns against nested package ambiguity: https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository
- pnpm workspace documentation defines the workspace protocol, shared lockfile behavior, and cycle controls that matter for shared JS or TS packages: https://pnpm.io/workspaces
- Nx folder-structure guidance recommends grouping projects by scope and by projects that usually change together, which supports deployment-boundary grouping for this repo: https://nx.dev/docs/concepts/decisions/folder-structure
- PlatformIO documentation states that each PlatformIO project has its own `platformio.ini` in the project root, reinforcing that firmware should stay a standalone project root: https://docs.platformio.org/en/latest/projectconf/index.html
- uv documentation states that Python projects are rooted at `pyproject.toml` and maintain their own environment and lockfile next to that project, reinforcing a standalone Pi application root when Python is used: https://docs.astral.sh/uv/concepts/projects/layout/

## Open Questions

- Will the Raspberry Pi runtime be implemented in Python, Node.js, or a hybrid?
- Will shared contracts be authored in TypeScript first, JSON Schema first, or another neutral format?
- Is the backend a persistent service, Firebase functions, or just Firebase plus client logic?
- Does the firmware need generated protocol artifacts from shared contracts, or is a smaller manually maintained message format sufficient for v1?

## Recommended Follow-up Research

- Compare Firebase-first versus explicit backend topologies for the cloud side.
- Research schema-first contract sharing options across TypeScript, Python, and ESP8266 C++.
- Define CI path filters and release boundaries based on the chosen layout.
- Evaluate whether Turborepo or Nx provides enough value for the JS or TS portion relative to plain pnpm workspaces.
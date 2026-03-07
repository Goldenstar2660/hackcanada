<!-- markdownlint-disable-file -->
# Implementation Details: BinBuddy to Binsight Rename

## Context Reference

Sources: .copilot-tracking/research/2026-03-07/binsight-rename-research.md, spec/binsight-spec.md, package.json, tsconfig.base.json, devices/pi-station/pyproject.toml, and the current runtime source files.

## Implementation Phase 1: Rename Active Paths and Source-of-Truth References

### Step 1.1: Rename the spec path and Python module path

Rename the spec file and the Pi module directory so active imports and instruction references move with the product name.

### Step 1.2: Update instructions, docs, and imports to the new paths

Update all references to the renamed spec and Pi module path in docs, tracking artifacts, commands, and tests.

## Implementation Phase 2: Rename Product Identifiers and Config Names

### Step 2.1: Update TypeScript package scopes, aliases, and imports

Replace `@binbuddy/*` with `@binsight/*` across package manifests, tsconfig alias maps, imports, and any generated metadata that still participates in builds.

### Step 2.2: Update Python package names, console scripts, imports, and env keys

Rename the Pi package from `binbuddy-station` and `binbuddy_station` to `binsight-station` and `binsight_station`, and replace `BINBUDDY_*` environment keys with `BINSIGHT_*` keys.

### Step 2.3: Update firmware namespaces, macros, and runtime log strings

Rename the firmware namespace and macro family from `binbuddy` and `BINBUDDY_*` to `binsight` and `BINSIGHT_*`.

### Step 2.4: Update backend and Pi protocol headers, signature prefix, and Firebase-related defaults

Rename the `x-binbuddy-*` header family, the `binbuddy-v1` signature prefix, and default Firebase project identifiers such as `binbuddy-demo` so external configuration surfaces reflect the new product name.

## Implementation Phase 3: Validate and Clean Residual References

### Step 3.1: Refresh lock or generated metadata affected by renamed package scopes

Refresh the workspace lockfile and any generated metadata that contains active package names.

### Step 3.2: Search for residual old-name references and fix remaining active files

Use a raw repository scan because the indexed search view misses some files in this workspace.

### Step 3.3: Run validation commands

Run TypeScript lint, build, and tests, then the Pi tests and firmware build.
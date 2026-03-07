---
description: Load for all work on this smart waste-sorting station project so the agent consistently uses the project spec as the authoritative source of truth.
applyTo: '**'
---

# Source of Truth

The authoritative source of truth for this project is:

`/spec/binbuddy-spec.md`

## Required behavior

- Treat that spec file as the primary definition of the product’s scope, business logic, demo scope, assumptions, non-goals, and technical constraints.
- When researching, planning, or implementing, align decisions to the spec unless the user explicitly overrides it.
- Do not silently change, reinterpret, or expand the intended product behavior in ways that conflict with the spec.
- If code, notes, plans, or other documents conflict with the spec, prefer the spec and call out the discrepancy.
- Use the spec to determine what is in scope for the current task and what should be deferred.
- Keep implementation details flexible where appropriate, but keep externally visible behavior and business logic consistent with the spec.

## RPI workflow note

When using the RPI workflow:
- use the spec as the starting context for each cycle
- treat research, planning, and implementation artifacts as supporting documents, not replacements for the spec
- preserve consistency with the spec across parallel branches or parallel cycles
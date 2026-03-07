<!-- markdownlint-disable-file -->
# Planning Log: BinBuddy to Binsight Rename

**Related Plan**: binsight-rename-plan.instructions.md

## Discrepancy Log

### Unaddressed Research Items

* None at plan creation.

### Implementation Paths Considered

* Selected: One coordinated repository-wide rename covering active paths, package names, env keys, and protocol identifiers.
  * Rationale: The repo contains both ends of the relevant contracts, so shipping the rename atomically is lower risk than preserving transitional aliases.
* Rejected: Product-text-only rename.
  * Rationale: The user explicitly requested docs and external config names, and that would leave active technical identifiers inconsistent.
* Rejected: Compatibility shim rename with dual env and header support.
  * Rationale: It adds complexity without a stated need because all affected surfaces live in the same repository.

## Suggested Follow-On Work

* Provision future Firebase secrets and environment variables with the new `BINSIGHT_*` names from the start.
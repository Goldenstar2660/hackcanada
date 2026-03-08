<!-- markdownlint-disable-file -->

## Discrepancy Log

* No active DR- or DD- items after validation.

## Implementation Paths Considered

Selected path:

* Stabilize the current architecture with targeted UX and callable-boundary fixes.

Rejected alternatives:

* Large routing/data-layer rewrite. Too broad for the current defect scope.
* Frontend-only fix. Insufficient because the backend misclassifies validation failures and stale callers still fail.

## Suggested Follow-On Work

* Add route-transition and callable-boundary tests.
* Measure callable latency for the heavier analytics and comparison views.
* Verify deployed frontend and backend revisions are released together.

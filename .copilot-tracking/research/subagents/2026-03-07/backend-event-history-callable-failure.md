---
title: Backend event-history callable failure research
description: Investigation into why the deployed getEventHistory Firebase callable fails validation at eventHistoryQuery.stationIds
author: GitHub Copilot
ms.date: 2026-03-07
ms.topic: troubleshooting
keywords:
  - firebase callable
  - event history
  - validation
  - stationIds
  - binsight
estimated_reading_time: 8
---

## Research scope

Investigate the deployed Firebase callable failure for `getEventHistory` in the Binsight workspace.

Questions:

* What exact code path throws `Validation failed at eventHistoryQuery.stationIds`?
* What request shape does the backend expect?
* What request shape does the current frontend send?
* Is the failure explained by current source code, or by deployment skew or an alternate caller?
* What code fix should be applied to prevent or properly report this failure?

## Initial findings

* The callable entry point is `getEventHistory` in `services/backend-functions/src/runtime/firebase-runtime.ts`.
* The callable bridge passes `request.data` directly into the handler in `services/backend-functions/src/runtime/firebase-bridges.ts`.
* The handler validates the payload with `assertEventHistoryQuery(requestData)` in `services/backend-functions/src/functions/get-event-history.ts`.
* The validator throws `Validation failed at eventHistoryQuery.stationIds` when `stationIds` is present but is not an array of non-empty strings.
* The current frontend gateway builds `stationIds` as `readonly string[] | undefined`, never as a scalar string, in `apps/web/src/lib/query/dashboard-query.ts`.
* The current web callable client passes the query object directly to `httpsCallable`, with no extra wrapping, in `apps/web/src/lib/api/dashboard-api.ts` and `apps/web/src/lib/api/dashboard-gateway.ts`.
* The callable bridge currently maps generic `Error` instances, including `ValidationError`, to Firebase `internal`, which explains the HTTP 500 surface even for bad input.

## Evidence collected

### Backend callable path

* `services/backend-functions/src/runtime/firebase-runtime.ts` exports `getEventHistory` via `createFirebaseCallableFunction(createGetEventHistoryHandler(...))`
* `services/backend-functions/src/runtime/firebase-bridges.ts` invokes `handler(request.data, ...)`
* `services/backend-functions/src/functions/get-event-history.ts` calls `assertEventHistoryQuery(requestData)` before querying

### Validation rule

`services/backend-functions/src/domain/validation.ts`:

* `const record = asRecord(value, "eventHistoryQuery")`
* `asOptionalArrayOfStrings(record.stationIds, "eventHistoryQuery.stationIds")`
* `asOptionalArrayOfStrings` fails unless the value is `undefined` or an actual array

### Current frontend request shape

`apps/web/src/lib/query/dashboard-query.ts`:

* `createEventHistoryRequest(filters)` returns `stationIds: filters.stationIds.length > 0 ? filters.stationIds : undefined`
* `normalizeDashboardFilters` always normalizes `stationIds` to an array
* `parseDashboardFilters` uses `URLSearchParams.getAll("stationId")`, which also produces an array

`apps/web/src/lib/api/dashboard-api.ts`:

* `getEventHistory(query) { return invoker.call(..., query); }`

`apps/web/src/lib/api/dashboard-gateway.ts`:

* `getEventHistory(filters) { return client.getEventHistory(createEventHistoryRequest(filters)); }`

## Working hypothesis

The current source in this workspace does not construct `stationIds` as a string. The deployed failure is therefore most consistent with one of these conditions:

* a stale deployed frontend or alternate caller is sending `stationIds` as a scalar string instead of an array
* a stale deployed backend differs from the current workspace
* a manual callable invocation outside the current frontend is using the wrong request shape

A separate backend bug exists regardless: `ValidationError` is converted to Firebase `internal`, so malformed callable requests surface as HTTP 500 instead of `invalid-argument`.

## Root cause

The exact backend failure is caused by a request-contract mismatch at the callable boundary.

* `getEventHistory` receives `request.data` directly from Firebase callable transport.
* `assertEventHistoryQuery` requires `stationIds` to be either `undefined` or an array of non-empty strings.
* When the deployed request contains `stationIds` as a scalar value, such as a single string, validation throws `Validation failed at eventHistoryQuery.stationIds` before any repository code runs.

Based on the current workspace code, the in-repo web client does not generate that malformed shape. That means the live failure is not explained by the current frontend source alone. The most likely real-world cause is deployment skew or a non-workspace caller sending the wrong payload.

## Recommended fix

Apply two fixes.

### Fix the caller contract

Ensure every `getEventHistory` caller sends this shape:

```json
{
  "timeRange": {
    "start": "2026-03-01T00:00:00.000Z",
    "end": "2026-03-07T23:59:59.999Z"
  },
  "stationIds": ["demo-station-001"],
  "pageSize": 50
}
```

Do not send `stationIds` as a plain string.

### Fix backend error mapping

Update `services/backend-functions/src/runtime/firebase-bridges.ts` so `ValidationError` is mapped to Firebase `invalid-argument` instead of generic `internal`.

That change will not hide malformed requests, but it will stop bad input from surfacing as HTTP 500 and will make debugging materially clearer.

## Validation commands

Current repo commands that matter for this path:

```bash
corepack pnpm --filter @binsight/backend-functions run build
corepack pnpm --filter @binsight/backend-functions run lint
corepack pnpm test
```

Recommended targeted validation after the fix:

* Invoke the deployed callable once with `stationIds` as a string and confirm it now returns `invalid-argument` instead of HTTP 500.
* Invoke the deployed callable again with `stationIds` as an array and confirm it returns event history successfully.
* Redeploy both the web app and Firebase Functions together to eliminate frontend-backend version skew.

## Test gaps

No backend tests were found for this callable validation path.

Recommended tests to add:

* A unit test for `assertEventHistoryQuery` that rejects scalar `stationIds` and accepts `string[]`.
* A unit test for `createFirebaseCallableFunction` or `toHttpsError` that maps `ValidationError` to `invalid-argument`.
* A handler-level test for `createGetEventHistoryHandler` that proves invalid input fails before repository access.

## Next research

* Confirm the exact deployed caller payload from browser network traces or Firebase logs
* Confirm whether the deployed web bundle matches the current workspace commit
* Add callable-path tests if this issue needs to be prevented from regressing

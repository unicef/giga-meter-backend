# School Registration Technical Design

## Overview

This document defines the temporary school registration flow for the Giga Meter backend.

The design covers:

- the new `school_new_registration` table
- public registration intake from the app/frontend
- outbound verification dispatch to `giga_sync`
- authenticated rejection callback handling
- dynamic school verification behavior in existing `dailycheckapp_school` APIs
- one background cleanup job to soft-delete registration records after the matching school is present in the master `school` table

This document is intended to be the implementation reference for the backend flow.

## Goals

- Accept new school registration requests from the app/frontend.
- Persist unverified schools in a temporary table instead of the master `school` table.
- Generate `giga_id_school` on the backend.
- Forward registration data to `giga_sync` for verification.
- Soft-delete temporary registrations once rejected or once the school becomes available in the master `school` table.
- Keep existing app login tracking in `dailycheckapp_school`.
- Expose dynamic `is_verified` state in current school-related APIs.

## Non-Goals

- Creating or updating master `school` records directly from this backend.
- Retrying failed `giga_sync` dispatch in a worker queue.
- Adding a full workflow/orchestration engine.
- Auto-approving or merging registration data into `school`.

## Data Model

### Master Table

Existing table: `school`

Additional field:

- `not_verified BOOLEAN NULL`

Meaning:

- `NULL` or `FALSE`: school is verified
- `TRUE`: school is not verified

### Temporary Registration Table

New table: `school_new_registration`

Column order:

1. `id`
2. `school_id`
3. `school_name`
4. `latitude`
5. `longitude`
6. `address`
7. `education_level`
8. `contact_name`
9. `contact_email`
10. `giga_id_school`
11. `verification_status`
12. `verification_requested_at`
13. `verification_error`
14. `created`
15. `modified`
16. `created_at`
17. `deleted`

### Field Semantics

- `school_id`: external school identifier supplied by frontend, later expected to match `school.external_id`
- `address`: flexible JSON object storing frontend address fragments, for example `{ "address": "", "state": "Delhi", "city": "Delhi", "postalCode": "" }`
- `education_level`: frontend-provided education level string
- `giga_id_school`: backend-generated UUID for the registration lifecycle
- `verification_status`: tracking field for dispatch/callback/cleanup state
- `verification_requested_at`: timestamp of outbound call to `giga_sync`
- `verification_error`: last dispatch failure detail
- `deleted`: soft-delete timestamp

### Recommended Indexes

- index on `giga_id_school`
- index on `deleted`
- composite index on `(giga_id_school, deleted)`
- recommended additional index on `(school_id, deleted)` for validation and cleanup lookup efficiency

## API Design

### 1. Create School Registration

Endpoint:

- `POST /api/v1/school-registrations`

Access:

- public

Request payload:

```json
{
  "school_id": "SCH-001",
  "school_name": "Sample School",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "address": {
    "address": "Address line 1",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560001"
  },
  "education_level": "Primary",
  "contact_name": "John Doe",
  "contact_email": "john@example.org"
}
```

Important rule:

- `giga_id_school`
- backend generates it during registration creation

Validation:

- all required text fields must be non-empty
- `contact_email` must be a valid email
- `latitude` must be between `-90` and `90`
- `longitude` must be between `-180` and `180`
- `address` must be a JSON object
- `education_level` must be a non-empty string

Database validation:

- check `school.external_id = school_id` with `deleted IS NULL`
- if found, reject registration because the school already exists in the master table
- check `school_new_registration.school_id = school_id` with `deleted IS NULL`
- if found, reject registration because an active temporary registration already exists

Write behavior:

- generate `giga_id_school` as UUID
- create a new row in `school_new_registration`
- set initial status:
  - `verification_status = 'PENDING'`
  - `verification_requested_at = NULL`
  - `verification_error = NULL`

Success response:

```json
{
  "success": true,
  "data": {
    "id": "1",
    "giga_id_school": "generated-uuid",
  },
  "timestamp": "2026-03-16T12:00:00.000Z",
  "message": "success"
}
```

### 2. Outbound Verification Dispatch

Trigger:

- same request cycle as registration creation, after local DB save

Transport:

- `HttpService`

Environment:

- `GIGA_SYNC_REGISTRATION_URL`
- `GIGA_SYNC_AUTH_TOKEN`

Outbound payload shape:

```json
{
  "registration_id": "1",
  "school_id": "SCH-001",
  "school_name": "Sample School",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "address": {
    "address": "Address line 1",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postalCode": "560001"
  },
  "education_level": "Primary",
  "contact_name": "John Doe",
  "contact_email": "john@example.org",
  "giga_id_school": "generated-uuid",
  "created_at": "2026-03-16T12:00:00.000Z",
  "modified_at": "2026-03-16T12:00:00.000Z"
}
```

Dispatch success handling:

- update row with:
  - `verification_status = 'DISPATCHED'`
  - `verification_requested_at = now`
  - `verification_error = NULL`

Dispatch failure handling:

- registration remains active
- update row with:
  - `verification_status = 'FAILED_TO_DISPATCH'`
  - `verification_error = <serialized error>`
- API still returns success because the registration is stored locally

## Callback Design

### Reject Registration

Endpoint:

- `PUT /api/v1/school-registrations/rejection`

Access:

- authenticated

Request payload:

```json
{
  "giga_id_school": "generated-uuid",
  "is_deleted": true
}
```

Behavior:

- locate active registration by `giga_id_school`
- if `is_deleted = true`:
  - set `deleted = now`
  - set `verification_status = 'REJECTED'`
  - update `modified`
- if `is_deleted = false`:
  - keep row active
  - return current state

Idempotency:

- repeated callback calls must not create duplicate state changes
- if already soft-deleted, return existing latest state

## Dynamic Verification Logic

Existing table:

- `dailycheckapp_school`

This table continues to store app login/install activity. It must not be treated as the source of truth for school verification.

### Verification Resolution Rule

For a given `giga_id_school`:

1. look up `school` where:
   - `giga_id_school = ?`
   - `deleted IS NULL`
2. if found:
   - return `school.not_verified !== true`
3. else look up `school_new_registration` where:
   - `giga_id_school = ?`
   - `deleted IS NULL`
4. if found:
   - return `false`
5. else:
   - return `false`

### APIs Affected

- `GET /api/v1/dailycheckapp_schools`
- `GET /api/v1/dailycheckapp_schools/:giga_id_school`
- `POST /api/v1/dailycheckapp_schools`

Response change:

- include `is_verified`

For `POST /api/v1/dailycheckapp_schools`, response shape should be:

```json
{
  "user_id": "generated-user-id",
  "is_verified": false
}
```

## Geocode Proxy

Endpoint:

- `GET /api/v1/geolocation/geocode`

Access:

- public

Request query:

- either `address`
- or both `latitude` and `longitude`
- `components` optional
- `bounds` optional
- `region` optional
- `language` optional

Behavior:

- forward request to `https://maps.googleapis.com/maps/api/geocode/json`
- use existing `GOOGLE_GEOLOCATION_API_KEY`
- return Google response body as-is
- forward upstream error status/body when available

Supported usage patterns:

- forward geocoding by address
- reverse geocoding by latitude and longitude

Forward geocoding example:

```http
GET /api/v1/geolocation/geocode?address=Connaught%20Place%20Delhi
```

Reverse geocoding example:

```http
GET /api/v1/geolocation/geocode?latitude=28.6139&longitude=77.2090
```

Reverse geocoding response note:

- this endpoint is still a raw Google proxy
- consumers should read address data from `results[0].formatted_address` and `results[0].address_components`

Additional endpoint:

- `GET /api/v1/geolocation/geocode/flexible`

Behavior:

- internally uses the same Google geocode proxy flow
- returns a normalized flexible JSON object for frontend use
- supports both:
  - `address`
  - `latitude` + `longitude`
- base response keys:
  - `address`
  - `state`
  - `city`
  - `postalCode`
- optional extra keys can be populated when Google provides them, for example:
  - `country`
  - `subLocality`

Example flexible response:

```json
{
  "address": "Delhi, India",
  "state": "Delhi",
  "city": "Delhi",
  "postalCode": "110001",
  "country": "India"
}
```

Flexible reverse geocoding example:

```http
GET /api/v1/geolocation/geocode/flexible?latitude=28.6139&longitude=77.2090
```

Flexible forward geocoding example:

```http
GET /api/v1/geolocation/geocode/flexible?address=Connaught%20Place%20Delhi
```

Reference:

- https://developers.google.com/maps/documentation/geocoding/requests-geocoding

## Background Cleanup Job

### Purpose

A temporary registration must be soft-deleted once the corresponding school has been created in the master `school` table.

This prevents stale active registrations from continuing to mark a school as unverified.

### Required Behavior

Run one recurring background job that:

1. finds active rows in `school_new_registration` where `deleted IS NULL`
2. checks whether `school.external_id = school_new_registration.school_id` exists with `deleted IS NULL`
3. soft-deletes the matching temporary registrations

### Suggested Update

For every matched registration:

- `deleted = now`
- `modified = now`
- `verification_status = 'CONFIRMED'`

### Recommended Execution Options

Preferred implementation:

- use `@nestjs/schedule`
- register `ScheduleModule.forRoot()`
- add one `@Cron()` method in a dedicated cleanup service

Recommended schedule:

- hourly is a practical default
- if volume is low, daily is also acceptable

### Recommended Service Shape

Suggested service:

- `SchoolRegistrationCleanupService`

Suggested method:

- `softDeleteRegistrationsPresentInSchoolTable()`

Suggested query pattern:

1. read active registrations with `school_id`
2. query master schools by matching `external_id`
3. bulk update temp registrations using `updateMany`

### Pseudocode

```ts
@Cron(CronExpression.EVERY_HOUR)
async softDeleteRegistrationsPresentInSchoolTable(): Promise<void> {
  const activeRegistrations = await prisma.school_new_registration.findMany({
    where: { deleted: null },
    select: { school_id: true },
  });

  if (!activeRegistrations.length) return;

  const schoolIds = activeRegistrations.map((r) => r.school_id);

  const matchedSchools = await prisma.school.findMany({
    where: {
      external_id: { in: schoolIds },
      deleted: null,
    },
    select: { external_id: true },
  });

  const matchedIds = matchedSchools
    .map((s) => s.external_id)
    .filter(Boolean);

  if (!matchedIds.length) return;

  await prisma.school_new_registration.updateMany({
    where: {
      school_id: { in: matchedIds },
      deleted: null,
    },
    data: {
      deleted: new Date(),
      modified: new Date(),
      verification_status: 'CONFIRMED',
    },
  });
}
```

## Error Handling

### Registration API

- invalid payload: `400`
- duplicate `school_id` in master or active registration table: `409`
- local DB failure: `500`
- `giga_sync` failure after save: request still returns success, row stores failure state

### Callback API

- invalid payload: `400`
- auth failure: existing auth mechanism
- unknown `giga_id_school`: return stable success payload with no mutation, if desired by product contract

## Observability

Recommended logs:

- registration created
- `giga_sync` dispatch success
- `giga_sync` dispatch failure
- callback rejection received
- cleanup job run started
- cleanup job rows matched
- cleanup job rows soft-deleted
- cleanup job failure

Recommended metrics:

- registration create count
- registration dispatch failure count
- active registration count
- cleanup job deleted count

## Test Scenarios

### Registration

- valid registration creates row and dispatches verification
- frontend payload containing `giga_id_school` is rejected
- frontend payload with non-object `address` is rejected
- duplicate `school_id` found in `school` is rejected
- duplicate `school_id` found in active `school_new_registration` is rejected
- `giga_sync` failure stores local row and updates status to failure

### Callback

- rejection soft-deletes active registration
- non-delete callback leaves row active
- repeated callback is idempotent

### Verification Logic

- master school with `not_verified = false` resolves verified
- master school with `not_verified = null` resolves verified
- master school with `not_verified = true` resolves not verified
- active temp registration resolves not verified
- no master school and no temp registration resolves not verified

### Cleanup Job

- matched `school.external_id` causes registration soft-delete
- no active registrations returns no-op
- no matching master schools returns no-op
- already deleted registrations are ignored

## Environment Variables

- `GIGA_SYNC_REGISTRATION_URL`
- `GIGA_SYNC_AUTH_TOKEN`
- `GOOGLE_GEOLOCATION_API_KEY`

If scheduled cleanup is implemented with a configurable interval or enable flag, add:

- `SCHOOL_REGISTRATION_CLEANUP_ENABLED`
- `SCHOOL_REGISTRATION_CLEANUP_CRON`

## Open Technical Notes

- Current validation is based on `school_id` uniqueness, not `giga_id_school`.
- `giga_id_school` is generated by the backend and acts as the registration lifecycle identifier.
- The cleanup job should be implemented as a dedicated scheduled task, not embedded ad hoc in request handlers.
- If master school creation can happen with case variations in `external_id`, normalize or use case-insensitive matching consistently in both validation and cleanup queries.

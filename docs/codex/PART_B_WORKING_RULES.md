# PART_B_WORKING_RULES.md

## Purpose

This document gives Codex Part B-specific working rules for the group travel collaboration platform.
It supplements `AGENTS.md` and must not replace `docs/requirements.md`.

## Active responsibility

Part B owns:

- FR-GROUP: travel group, invite code, members, owner role, group status
- Group permission AOP: `@RequiredGroupMember`, `@RequiredGroupOwner`, `GroupAccessValidator`
- FR-EXPENSE: expenses, expense splits, settlement calculation, transfer guide
- FR-SSE: emitter registry, event bridge, heartbeat/reconnect contract
- Notification: in-app notification storage and read state, if implemented

Part B should not implement broad Part A features unless the user explicitly asks.

## Do not use Claude task document

the Part A internal task document is intentionally excluded from the active document set.
Do not search for it, read it, or execute it as a plan unless the user explicitly asks for historical Part A analysis.

## Canonical names

Use these names consistently:

- Group entity: `TravelGroup`
- Group table: `groups`
- Group membership entity: `GroupMember`
- Group membership table: `group_members`
- Member annotation: `@RequiredGroupMember`
- Owner annotation: `@RequiredGroupOwner`
- Member-not-found or not-active-member error: `GROUP_MEMBER_NOT_FOUND`
- Group-not-found error: `GROUP_NOT_FOUND`

Do not introduce `Group` as an entity name.
Do not introduce legacy short-form group permission annotation names if the current codebase already uses the `Required...` names.
Do not introduce an alternate member-not-found error name if `GROUP_MEMBER_NOT_FOUND` exists.

## Permission rule

Service-level validation is the final authority for business-critical permissions.
AOP may act as an entry-point guard, but do not rely only on controller annotations for operations that can be called by other services.

Important examples:

- Group update/delete/invite regeneration/ownership transfer: Owner only
- Expense update/delete: creator or Owner
- Place update/delete: creator or Owner
- Schedule CRUD: group member unless the SRS says otherwise

## Merge conflict rules

Before merge-related edits, inspect:

- `backend/src/main/java/com/enjoytrip/backend/global/exception/ErrorCode.java`
- `backend/src/main/java/com/enjoytrip/backend/global/config/DataInitializer.java`
- `backend/build.gradle`
- `backend/src/main/resources/application.yml`
- `backend/src/main/java/com/enjoytrip/backend/domain/group/`

Rules:

1. Remove temporary Part A group stubs if Part B official group domain exists.
2. Keep `GROUP_NOT_FOUND` defined once.
3. Prefer `GROUP_MEMBER_NOT_FOUND` as the single member-not-found permission error code.
4. Preserve both test-user initialization and seed data in `DataInitializer`.
5. Preserve Gradle settings for WebClient, AOP, QueryDSL, UTF-8, and `-parameters`.
6. Save all files as UTF-8.

## FR-EXPENSE-07 contract

Part A calculates transport time/cost.
Part B records finalized transport cost as an expense.

Preferred contract:

- Use the existing group expense API when possible: `POST /api/groups/{groupId}/expenses`
- Include `sourceScheduleId` as an optional loose reference.
- Use `category = TRANSPORT` and `splitType = EQUAL` for schedule transport costs.

Do not create both `registerAutoExpense()` and `registerTransportExpense()`.
If a dedicated method/API is needed, ask the user which canonical name to use.

## SSE event contract

Part A domains publish Spring application events.
Part B listens and broadcasts through SSE.

Part A should not depend directly on the SSE implementation.
Part B should not implement broad Part A domain behavior just to emit events.

## Implementation style

- Prefer small, maintainable backend changes.
- Keep controller/service/repository/entity/dto responsibilities separated.
- Use DTO validation.
- Keep transactions at service level.
- Use `@Transactional(readOnly = true)` for read-only service methods.
- Use `@EntityGraph` or batched queries when response mapping would otherwise cause N+1 queries.
- Do not silently change API contracts.

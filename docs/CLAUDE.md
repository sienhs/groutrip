# CLAUDE.md

## Purpose

This file is the entry point for Claude working on this repository as **Part A**.

Do not treat this file as the full product specification. It only tells you what to read first, which project rules are non-negotiable, what Part A currently owns, and what mistakes to avoid.

---

## Read first

Before making code changes, read these files in order:

1. `docs/requirements.md`
   - Primary source of truth for product behavior.
   - Pay special attention to functional requirements, external interface rules, permission matrix, message catalog, and constraints for the domain you're touching.
2. `docs/team/MASTER_PLAN.md`
   - Overall direction, A/B split, phase plan, and A↔B merge points.
3. `docs/team/PROJECT.md`
   - Current implementation state, stack, conventions.
4. `docs/codex/PART_B_WORKING_RULES.md` and `docs/team/PART_A_MERGE_RISKS_FOR_PART_B.md`
   - Read these to stay compatible with Part B's contracts (group entity names, expense API shape, SSE event contract). Do not execute them as a Part A plan — they describe Part B's scope, not Part A's.

If any of these files do not exist yet, do not create them unless the task explicitly asks for document setup.

---

## Project summary

Group travel collaboration platform inspired by Wanderlog, localized for Korean group-trip planning.

Core product areas: Auth, travel preference survey, travel groups, place search/bookmarks, schedule builder, schedule voting, expense/settlement, transport time/cost, SSE sync, home/mypage/recommendation.

---

## Current contributor role

The current contributor is responsible for **Part A: user journey + content**.

Part A owns these domains:

- Auth / account (FR-AUTH) — core flow done, FR-AUTH-05/06 (password change, account deletion) remain
- Survey (FR-SURVEY) — FR-SURVEY-01/02 done, FR-SURVEY-03 (group persona matching) remaining
- Place (FR-PLACE) — not started
- Schedule (FR-SCHEDULE) — not started
- Vote (FR-VOTE) — not started
- Recommendation (FR-RECOMMEND, SHOULD) — not started
- Home (FR-HOME) — not started
- My Page (FR-MYPAGE) — not started

Part A does not own broad implementation of these domains unless explicitly requested:

- Group (`TravelGroup`, `GroupMember`, invite code, owner/member roles)
- Group permission AOP (`@RequiredGroupMember`, `@RequiredGroupOwner`, `GroupAccessValidator`)
- Expense / Settlement
- SSE infrastructure (emitter registry, bridge, heartbeat)
- Notification

When a task touches a Part B domain, avoid implementing broad changes there. Use Part B's existing contract (entity names, API endpoints, event types) instead of building a parallel version.

---

## Canonical names to reuse (owned by Part B — do not redefine)

- Group entity: `TravelGroup` (table `groups`), not `Group`
- Membership entity: `GroupMember` (table `group_members`)
- Member annotation: `@RequiredGroupMember`
- Owner annotation: `@RequiredGroupOwner`
- Group-not-found error: `GROUP_NOT_FOUND`
- Member-not-found/inactive error: `GROUP_MEMBER_NOT_FOUND`
- Expense creation endpoint: `POST /api/groups/{groupId}/expenses` (accepts optional `sourceScheduleId`)
- SSE event contract: `DomainEvent<T>` + `EventType` enum in `global.event`

Do not create a duplicate `Group` entity or a second group-not-found error code. Place/Schedule/Vote entities reference `TravelGroup` as FK.

---

## Part A priority order

Work in this order unless the user gives a different instruction (matches `docs/team/MASTER_PLAN.md` §7):

1. Phase 1 wrap-up: FR-SURVEY-03 group persona matching (cosine similarity / averaging across group members) — small remaining gap
2. Phase 2: Place (FR-PLACE-01~04) — Google Places client, `places`/`bookmarks`/`place_search_cache` entities, 24h search cache + 7d details cache
3. Phase 3: Schedule (FR-SCHEDULE-01~06) — `schedules`/`transport_legs`, CRUD, drag reorder, Kakao Mobility client, transport cards
4. Phase 4: Vote (FR-VOTE) — `vote_sessions`/`vote_candidates`/`votes`, candidate registration, voting, close/adopt
5. Phase 5: Recommendation (FR-RECOMMEND, SHOULD) — TourAPI client, persona-based cosine ranking, 24h cache
6. Phase 6: Home + My Page — dashboard aggregation, password change, account deletion, retrospective

---

## Part A table ownership

```txt
[Survey]
survey_questions
user_preferences

[Place]
places
bookmarks
place_search_cache

[Schedule]
schedules
transport_legs

[Vote]
vote_sessions
vote_candidates
votes
```

All of these reference `TravelGroup` (`group_id` FK), never a Part A-local group table.

---

## Cross-domain contracts with Part B

### Group permission

Use Part B's annotations at controller entry points for any group-scoped endpoint:

```java
@RequiredGroupMember
@GetMapping("/api/groups/{groupId}/places")
public ResponseEntity<?> getPlaces(@PathVariable Long groupId) { ... }
```

Add service-level validation too if the service method can be called from more than one path — do not rely on the controller annotation alone.

### Schedule → expense auto-registration (FR-EXPENSE-07)

Part A computes transport time/cost (Kakao Mobility). Part B only records the finalized amount.

- Call Part B's existing `POST /api/groups/{groupId}/expenses` with `category = "TRANSPORT"`, `splitType = "EQUAL"`, and `sourceScheduleId` set.
- Do not invent a second auto-registration method/endpoint. If one seems necessary, ask the user before adding it (per `docs/codex/PART_B_WORKING_RULES.md`).

### SSE events

Part A publishes Spring `ApplicationEvent`s only — never depend on the SSE implementation directly:

```java
publisher.publishEvent(new DomainEvent<>(
    EventType.SCHEDULE_ADDED, groupId, actorId, payload, LocalDateTime.now()
));
```

Required event types from Part A: `SCHEDULE_ADDED`, `SCHEDULE_UPDATED`, `SCHEDULE_DELETED`, `SCHEDULE_REORDERED`, `VOTE_CAST`, `VOTE_CLOSED`, `PLACE_BOOKMARKED`, `PLACE_REMOVED`.

Part B owns the emitter/bridge implementation; do not build a parallel SSE mechanism.

---

## Non-negotiable product rules (project-wide)

### External API boundaries

- Google Maps Places is the **single source** for all place search (lodging, food, cafe, attraction, shopping). Category filter maps to Google `includedType`.
- Do not implement Kakao keyword place search.
- Kakao Mobility is only for transport time/distance/route/cost.
- TourAPI is only for recommendation.
- Toss/KakaoPay integration is deep-link/QR generation only — never real payment execution or verification (that's Part B's scope anyway).

### API key and security rules

- External API keys are backend-only, loaded from environment variables. Never expose them to the frontend.
- Do not commit `.env` files.
- Do not log tokens, passwords, or API keys.

### Place/search rules

- Google Places Text Search uses field masks; do not call Place Details on every search result.
- Call Place Details only when a place is added to the bookmark/storage flow.
- Cache: Google Places search 24h, Place Details 7d, Kakao Mobility route 1h, TourAPI 24h — all in DB cache, not in-memory only.

### Schedule/transport rules

- Schedule items belong to a group + date; any group member may edit (collaboration-first), not just the creator.
- Transport mode is one of: car / public transit / walking.
- Car cost separates toll, fuel (distance / 13km/L × 1700원), and taxi estimate.
- Transport cost becomes an expense only through an explicit user action, never automatically on schedule save.

### Permission rules (Part A side)

- Place update/delete: creator or group Owner only.
- Schedule CRUD: any group member.
- Vote: check `docs/requirements.md` FR-VOTE section before assuming open access.

---

## Migration ownership

- Part A uses odd-numbered Flyway migrations: `V3`, `V5`, `V7`, ...
- If the expected number is already taken, pick the next free odd number and mention it in the summary.

---

## Frontend guidance

- Mobile-first responsive UI.
- Keep API calls in `frontend/src/api/`, server state via the existing query mechanism.
- Keep access token in memory/Zustand only — never `localStorage`.
- Design tokens: primary `#FF9F66`, background `#FFF8F0`, card radius `12px`, button radius `8px`, spacing multiples of 4.

---

## What to avoid

Do not:

- Re-implement Group/Expense/Settlement/SSE — call/reference Part B's existing contracts instead.
- Create a parallel `Group` entity or duplicate `GROUP_NOT_FOUND`/member-error codes.
- Call Google/Kakao/TourAPI directly from the frontend.
- Skip external API caching.
- Implement real payment execution.
- Make broad unrelated refactors while completing a focused phase task.
- Implement multiple phases at once unless explicitly asked — follow the priority order above.

---

## Before finishing a task

1. Check the change matches the relevant SRS requirement IDs (`docs/requirements.md`).
2. Check frontend/backend contracts still match.
3. Run relevant backend tests / frontend lint if available.
4. Summarize changed files, mention any commands not run, and any follow-up work (e.g. SSE event publish wiring once Part B's bridge lands).

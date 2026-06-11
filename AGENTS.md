# AGENTS.md

## Purpose

This file is the entry point for Codex agents working on this repository.

Do not treat this file as the full product specification. It only tells you what to read first, which project rules are non-negotiable, what the current contributor owns, and what mistakes to avoid.


---

## Read first

Before making code changes, read these files in order:

1. `docs/requirements.md`
   - This is the primary source of truth for product behavior.
   - If the file name differs, locate the latest SRS document titled `그룹여행협업플랫폼_요구사항명세서`.
   - Pay special attention to external interface rules, functional requirements, non-functional requirements, permission matrix, message catalog, and constraints.
2. `docs/codex/CODEX_DOCUMENT_INDEX.md`, if present
   - This explains how Codex should use project documents.
3. `docs/codex/PART_B_WORKING_RULES.md`, if present
   - This contains Part B-specific working rules.
4. `README.md`, if present
5. Existing package/build configuration files:
   - Backend: Gradle/Maven config, `application.yml`, domain package structure
   - Frontend: `package.json`, router setup, API client, state/query setup
6. Existing `.env.example` files, if present

For cross-domain or merge-related work, also read:

1. `docs/team/MASTER_PLAN.md`
2. `docs/team/PROJECT.md`
3. `docs/team/MERGE_READINESS_REVIEW.md`

Do not add the Part A internal task document to the active Codex document set. If that file exists elsewhere, do not read or execute it unless the user explicitly asks for Part A historical analysis.

If any of these files do not exist yet, do not create them unless the task explicitly asks for document setup.

---

## Project summary

This is a web-based group travel collaboration platform inspired by Wanderlog, localized for Korean group-trip planning.

Core product areas:

- Auth / account
- Travel preference survey
- Travel groups and invite codes
- Place search and group place bookmarks
- Schedule builder
- Schedule voting
- Expense tracking and settlement
- Transport time/cost integration
- SSE-based real-time synchronization
- Home, my page, and recommendations

---

## Current contributor role

The current contributor is responsible for **Part B: foundation, cost, and infrastructure**.

Part B owns these domains:

- Group
- Expense
- Settlement
- SSE
- Notification
- Group permission AOP

Part B does not own broad implementation of these domains unless explicitly requested:

- Auth
- Survey
- Place
- Schedule
- Vote
- Recommendation
- Home
- My Page
- Google Places integration
- Kakao Mobility integration
- TourAPI integration

When a task touches a Part A domain, avoid implementing broad changes there. Prefer a clear API/event contract and add only the minimum integration code needed for Part B to work.

---

## Korean comment and encoding guidance

새 기능을 구현하거나 기존 기능을 크게 수정할 때는 유지보수자가 기능 단위를 빠르게 파악할 수 있도록 필요한 곳에 한글 주석을 남긴다.

주석 작성 원칙:

1. 컨트롤러, 서비스, 엔티티, AOP, 배치, 이벤트 리스너처럼 역할이 나뉘는 코드에는 “이 코드가 어떤 기능 요구사항을 담당하는지”를 한글로 짧게 설명한다.
2. 복잡한 비즈니스 규칙, 권한 분기, 상태 전이, 정렬 기준, 정산 알고리즘, SSE 이벤트 흐름에는 구현 의도를 한글 주석으로 남긴다.
3. 단순 getter/setter, 명백한 변수 대입, 프레임워크 기본 애노테이션처럼 코드만 봐도 알 수 있는 내용에는 불필요한 주석을 달지 않는다.
4. TODO 주석은 가능하면 관련 요구사항 ID와 함께 작성한다. 예: `// TODO(FR-GROUP-05): Owner 이전 로직 구현`
5. 주석은 코드의 현재 동작과 다르면 안 된다. 기능을 수정할 때 관련 주석도 함께 갱신한다.
6. Part A 영역과 맞닿는 인터페이스나 이벤트 계약은, Part B가 직접 구현하지 않는 범위와 기대 요청/응답 형태를 한글 주석으로 명확히 남긴다.

Encoding rules:

- Save all source and document files as UTF-8.
- Do not convert files to CP949, EUC-KR, or Windows-949.
- If Korean comments appear garbled, do not guess and rewrite their meaning silently. Report the affected file and ask before rewriting.
- If adding Gradle compiler settings, preserve UTF-8 and `-parameters` where needed by Spring/AOP parameter-name resolution.

---

## Part B priority order

Work in this order unless the user gives a different instruction:

1. Common backend foundation
   - BaseEntity
   - ApiResponse
   - ErrorCode
   - GlobalExceptionHandler
   - BusinessException
   - Soft Delete convention
   - Flyway setup
   - Common enums
2. Group domain
   - `groups`
   - `group_members`
   - invite code
   - owner/member roles
   - group status
3. Group permission AOP
   - `@RequiredGroupMember`
   - `@RequiredGroupOwner`
   - group membership validation
   - owner validation
4. Expense domain
   - `expenses`
   - `expense_splits`
   - split validation
   - expense CRUD
5. Settlement domain
   - balance calculation
   - greedy minimum-transfer algorithm
   - settlement status transition, if required by the SRS
6. SSE infrastructure
   - emitter registry
   - event bridge
   - heartbeat
   - reconnect/fallback support contract
7. Notification domain
8. Cross-domain integration
   - FR-EXPENSE-07 transport cost auto-registration contract
   - ApplicationEvent bridge from Part A domains to SSE

---

## Part B table ownership

Part B primarily owns:

```txt
[Group]
groups
group_members

[Expense / Settlement]
expenses
expense_splits
settlements, if implemented as persisted records

[Notification / SSE]
notifications
```

SSE emitters are not database records. Prefer in-memory management such as:

```txt
ConcurrentHashMap<groupId, Set<SseEmitter>>
```

If the app later becomes multi-server, leave room for Redis Pub/Sub, but do not implement it prematurely.

---

## Merge and cross-team safety rules

Before merge-related work, read `docs/team/MERGE_READINESS_REVIEW.md` if present.

Known high-risk files and areas:

- `backend/src/main/java/com/enjoytrip/backend/global/exception/ErrorCode.java`
- `backend/src/main/java/com/enjoytrip/backend/global/config/DataInitializer.java`
- `backend/build.gradle`
- `backend/src/main/resources/application.yml`
- Temporary or duplicate `domain/group/` stubs from Part A

Rules:

1. Do not keep duplicate group domain classes.
2. The canonical group entity is `TravelGroup`, mapped to the `groups` table.
3. The canonical membership entity is `GroupMember`, mapped to the `group_members` table.
4. Prefer Part B's official group domain over any temporary Part A stubs.
5. For member-not-found permission errors, prefer a single canonical `ErrorCode`, currently `GROUP_MEMBER_NOT_FOUND`, unless the existing codebase has standardized another name.
6. Keep `GROUP_NOT_FOUND` defined only once.
7. When merging `DataInitializer`, preserve both test-user initialization and always-needed seed data such as survey questions.
8. Do not remove build settings required for UTF-8 encoding, Java parameter names, QueryDSL, WebClient, or test/build stability.

---

## Part B cross-domain contracts

### Schedule to expense auto-registration: FR-EXPENSE-07

Part A owns schedule UI and transport-cost display.

Part B owns the expense API that accepts an optional schedule source reference.

Expected request shape:

```json
{
  "amount": 12000,
  "category": "TRANSPORT",
  "splitType": "EQUAL",
  "participantIds": [1, 2, 3],
  "sourceScheduleId": 42,
  "description": "[자동] 강남역 → 홍대입구 자동차 이동 (톨비 + 연료비)"
}
```

Rules:

- `sourceScheduleId` is optional.
- If the referenced schedule is deleted, settlement history should remain.
- Prefer a loose reference by storing only `sourceScheduleId` unless the SRS or current schema requires a hard FK.
- Part B should not calculate Kakao Mobility transport data directly.
- Part B only records the finalized amount submitted through the expense API.
- Do not implement both `registerAutoExpense()` and `registerTransportExpense()` without confirming the final method/API name. Keep one canonical contract.

### Domain events to SSE

Part A domains should publish Spring application events such as schedule/place/vote changes.

Part B should listen to those events and broadcast through SSE.

Pattern:

```java
// Part A domain service
publisher.publishEvent(new ScheduleAddedEvent(groupId, actorId, payload));

// Part B infrastructure
@EventListener
public void on(ScheduleAddedEvent event) {
    sseService.broadcast(event.groupId(), "SCHEDULE_ADDED", event.payload());
}
```

Part A should not depend directly on the SSE implementation.

### Group permission annotations

Part B owns:

- `@RequiredGroupMember`
- `@RequiredGroupOwner`
- AOP implementation
- `GroupAccessValidator`

Use service-level validation as the final authority for business-critical permissions. AOP may be used as an entry-point guard, but do not rely on controller annotations alone when a service method can be called from multiple places.

Avoid duplicate permission checks when possible, but prefer safety over removing checks prematurely.

---

## Scope constraints

- Web only. Do not implement native mobile app features.
- Mobile-first responsive UI is required.
- The project assumes a small team and short development period, so prefer simple, maintainable implementations over over-engineered abstractions.
- Treat SHOULD-level recommendation features, such as TourAPI recommendations, as lower priority than MUST-level core group, schedule, place, auth, and expense flows.
- For this contributor, prioritize Part B backend correctness before UI polish.

---

## Non-negotiable product rules

### External API boundaries

- Google Maps Places is the single source for all place search.
  - Use it for lodging, restaurants, cafes, attractions, shopping, and other places.
  - Category filtering should map to Google `includedType`.
- Do not use Kakao Map keyword search for place search.
- Kakao Mobility is only for transport time, distance, route, and cost calculation.
- TourAPI is only for recommendation flows.
- Toss / KakaoPay integration is deep-link or QR based only.
  - Do not implement real payment execution or payment verification.

### API key and security rules

- External API keys must be used only by the backend.
- Never expose Google, Kakao, TourAPI, JWT, DB, or other secrets in frontend code.
- Use environment variables for secrets and deployment-specific config.
- Do not commit `.env` files.
- Do not log passwords, tokens, refresh tokens, API keys, or personally sensitive data.

### Auth rules

- Passwords must be hashed with BCrypt.
- Access tokens must not be stored in `localStorage`.
- Refresh tokens should be handled as HttpOnly Secure cookies.
- Login error messages must not reveal whether the email or password was wrong.
- Changing password should invalidate existing refresh tokens.

### Place/search rules

- Google Places Text Search should use field masks.
- Search results should not call Place Details by default.
- Place Details should be called only when a place is added to the group bookmark/storage flow.
- Cache external API results according to the SRS:
  - Google Places search: 24 hours
  - Google Place Details: 7 days
  - Kakao Mobility route lookup: 1 hour
  - TourAPI result: 24 hours

### Schedule and transport rules

- Schedule items belong to a group and date.
- All group members may edit schedules unless a more specific permission rule applies.
- Transport cards appear between schedule places.
- Transport mode must remain one of:
  - car
  - public transit
  - walking
- Car cost calculation should separate toll, fuel, and taxi estimates where applicable.
- Transport cost can be converted into an expense only through the explicit user action described in the SRS.

### Expense and settlement rules

- Expense settlement must be based on member balance:
  - paid amount minus owed amount.
- Use the greedy minimum-transfer approach described in the SRS.
- Settlement completion is user-confirmed.
- The app does not verify actual bank/payment completion.
- `TRANSPORT` expenses may be created from schedule transport costs, but the actual expense record must still be editable by the user.

### SSE rules

- Group detail pages should use SSE for real-time synchronization.
- Events should invalidate or update client-side cached group data.
- Ignore events created by the current user when needed to avoid conflicts with optimistic updates.
- Provide polling fallback when SSE repeatedly fails.

### Permission rules

Always check the SRS permission matrix before changing authorization behavior.

Important examples:

- Only group Owner can update group info, dissolve group, kick members, transfer ownership, or regenerate invite code.
- Place update/delete is allowed for the original creator or Owner.
- Expense update/delete is allowed for the original creator or Owner.
- Schedule CRUD is collaborative and available to group members.

---

## Architecture guidance

If this repository is a monorepo, keep frontend and backend responsibilities separated.

Recommended structure:

```txt
/
├─ frontend/
├─ backend/
├─ docs/
│  ├─ requirements.md
│  ├─ codex/
│  └─ team/
└─ AGENTS.md
```

Do not mix frontend components, backend controllers, DTOs, services, and database code in the same unstructured location.

---

## Frontend guidance

For Part B tasks, avoid frontend changes unless the user explicitly asks or a contract must be verified end-to-end.

- Keep UI mobile-first.
- Use existing component patterns before creating new ones.
- Keep API calls in a dedicated API/client layer.
- Keep server state in React Query or the existing query mechanism.
- Keep auth access token in memory/state, not persistent browser storage.
- Use the design tokens from the SRS:
  - Primary: `#FF9F66`
  - Background: `#FFF8F0`
  - Border radius: cards `12px`, buttons `8px`
  - Font: Pretendard or Noto Sans KR
  - Spacing based on multiples of 4
- Do not use `dangerouslySetInnerHTML` unless the task explicitly requires it and sanitization is handled.

---

## Backend guidance

- Keep domain packages separated:
  - auth
  - survey
  - group
  - place
  - schedule
  - vote
  - expense
  - settlement
  - sse
  - notification
  - recommend
- Keep controller, service, repository, DTO, and entity responsibilities separated.
- Validate request DTOs.
- Use parameter binding. Do not introduce unsafe native SQL.
- Use transactions around service-level business operations.
- Use Flyway or the existing migration system for schema changes.
- Do not put external API keys in frontend-accessible responses.
- For Part B work, prefer backend tests before frontend polish.
- Keep entities focused on state and domain behavior. Put authorization and orchestration in services or AOP.

---

## API contract guidance

When changing request/response shapes:

1. Update backend DTOs.
2. Update frontend API types/client code only if this task owns the frontend integration.
3. Update affected UI logic only when it is inside the task scope.
4. Update tests or examples.
5. Mention the changed contract in the final summary.

Do not silently change API contracts.

---

## Migration ownership

To avoid Flyway version conflicts:

- Part B should prefer even-numbered migrations: `V2`, `V4`, `V6`, ...
- Part A should prefer odd-numbered migrations: `V3`, `V5`, `V7`, ...

If an existing migration already uses the expected number, choose the next available version and mention it in the final summary.

---

## Testing priorities

Add or update tests when touching:

- Auth/token logic
- Permission checks
- Group membership/owner validation
- Invite code generation
- Settlement calculation
- Expense splitting
- External API proxy/cache behavior
- Schedule reorder/transport-cost behavior
- SSE event publishing or client handling
- Notification creation/read behavior

If tests cannot be run, clearly say which commands were skipped and why.

---

## What to avoid

Do not:

- Duplicate the full SRS inside this file.
- Execute the Part A internal task document as a work plan.
- Implement broad Part A features unless explicitly requested.
- Keep temporary Part A group stubs when Part B official group domain exists.
- Implement Kakao place search.
- Call Google/Kakao/TourAPI directly from the frontend.
- Expose API keys or secrets.
- Store access tokens in `localStorage`.
- Skip external API caching.
- Add native mobile app assumptions.
- Implement real payment execution.
- Ignore Owner/member permission differences.
- Change core product behavior without checking the SRS.
- Make broad unrelated refactors while completing a focused task.
- Modify unrelated files unless necessary.
- Implement all of Part B at once unless explicitly asked.

---

## Before finishing a task

Before reporting completion:

1. Check that the change matches the relevant SRS requirement IDs.
2. Check that frontend and backend contracts still match.
3. Run the relevant lint/test/build command if available.
4. Summarize changed files.
5. Mention any commands not run.
6. Mention any known limitations or follow-up work.

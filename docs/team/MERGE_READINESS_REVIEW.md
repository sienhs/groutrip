# 파트 A 작업 검수 보고서 (Phase 0~2 / 머지 준비 점검)

작성일: 2026-06-10
대상 브랜치: `sienhs` (작업 브랜치)
비교 대상: `origin/develop`, `origin/hodu42` (파트 B 그룹/정산 도메인)
검수 범위: Part A Phase 0~2 결과물 기준. Part A 내부 작업 계획 문서는 Codex 활성 문서에 포함하지 않음. Phase 3, 4는 사용자 결정에 따라 워킹트리에서 폐기됨

---

> **Codex 사용 메모 (Part B 기준)**
> 이 문서는 머지 충돌 방지 체크리스트로만 사용한다.
> Part A 내부 작업 계획 문서는 Codex 활성 문서에 포함하지 않는다.
> 실제 수정 전에는 현재 브랜치의 코드가 이 보고서 작성 시점과 다른지 먼저 확인한다.

## 1. 현재 상태 요약

| 구분 | 상태 |
|---|---|
| Phase 0 (공통 인프라) | 완료, 커밋됨 (HEAD 포함) |
| Phase 1 (성향 설문) | 완료, 커밋됨 (`2b94e5f`) |
| Phase 2 (장소 보관함) | 완료, **미커밋(워킹트리)** |
| Phase 3 (일정 빌더) | 작성 후 폐기됨 (워킹트리에서 삭제) |
| Phase 4 (일정 투표) | 작성 후 폐기됨 (워킹트리에서 삭제) |
| 백엔드 빌드 | `./gradlew build -x test` 통과 |
| 프론트 타입체크 | `npx tsc -b` 통과 |

현재 워킹트리 변경 목록:
```
M  backend/build.gradle
M  backend/src/main/resources/application.yml
M  frontend/src/App.tsx
?? backend/src/main/java/com/enjoytrip/backend/domain/group/   (B 도메인 임시 스텁)
?? backend/src/main/java/com/enjoytrip/backend/domain/place/
?? backend/src/main/java/com/enjoytrip/backend/global/config/WebClientConfig.java
?? frontend/src/api/place.ts, types/place.ts, pages/places/
```

---

## 2. Phase별 설계 대비 구현 점검

### Phase 0: 공통 인프라 개선
- Task 0.1 (BaseEntity 추출): 완료. `User`, `RefreshToken`이 `BaseEntity`를 상속하도록 정리됨.
- Task 0.2 (ErrorCode 추가): 완료. 명세에 제시된 User/Survey/Place/Schedule/Vote/Group 항목이 모두 추가됨.
  - 다만 **Schedule/Vote 관련 ErrorCode는 현재 사용처가 없음** (Phase 3/4 폐기로 인해). Phase 0 시점에 한꺼번에 선반영하라는 지시(Task 0.2)에 따른 것으로, 설계 위반은 아니나 "사용되지 않는 enum 상수"로 남아 있는 점은 인지 필요.
  - **그룹 관련 ErrorCode(`GROUP_NOT_FOUND`, `GROUP_MEMBER_NOT_FOUND`)가 B 브랜치(`origin/hodu42`)의 ErrorCode 추가분과 충돌 가능성 있음** → 4장 참고.
- Task 0.3 (회원가입 이름 검증): 완료. `SignupRequest`에 `@Pattern("^[가-힣a-zA-Z0-9]{2,20}$")` 적용됨.
- `.env.example` 작성, JWT 설정 환경변수화 완료.

### Phase 1: 성향 설문 (FR-SURVEY)
- 5개 차원(`SurveyDimension`: ACTIVITY, FOOD, PACE, URBAN_NATURE, TIME_PREF), 12문항 시드 데이터 구성 완료.
- `UserPreference`는 `User`와 1:1 공유 PK(`@Id userId`) 구조로 구현됨 — 명세 패턴과 일치.
- 정규화 로직(`isReverse` 처리, 응답 없는 차원 기본값 0.5) 구현됨.
- API 3종(`GET /api/surveys/questions`, `POST /api/surveys/submit`, `GET /api/surveys/me`) 모두 존재.
- 프론트: 12문항 5점 척도 폼, 레이더 차트 결과 페이지, 로그인 후 미설문 시 `/survey`로 리다이렉트 처리 모두 구현됨.
- **DataInitializer 변경**: 기존 "테스트 유저 존재 시 즉시 return" 구조를 "설문 시드는 항상 실행"되도록 재구성함 → B 브랜치도 동일 파일을 별도로 수정했으므로 머지 시 충돌 지점 (4장 참고).

### Phase 2: 장소 보관함 (FR-PLACE + Google Places)
- `Place`, `Bookmark`, `PlaceSearchCache`(명세 외 추가, 24시간 캐시) 엔티티 구현됨.
- `GooglePlacesClient.searchText()` — WebClient 기반, 빈 결과 시 NPE 방지 처리(`getPlaces() != null ? ... : List.of()`) 적용됨.
- API: `GET /api/places/search`, `GET/POST/PATCH/DELETE /api/groups/{groupId}/bookmarks[/{id}]` 구현됨.
- 그룹 멤버 검증은 명세의 폴백 패턴(`groupMemberRepository.existsByTravelGroupIdAndUserIdAndLeftAtIsNull`) 그대로 사용 — **B의 정식 `GroupMemberRepository`와 메서드 시그니처가 동일**하여 스텁 교체 시 코드 변경 불필요 (4장 참고).
- 프론트: 검색/카테고리 필터/리스트·지도 토글(지도는 placeholder), 보관함 목록(정렬/메모/삭제) 구현됨.
- `PlaceBookmarkedEvent` 발행 — B의 `SseEventBridge`가 `@EventListener`로 수신할 수 있도록 `ApplicationEventPublisher` 패턴 준수.

### Phase 3 / Phase 4
- 사용자 요청에 따라 작성된 코드(일정 빌더, 카카오 모빌리티 연동, 투표) 전체를 워킹트리에서 삭제하고, 관련 설정(`application.yml`의 kakao.mobility, `package.json`의 `@dnd-kit/*`, `App.tsx` 라우트)도 함께 원복함. 잔여 참조 없음 확인됨 (빌드/타입체크 통과).

---

## 3. B 도메인 스텁 → 정식 코드 교체 영향도 분석

`origin/hodu42` 확인 결과, B는 그룹 도메인 + 권한 AOP를 이미 다음과 같이 구현해 둠:
- `domain/group/entity/{TravelGroup, GroupMember, GroupRole, GroupStatus}`
- `domain/group/aop/{GroupPermissionAspect, RequiredGroupMember, RequiredGroupOwner}`
- `domain/group/repository/{TravelGroupRepository, GroupMemberRepository}`
- `domain/group/service/{GroupService, GroupAccessValidator, CurrentUserResolver, GroupStatusBatchService}`
- `domain/group/controller/GroupController`, 관련 DTO
- `domain/expense/*` (정산 도메인 일부)

### 3.1 호환되는 부분 (교체 시 A 코드 수정 불필요)
- `GroupMemberRepository.existsByTravelGroupIdAndUserIdAndLeftAtIsNull(Long, Long)` — A 스텁과 시그니처 동일. Phase 2 `PlaceService`의 멤버 검증 코드는 그대로 동작.
- `TravelGroupRepository.findById(Long)` — `JpaRepository` 기본 메서드이므로 B의 확장 메서드 추가와 무관하게 동작.
- `GroupRole`(OWNER/MEMBER), `GroupStatus`(PLANNING/IN_PROGRESS/COMPLETED/DELETED) — enum 상수 이름 동일. B 쪽은 `GroupStatus.fromDates()` static 메서드가 추가되어 있으나 A 코드에서 사용하지 않으므로 문제 없음.

### 3.2 차이가 있는 부분 (단, A 코드에서 미사용이라 영향 없음)
- 테이블명: A 스텁은 `travel_groups`, B 정식은 `groups`.
- 필드명: A 스텁은 `name`, B 정식은 `title` + `destination`, `inviteCode`, `coverImageKey`, `deletedAt` 등 추가 필드 보유.
- B의 `TravelGroup`은 `BaseEntity`를 상속하지 않고 자체 `@CreatedDate/@LastModifiedDate`를 보유 (Task 0.1의 "B에게 제안만" 방침과 일치, A가 손댈 필요 없음).
- A Phase 2 코드는 `TravelGroup`의 `name`/`title` 등 필드를 직접 참조하지 않으므로 **교체 시 PlaceService/Bookmark 쪽 수정 불필요**.

### 3.3 결론
**Phase 2 코드 자체는 B의 정식 그룹 도메인과 즉시 호환됩니다.** 머지 시 해야 할 작업은:
1. A가 만든 `domain/group/` 스텁 6개 파일(엔티티 4 + 레포지토리 2) 삭제
2. B의 `origin/hodu42`를 머지/리베이스하여 정식 클래스 반영
3. (선택) `@RequiredGroupMember` AOP가 준비되었으므로, `PlaceController`/`PlaceService`의 수동 `existsByTravelGroupIdAndUserIdAndLeftAtIsNull` 검증을 점진적으로 어노테이션 기반으로 전환 검토 (지금 당장 필수는 아님, 폴백 패턴은 정상 동작)

---

## 4. 머지 충돌 예상 지점

`origin/hodu42`와 현재 브랜치가 공통으로 수정한 파일은 다음과 같으며, 머지 시 수동 병합이 필요합니다.

### 4.1 `backend/src/main/java/com/enjoytrip/backend/global/exception/ErrorCode.java` — 충돌 (수동 병합 필요)
- A: `GROUP_NOT_FOUND(...)`, 기존 문서에는 다른 멤버 권한 오류명이 있었으나 Codex 기준에서는 `GROUP_MEMBER_NOT_FOUND`로 통일
- B: `GROUP_NOT_FOUND(NOT_FOUND, "Group not found.")`, `GROUP_MEMBER_NOT_FOUND(FORBIDDEN, ...)`, `GROUP_OWNER_REQUIRED`, `GROUP_OWNER_CANNOT_LEAVE`, `GROUP_FULL`, `DUPLICATE_GROUP_MEMBER`
- **`GROUP_NOT_FOUND`가 동일 이름으로 양쪽에 존재** (메시지 언어만 다름) → 하나로 통일 필요.
- A의 기존 멤버 권한 오류명과 B의 `GROUP_MEMBER_NOT_FOUND`는 **의미가 같은 별도 이름의 상수** → A 코드(현재 미사용 — Phase 2는 직접 ErrorCode를 던지지 않고 폴백 검증만 수행하므로 실질 영향 적음)에서 참조 여부 확인 후 B 쪽 이름으로 통일 권장.

### 4.2 `backend/src/main/java/com/enjoytrip/backend/global/config/DataInitializer.java` — 충돌 (수동 병합 필요)
- A: 설문 시드를 항상 실행하도록 early-return 구조 제거.
- B: 동일 메서드를 영문 로그/이름("Test User")으로 재포맷, early-return 구조는 유지한 듯 보임.
- 양쪽의 의도(설문 시드 실행 보장 + B의 포맷/문구 변경)를 모두 반영하는 수동 병합 필요.

### 4.3 `backend/build.gradle` — 충돌 가능성 낮음
- A: `spring-boot-starter-webflux` 추가 (webmvc 의존성 다음 줄)
- B: `spring-aop`, `aspectjweaver` 추가 (data-jpa 의존성 다음 줄)
- 서로 다른 위치에 줄 추가이므로 git이 자동 병합할 가능성이 높으나, 줄바꿈(EOF newline) 차이가 있어 확인 필요.

### 4.4 `backend/src/main/java/com/enjoytrip/backend/BackendApplication.java` — 충돌 없음
- A는 이 파일을 수정하지 않았음. B가 `@EnableScheduling` 추가 및 정리 — 머지 시 B 버전이 그대로 적용되면 됨.

### 4.5 기타 B 단독 변경 (충돌 없음)
- `.gitignore`, `docker-compose.yml`, `AGENTS.md`, `docs/requirements.md`, `domain/expense/*` — A가 손대지 않은 영역으로 깨끗하게 머지됨.

---

## 5. 권장 머지 절차

1. (A) Phase 2 변경사항 커밋 — 별도 안내한 커밋 메시지 사용.
2. `origin/hodu42`(또는 develop에 먼저 머지된 버전)를 현재 브랜치에 머지.
3. 충돌 파일 수동 해결:
   - `ErrorCode.java`: `GROUP_NOT_FOUND` 중복 제거(B 버전 채택), `GROUP_MEMBER_NOT_FOUND`/`GROUP_MEMBER_NOT_FOUND` 사용처 확인 후 통일.
   - `DataInitializer.java`: 설문 시드 always-run 로직 + B의 포맷 반영하여 재작성.
   - `build.gradle`: 두 의존성 라인 모두 유지, EOF 개행 정리.
4. A의 `domain/group/` 스텁 6개 파일 삭제 (B 정식 클래스로 자동 대체됨).
5. 백엔드 `./gradlew build -x test`, 프론트 `npx tsc -b` 재검증.
6. (선택, 후속 작업) `PlaceController`에 B의 `@RequiredGroupMember` AOP 적용 검토.

---

## 6. 기타 발견 사항 / 메모

- `PlaceSearchCache`(24시간 캐시), `WebClientConfig`는 명세에 명시되지 않았으나 Google Places 연동 안정성을 위해 추가된 항목으로, 구조적으로 무리 없음.
- Phase 3/4에서 추가했던 `kakao.mobility`, `@dnd-kit/*`, 일정/투표 라우트는 모두 깨끗하게 제거되어 잔여물 없음.
- `frontend/package-lock.json`은 `@dnd-kit` 제거 후 재설치 결과 원본과 동일하여 변경 없음.
- 본 보고서 시점 기준, 환경상 PostgreSQL 미기동으로 런타임(시드 로그, API 실제 호출) 검증은 수행하지 못했으며 컴파일/타입체크 수준의 검증만 완료됨.


---

## 7. Codex 적용 규칙 요약

1. the Part A internal task document는 이 저장소의 활성 Codex 문서로 넣지 않는다.
2. Part A가 만든 임시 `domain/group/` 스텁은 Part B 정식 그룹 도메인이 존재하면 제거한다.
3. 권한 어노테이션 명칭은 `@RequiredGroupMember`, `@RequiredGroupOwner`를 사용한다.
4. 그룹 멤버 권한 오류 코드는 `GROUP_MEMBER_NOT_FOUND`로 통일한다. 다른 멤버 권한 오류명을 새로 만들지 않는다.
5. `DataInitializer` 병합 시 테스트 유저 생성과 설문 시드/기타 seed가 서로 막히지 않게 early-return 구조를 피한다.
6. `build.gradle` 병합 시 WebClient, AOP, QueryDSL, UTF-8, `-parameters` 설정을 모두 보존한다.
7. FR-EXPENSE-07은 기존 지출 생성 계약과 `sourceScheduleId`를 우선 활용한다. 별도 자동 등록 메서드명은 사용자 확인 없이 늘리지 않는다.

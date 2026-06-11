# 그룹 여행 협업 플랫폼 — 마스터 플랜

> **문서 목적**: 지금까지 정한 모든 의사결정과 작업 계획을 한 문서로 통합.
> 특히 **A와 B의 코드가 만나는 시점**과 **그 시점에 무엇을 합의/머지할지**를 명확히 정의.
>
> 버전: v1.0 / 작성일: 2026-06-10

---

> **Codex 사용 메모 (Part B 기준)**
> 이 문서는 전체 방향과 A/B 접점 확인용이다. Codex는 이 문서를 근거로 파트 A 기능을 구현하지 않는다.
> 현재 활성 담당 범위는 Part B: 그룹, 정산, SSE, 알림, 그룹 권한 AOP다.
> 파트 A 내부 작업 계획 문서와 그 실행 단계는 현재 Codex 문서 세트에 포함하지 않는다.

## 📑 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [지금까지 정한 의사결정 요약](#2-지금까지-정한-의사결정-요약)
3. [최종 분담안](#3-최종-분담안)
4. [외부 인터페이스 전략](#4-외부-인터페이스-전략)
5. [현재 구현 상태](#5-현재-구현-상태)
6. [B 코드 분석 + A에서 활용 방법](#6-b-코드-분석--a에서-활용-방법)
7. [A의 14일 작업 계획](#7-a의-14일-작업-계획)
8. [⭐ A ↔ B 코드 머지 시점 (시간순)](#8-️-a--b-코드-머지-시점-시간순)
9. [크로스 도메인 의존 처리 패턴](#9-크로스-도메인-의존-처리-패턴)
10. [통합 일정표](#10-통합-일정표)
11. [리스크 + 대응](#11-리스크--대응)
12. [산출물 목록](#12-산출물-목록)
13. [다음 액션](#13-다음-액션)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
| --- | --- |
| **프로젝트명** | 그룹 여행 협업 플랫폼 |
| **벤치마크** | Wanderlog (국내 차별화 버전) |
| **기간** | 2주 (14일) |
| **인원** | 2명 (담당 A, 담당 B) |
| **기술 스택** | Spring Boot 4.0.6, JDK 21, PostgreSQL, React 19, TypeScript 6, Vite 8 |
| **패키지명** | `com.enjoytrip.backend` |

### 5가지 차별점

| # | 차별점 | 어떻게 |
| --- | --- | --- |
| 1 | **그룹 의사결정 강화** | 일정·장소 후보 투표 시스템 |
| 2 | **성향 기반 매칭** | 5차원 벡터 설문 → 그룹 페르소나 → 맞춤 추천 |
| 3 | **국내 최적화** | Google Maps Places (장소 검색) + 카카오 모빌리티 (이동/비용) |
| 4 | **한국형 정산** | 토스 / 카카오페이 송금 딥링크 |
| 5 | **실시간 동기화** | SSE 기반 즉시 반영 |

---

## 2. 지금까지 정한 의사결정 요약

대화를 통해 확정된 의사결정 타임라인:

| 시점 | 의사결정 |
| --- | --- |
| 초기 | Wanderlog 벤치마크 + 국내 차별화 방향 결정 |
| 명세 v1.0 | 기능 명세서 (MUST 11 / SHOULD 5 / COULD / WON'T) 확정 |
| 명세 v1.1 | **장소 검색 = Google 단일 소스, 이동/비용 = 카카오 모빌리티 전담**으로 재정의 |
| 분담 결정 | A가 사용자 여정+콘텐츠, B가 기반+비용+인프라 담당 (하이브리드 분담) |
| A 작업 시작 | 외부 API 키 발급 완료, 인증 완료 상태에서 출발 |
| 설문 문항 | 45개 풀에서 12문항 압축 세트 확정 (timePref 3개로 변별력 확보) |
| 백엔드 분석 | 현재 구현 상태 PROJECT.md로 정리 |
| B 그룹 코드 도착 | `TravelGroup`, `GroupMember`, `GroupRole`, `GroupStatus` 분석 완료 |
| 작업 지시서 | A의 전체 작업을 파트 A 내부 작업 계획 문서(현재 Codex 컨텍스트에는 포함하지 않음)로 단계화 |

---

## 3. 최종 분담안

### 파트 A (사용자 여정 + 콘텐츠)

| 도메인 | 요구사항 ID | 핵심 책임 |
| --- | --- | --- |
| 인증 / 계정 | FR-AUTH | ✅ 완료 (개선 작업 필요) |
| 성향 설문 | FR-SURVEY | 5차원 벡터, 12문항 |
| 장소 보관함 | FR-PLACE | Google Places 단일 소스, 24h 캐시 |
| 일정 빌더 | FR-SCHEDULE | 카카오 모빌리티 (시간+비용), 드래그앤드롭 |
| 일정 투표 | FR-VOTE | 1~5점 척도, 자동 채택 |
| 추천 (SHOULD) | FR-RECOMMEND | TourAPI + 성향 매칭 |
| 홈 대시보드 | FR-HOME | 그룹 집계 |
| 마이페이지 | FR-MYPAGE | 비밀번호 변경, 탈퇴, 회고 |

### 파트 B (기반 + 비용 + 인프라)

| 도메인 | 요구사항 ID | 핵심 책임 |
| --- | --- | --- |
| 여행 그룹 | FR-GROUP | ✅ 엔티티 완료. 모든 도메인의 기반 |
| 그룹 권한 AOP | (인프라) | `@RequiredGroupMember`, `@RequiredGroupOwner` |
| 비용 정산 | FR-EXPENSE | Greedy 알고리즘 + 송금 딥링크 |
| 실시간 SSE | FR-SSE | Emitter 관리 + 이벤트 브리지 |
| 알림 | (보조) | notifications 테이블 + In-App |

### 분담의 핵심 원칙

1. **A는 외부 API 통합 일관성 확보** — Google Places + 카카오 모빌리티 + TourAPI가 모두 A 손에 있어 학습 곡선이 한 번에 끝남
2. **B는 인프라성 작업 집중** — 그룹·권한·SSE·정산 알고리즘이 모두 인프라/알고리즘 성격
3. **그룹은 B가 D+3까지 무조건 완성** — A의 거의 모든 도메인이 의존

---

## 4. 외부 인터페이스 전략

요구사항 명세서 v1.1에서 확정된 3개 소스 분리 전략:

| 소스 | 담당 영역 | 사용 시점 | 책임 |
| --- | --- | --- | --- |
| **Google Maps Places** | 모든 장소 검색 (숙소·맛집·카페·명소·쇼핑) | Phase 2 | A |
| **카카오 모빌리티** | 이동 시간 + 비용 (톨비/연료비/택시비/대중교통 운임) | Phase 3 | A |
| **TourAPI** | 관광지 추천 (성향 기반) | Phase 5 | A |
| **토스 / 카카오페이** | 송금 URL Scheme 생성 | (B 도메인) | B |

### 외부 API 호출 원칙

1. **모든 외부 API는 BE 프록시 호출** (FE 직접 호출 금지)
2. **키는 환경변수에서만 로드** — `.env`는 `.gitignore`
3. **캐시 강제** — 캐시 없는 외부 API 호출 코드는 PR 거부
   - Google Places: 24시간 DB 캐시
   - 카카오 모빌리티: 1시간 캐시
   - TourAPI: 24시간 DB 캐시
4. **Google Maps Budget Alert** — 월 $50 알림, $150 강제 차단

---

## 5. 현재 구현 상태

### ✅ 완료 (D+0 ~ D+1)

**Backend**
- Spring Boot 4.0.6 셋업, PostgreSQL 연결
- 인증 도메인 전체 (회원가입, 로그인, 토큰 재발급, 로그아웃)
- JWT 발급/검증 (`JwtUtil`, `JwtFilter`)
- BCrypt 비밀번호 해싱
- Refresh Token HttpOnly 쿠키 + DB 영속화
- Spring Security 설정 (Stateless, CORS)
- 글로벌 예외 처리 + 표준 응답 (`ApiResponse<T>`, `ErrorCode`)
- JPA Auditing 활성화
- `DataInitializer`로 테스트 유저 자동 생성

**Frontend**
- Vite + React 19 + TypeScript + Tailwind 셋업
- axios 인스턴스 + 토큰 재발급 인터셉터
- Zustand 인증 스토어
- 로그인 / 회원가입 페이지

**B 도메인 (그룹)**
- `TravelGroup` 엔티티 (groups 테이블)
- `GroupMember` 엔티티 (group_members 테이블, soft leave)
- `GroupRole`, `GroupStatus` enum

### 🔴 운영 전 손봐야 할 것 (Phase 0에서 정리)

| 항목 | 우선순위 |
| --- | --- |
| JWT secret 환경변수화 | 🔴 |
| Access Token 만료 15분 → 30분 (요구사항 통일) | 🔴 |
| `BaseEntity` 공통 클래스 추출 (User/RefreshToken에 적용) | 🟠 |
| 회원가입 이름 길이 Validation (2~20자) | 🟠 |
| `AuthController.logout`의 TODO 정리 | 🟠 |
| `AuthController`의 불필요한 `RefreshTokenRepository` 주입 제거 | 🟠 |
| `ErrorCode`에 도메인별 항목 추가 | 🟠 |

---

## 6. B 코드 분석 + A에서 활용 방법

### B의 그룹 도메인 엔티티 (이미 작성됨)

```java
// 패키지: com.enjoytrip.backend.domain.group.entity

TravelGroup    // ⚠️ Group이 아님 (SQL 예약어 회피)
GroupMember    // User <-> TravelGroup 매핑
GroupRole      // OWNER, MEMBER
GroupStatus    // PLANNING, IN_PROGRESS, COMPLETED, DELETED
```

### A 코드에서 사용 시 주의사항

**1. 클래스명 정확히 사용**
```java
// 올바름
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "group_id", nullable = false)
private TravelGroup travelGroup;

// 잘못됨 (Group은 SQL 예약어라 B가 일부러 회피)
// private Group group;
```

**2. Owner 정보는 GroupMember를 통해 조회**
- `TravelGroup`에는 `owner` 필드가 없음
- Owner는 `GroupMember` 중 `role == OWNER`인 멤버
- 권한 검증 시 반드시 `groupMember.isActive()` 함께 체크 (`leftAt IS NULL`)

**3. 그룹 상태는 날짜 기반 자동 계산 가능**
```java
GroupStatus current = GroupStatus.fromDates(group.getStartDate(), group.getEndDate(), LocalDate.now());
```

### B가 만들 예정 (A가 인터페이스만 사용)

| 산출물 | 형태 | A 사용 시점 |
| --- | --- | --- |
| `@RequiredGroupMember` 어노테이션 + AOP | 메서드에 붙임 | Phase 2부터 모든 그룹 API |
| `@RequiredGroupOwner` 어노테이션 + AOP | 메서드에 붙임 | 그룹 수정/삭제 API에 |
| `SseEventBridge` | `@EventListener` Bean | Phase 3부터 이벤트 발행 |
| `ExpenseService.create()` | 외부 서비스 호출 | Phase 3 FR-EXPENSE-07 |

---

## 7. A의 14일 작업 계획

파트 A 내부 작업 계획은 Codex 활성 문서에 포함하지 않는다. 아래 내용은 일정 이해용 요약이다.

### Phase 0: 공통 인프라 개선 (D+1, 2시간)
- BaseEntity 추출 → User/RefreshToken 적용
- ErrorCode에 도메인별 항목 추가 (USER/SURVEY/PLACE/SCHEDULE/VOTE/GROUP)
- 회원가입 이름 Validation 보강
- AuthController TODO 정리, 불필요 주입 제거
- JWT secret 환경변수화 + Access Token 30분으로 변경

### Phase 1: 성향 설문 (D+2 ~ D+3, 1일)
- `survey_questions`, `user_preferences` 엔티티
- 12문항 시드 데이터 (DataInitializer)
- SurveyController/Service/DTO
- 프론트: 설문 페이지 + 결과 레이더 차트

### Phase 2: 장소 보관함 (D+4 ~ D+5, 1.5일)
- Google Places 클라이언트 (WebClient)
- `places`, `bookmarks`, `place_search_cache` 엔티티
- 검색 + 보관함 CRUD
- 24시간 DB 캐시 (필수)
- 프론트: 검색 페이지 + 보관함 페이지

### Phase 3: 일정 빌더 (D+6 ~ D+8, 2일)
- 카카오 모빌리티 클라이언트
- `schedules`, `transport_legs` 엔티티
- CRUD + 드래그 reorder API
- 길찾기 + 비용 표시 (자동차/대중교통/도보)
- 프론트: `@dnd-kit` 일자별 컬럼 뷰

### Phase 4: 일정 투표 (D+9 ~ D+10, 1일)
- `vote_sessions`, `vote_candidates`, `votes` 엔티티
- 후보 등록, 투표, 마감/채택 API
- 프론트: 후보 카드 + 투표 UI + 결과 차트

### Phase 5: 추천 (D+11, 0.5일)
- TourAPI 클라이언트
- 성향 기반 코사인 유사도 정렬
- 24시간 캐시
- 프론트: 추천 탭

### Phase 6: 홈 + 마이페이지 (D+11 ~ D+12, 1일)
- 대시보드 집계 API
- 마이페이지 (비밀번호 변경, 탈퇴, 회고)
- 프론트: 홈 + 마이페이지 + 회고 작성

---

## 8. ⭐ A ↔ B 코드 머지 시점 (시간순)

**이 섹션이 이 문서의 핵심.** 어느 시점에 A와 B가 무엇을 합의·머지해야 하는지 시간순으로 정리.

### 머지 시점 0: D+1 (공통 셋업 단계) — 코드 머지 1차

**A가 할 일**
- BaseEntity 추출 → User/RefreshToken에 적용 (Phase 0)
- ErrorCode에 도메인별 항목 추가
- `feature/refactor-base-entity` 브랜치로 PR

**B가 할 일 (또는 함께)**
- B의 `TravelGroup`, `GroupMember`에도 BaseEntity 적용 (B에게 PR 제안)
- B가 만든 `GROUP_NOT_FOUND` 등 ErrorCode와 중복 검증
- 권한 어노테이션 시그니처 합의 (구현은 D+3까지)

**합의해야 할 항목**
```
✓ BaseEntity 필드 표준: createdAt, updatedAt
✓ Soft Delete 컬럼명: deletedAt (B는 이미 사용 중)
✓ ErrorCode enum 추가 항목 중복 확인
✓ Flyway 마이그레이션 번호 규칙 (A=홀수, B=짝수)
✓ 패키지 구조: com.enjoytrip.backend.domain.{도메인}.{controller|service|...}
```

**산출물**: `develop` 브랜치에 머지된 BaseEntity + 확장된 ErrorCode

---

### 머지 시점 1: D+3 (그룹 도메인 완성) — B → A 단방향 제공

**B가 D+3 종료 시점까지 무조건 완성해야 할 것**
- ✅ `TravelGroup` 엔티티 (이미 완료)
- ✅ `GroupMember` 엔티티 (이미 완료)
- ✅ `GroupRole`, `GroupStatus` enum (이미 완료)
- ⏳ `GroupRepository`, `GroupMemberRepository`
- ⏳ `GroupController`, `GroupService` (CRUD + 초대코드)
- ⏳ **`@RequiredGroupMember`, `@RequiredGroupOwner` AOP 구현체**

**A 입장에서 D+3에 검증할 것**
```java
// 1. 그룹 생성/조회 가능한지 (Postman)
POST /api/groups          → 그룹 생성 성공
GET  /api/groups/{id}     → 조회 성공
POST /api/groups/{id}/invite → 초대 코드 발급
POST /api/groups/join     → 다른 사용자로 참여 가능

// 2. @RequiredGroupMember AOP가 작동하는지
@GetMapping("/test")
@RequiredGroupMember  // ← 이 어노테이션이 동작하면 OK
public ResponseEntity<?> test(@PathVariable Long groupId) { ... }
```

**A가 D+3에 같이 진행할 작업**
- 성향 설문 1차 완료 (Phase 1)
- 장소 도메인 시작 준비 (Google Places 클라이언트 베이스)

**⚠️ B의 그룹 도메인이 늦어질 때 A의 폴백 전략**
1. **MSW로 그룹 API 모킹**: 프론트 작업은 가짜 응답으로 진행
2. **그룹 멤버 검증을 임시 비활성**: 서비스 안에 직접 체크 코드 두되 TODO 마크
3. **장소/일정 엔티티의 `travel_group_id`는 FK 없이 일단 작성** → AOP 완성 후 FK 활성화

---

### 머지 시점 2: D+5 (FR-EXPENSE-07 컨트랙트 합의) — 책상 합의

**코드 머지가 아닌 인터페이스 합의 시점.** A와 B가 DTO 구조를 확정한다.

> Codex 규칙: 현재 Part B 코드에서 `ExpenseCreateRequest`와 `sourceScheduleId`가 이미 자동 등록의 느슨한 연결을 지원한다면, 별도 `합의된 자동 등록 메서드()`/`registerTransportExpense()` 메서드를 새로 만들지 않는다. 필요한 경우 기존 `POST /api/groups/{groupId}/expenses` 계약을 우선 사용하고, 새 전용 API/메서드는 사용자 확인 후 추가한다.

**합의 대상**
```java
// A의 일정 → B의 정산 자동 등록 호출 형태
public class ExpenseAutoRegisterRequest {
    private Long groupId;          // 그룹 ID
    private Integer amount;        // 자동 계산된 금액 (톨비+연료비 또는 대중교통 운임)
    private String category;       // 항상 "TRANSPORT"
    private String splitType;      // "EQUAL"
    private List<Long> participantIds;  // 분담자
    private Long sourceScheduleId;     // ★ 일정 ID (B가 보존)
    private String description;        // "[자동] 강남역 → 홍대 자동차 이동"
}
```

**합의 후 A의 다음 작업**
- Phase 3 일정 도메인 작업 중 `ScheduleExpenseService` 추가
- B의 최종 정산 등록 계약에 맞춰 호출

**합의 후 B의 다음 작업**
- `expenses` 테이블에 `source_schedule_id` 컬럼 추가 (nullable)
- 정산 자동 등록 계약 구현 또는 기존 지출 생성 API로 흡수

> ⚠️ B의 정산 도메인이 완성되기 전이라도 DTO 구조만 먼저 합의. 실제 호출은 D+9~10에 통합.

---

### 머지 시점 3: D+9 (SSE 이벤트 표준 합의)

**합의 대상**: SSE 이벤트 타입 enum

```java
// 양쪽이 같은 enum을 사용 (B가 정의, global 패키지에)
package com.enjoytrip.backend.global.event;

public enum EventType {
    // 일정 도메인 (A 발행)
    SCHEDULE_ADDED, SCHEDULE_UPDATED, SCHEDULE_DELETED, SCHEDULE_REORDERED,

    // 투표 도메인 (A 발행)
    VOTE_CAST, VOTE_CLOSED,

    // 장소 도메인 (A 발행)
    PLACE_BOOKMARKED, PLACE_REMOVED,

    // 정산 도메인 (B 발행)
    EXPENSE_ADDED, EXPENSE_UPDATED, EXPENSE_DELETED,

    // 그룹 도메인 (B 발행)
    MEMBER_JOINED, MEMBER_LEFT, GROUP_UPDATED
}
```

**페이로드 표준**
```java
public record DomainEvent<T>(
    EventType type,
    Long groupId,
    Long actorId,
    T payload,
    LocalDateTime ts
) {}
```

**합의 후 즉시 진행 (D+9 오후 ~ D+10)**
- A: 자기 도메인 서비스에 `ApplicationEventPublisher.publishEvent()` 추가
- B: `SseEventBridge`에 `@EventListener` 추가하여 SSE 채널로 전파

---

### 머지 시점 4: D+10 (SSE 인프라 통합) — 양방향 머지

**B의 SSE 구현체가 완성**
- `SseEmitter` 관리 (`ConcurrentHashMap<Long, Set<SseEmitter>>`)
- `GET /api/groups/{id}/stream` 엔드포인트
- 하트비트, 재연결 처리
- `SseEventBridge` (`@EventListener`)

**A가 이때 추가하는 코드 (자기 도메인에)**
```java
// 일정 추가 예시
@Service
@RequiredArgsConstructor
public class ScheduleService {
    private final ApplicationEventPublisher publisher;
    // ...

    public Schedule create(...) {
        Schedule saved = scheduleRepository.save(...);

        // ★ 이벤트 발행 추가
        publisher.publishEvent(new DomainEvent<>(
            EventType.SCHEDULE_ADDED,
            saved.getTravelGroup().getId(),
            saved.getCreatedBy().getId(),
            ScheduleResponse.from(saved),
            LocalDateTime.now()
        ));

        return saved;
    }
}
```

**A의 프론트엔드 통합**
- 그룹 페이지 진입 시 `EventSourcePolyfill`로 SSE 연결
- 이벤트 타입별로 React Query 캐시 무효화
- 본인 발생 이벤트는 무시 (낙관적 업데이트 충돌 방지)

**검증 시나리오**
1. 두 브라우저에서 같은 그룹 접속
2. 한쪽에서 일정 추가
3. 반대쪽에서 1초 안에 새 일정 카드 등장

---

### 머지 시점 5: D+11 (FR-EXPENSE-07 실제 통합)

**B의 정산 도메인이 완성된 후**

A가 코드 추가:
```java
// 새 파일: backend/src/main/java/com/enjoytrip/backend/domain/schedule/service/ScheduleExpenseService.java
@Service
@RequiredArgsConstructor
public class ScheduleExpenseService {
    private final ScheduleRepository scheduleRepository;
    private final TransportLegRepository legRepository;
    private final ExpenseService expenseService;  // ★ B의 서비스 주입

    public void registerTransportExpense(Long scheduleId, String email) {
        Schedule schedule = scheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SCHEDULE_NOT_FOUND));

        TransportLeg leg = legRepository.findCurrentLegBySchedule(scheduleId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        int amount = switch (leg.getMode()) {
            case CAR -> leg.getToll() + leg.getFuelCost();
            case TRANSIT -> leg.getTransitFare();
            case WALK -> 0;
        };

        // B의 서비스 호출
        expenseService.create 또는 합의된 자동 등록 메서드(ExpenseAutoRegisterRequest.builder()
                .groupId(schedule.getTravelGroup().getId())
                .amount(amount)
                .category("TRANSPORT")
                .splitType("EQUAL")
                .sourceScheduleId(scheduleId)
                .description("[자동] " + schedule.getPlace().getName() + " 이동")
                .build());
    }
}
```

**검증**
1. 일정 카드의 "이 비용을 정산에 추가" 버튼 클릭
2. B의 정산 매트릭스에 자동 등록 확인
3. SSE로 양쪽 화면에 실시간 반영

---

### 머지 시점 6: D+12 (Feature Freeze + 통합 테스트)

**이 시점 이후 신규 기능 추가 금지.** 버그 픽스와 폴리싱만.

**통합 테스트 시나리오 (둘이 함께)**
```
1. 회원가입 → 성향 설문 → 홈
2. 그룹 생성 → 초대 코드 → 다른 계정으로 참여
3. 장소 5개 검색해서 보관함 추가
4. 일정 3개 배치 + 드래그로 순서 변경
5. 이동 정보(자동차/대중교통) 표시 확인
6. 한 일정 투표로 전환, 후보 2개, 멤버들 투표, 채택
7. 일정에서 이동 비용 정산 자동 등록
8. 두 브라우저에서 SSE 실시간 반영 확인
9. 정산 매트릭스 + 송금 딥링크 확인
10. 종료된 그룹에 회고 작성
```

**D+12에 발견된 버그 분담 원칙**
- 해당 도메인 소유자가 픽스
- 크로스 도메인 버그는 페어 디버깅

---

### 머지 시점 7: D+13 (배포 환경 통합)

**B가 주도** (인프라성 작업)
- AWS EC2 / Vercel / Render 셋업
- 도메인 + SSL
- DB 마이그레이션
- 환경변수 적용 (`.env.production`)

**A가 동시에 진행**
- Frontend 빌드 검증
- 환경변수 누락 점검
- 외부 API 키 운영 환경용 분리 (선택)

---

### 머지 시점 8: D+14 (최종 정리)

- README 마무리
- API 문서 (Swagger 또는 Notion)
- 발표 자료
- 시연 시나리오 리허설

---

## 9. 크로스 도메인 의존 처리 패턴

위 머지 시점에서 다룬 3가지 의존을 패턴별로 정리.

### 패턴 1: 그룹 권한 검증 (B → A 어노테이션 제공)

```java
// B가 만든 어노테이션
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiredGroupMember {
    String groupIdParam() default "groupId";
}

// A가 사용
@GetMapping("/groups/{groupId}/schedules")
@RequiredGroupMember  // ← AOP가 자동 검증
public ResponseEntity<?> getSchedules(@PathVariable Long groupId) { ... }
```

**의존 방향**: B의 어노테이션 → A의 메서드에서 사용

**머지 시점**: D+1에 시그니처 합의, D+3에 구현체 완성

---

### 패턴 2: SSE 이벤트 (A → B 단방향 발행)

```java
// A의 서비스
@Service
@RequiredArgsConstructor
public class ScheduleService {
    private final ApplicationEventPublisher publisher;

    public Schedule create(...) {
        Schedule saved = ...;
        publisher.publishEvent(new DomainEvent<>(...));  // ← 발행만
        return saved;
    }
}

// B의 브리지
@Component
@RequiredArgsConstructor
public class SseEventBridge {
    private final SseEmitterStore emitterStore;

    @EventListener
    public void onDomainEvent(DomainEvent<?> event) {
        emitterStore.broadcast(event.groupId(), event);
    }
}
```

**의존 방향**: A → Spring Context → B

**머지 시점**: D+9에 EventType enum 합의, D+10에 코드 통합

---

### 패턴 3: 일정 → 정산 호출 (A가 B의 서비스 호출)

```java
// A의 서비스가 B의 서비스를 직접 호출
@Service
@RequiredArgsConstructor
public class ScheduleExpenseService {
    private final ExpenseService expenseService;  // ← B의 빈 주입

    public void registerTransportExpense(...) {
        expenseService.create 또는 합의된 자동 등록 메서드(...);
    }
}
```

**의존 방향**: A → B 직접 호출

**머지 시점**: D+5에 DTO 합의, D+11에 실제 통합

---

## 10. 통합 일정표

A의 모든 작업과 B와의 머지 시점을 한 표로 정리.

| Day | A 작업 | B 작업 | 머지/합의 |
| --- | --- | --- | --- |
| **D+0** | (완료) 인증 + 환경 셋업 | (완료) TravelGroup/GroupMember 엔티티 | — |
| **D+1** | Phase 0 공통 인프라 개선 | 그룹 도메인 작업 시작 + 권한 어노테이션 시그니처 | ⭐ **머지 시점 0**: BaseEntity, ErrorCode |
| **D+2** | Phase 1 성향 설문 시작 | 그룹 CRUD + 권한 AOP 구현 | — |
| **D+3** | Phase 1 마무리 (BE+FE) | ⭐ **그룹 도메인 완성** + 권한 AOP | ⭐ **머지 시점 1**: B → A 그룹 API/AOP 제공 |
| **D+4** | Phase 2 장소 시작 (Google Places) | 정산 expense CRUD | — |
| **D+5** | Phase 2 마무리 + Phase 3 일정 시작 | expense_splits + 분담 로직 | ⭐ **머지 시점 2**: FR-EXPENSE-07 DTO 합의 |
| **D+6** | Phase 3 일정 CRUD + reorder | 정산 매트릭스 + Greedy 알고리즘 | — |
| **D+7** | Phase 3 드래그앤드롭 FE | 정산 FE + 송금 딥링크 | — |
| **D+8** | Phase 3 카카오 모빌리티 통합 | 정산 상태 전이 + 완료 처리 | — |
| **D+9** | Phase 4 투표 BE+FE | SSE Emitter 인프라 시작 | ⭐ **머지 시점 3**: SSE 이벤트 표준 합의 |
| **D+10** | Phase 4 마무리 + SSE 이벤트 발행 추가 | ⭐ **SSE 완성** + Bridge | ⭐ **머지 시점 4**: SSE 통합 |
| **D+11** | Phase 5 추천 + Phase 6 홈 + FR-EXPENSE-07 통합 | 알림 + 마무리 | ⭐ **머지 시점 5**: 정산 자동 등록 통합 |
| **D+12** | 통합 테스트 시나리오 실행 | 동일 | ⭐ **머지 시점 6**: Feature Freeze |
| **D+13** | 버그 픽스 + UI 폴리싱 | 배포 환경 셋업 | ⭐ **머지 시점 7**: 배포 통합 |
| **D+14** | 발표 자료 + README | 시연 시나리오 | ⭐ **머지 시점 8**: 최종 정리 |

---

## 11. 리스크 + 대응

| # | 리스크 | 확률 | 영향 | 대응 |
| --- | --- | --- | --- | --- |
| 1 | B의 그룹 도메인이 D+3에 안 끝남 | 중 | 매우 높음 | MSW로 프론트 모킹, 서비스 내 권한 체크 임시 코드 |
| 2 | Google Places 비용 폭주 | 중 | 중 | 24h DB 캐시 강제, Budget Alert $50 |
| 3 | 카카오 모빌리티 대중교통 API 미지원 | 중 | 중 | D+1에 실제 호출 검증, 안 되면 ODsay로 전환 |
| 4 | SSE 다중 그룹 채널 관리 버그 | 중 | 높음 | D+10에 폴링 폴백 코드 준비 (5초 refetch) |
| 5 | 드래그앤드롭 + 시간 동기화 복잡도 | 중 | 중 | order_index만 변경, 시간은 수동 입력 |
| 6 | 정산 Greedy 알고리즘 오류 | 낮 | 낮 | 단위 테스트 필수 |
| 7 | 한 명이 아픔 | 낮 | 매우 높음 | Feature Freeze를 D+11로 당기는 옵션 사전 합의 |
| 8 | AI 토큰 한도 도달 | 중 | 중 | 핵심 도메인부터 작업, 후순위는 수기 |

---

## 12. 산출물 목록

지금까지 만든 모든 문서와 위치.

| 산출물 | 형식 | 위치 | 용도 |
| --- | --- | --- | --- |
| 요구사항 명세서 v1.1 | PDF | 프로젝트 폴더 | 모든 기능/비기능 명세 |
| 성향설문 문항모음 | TXT | outputs | 45문항 풀 + 12 압축 세트 |
| PROJECT.md | MD | outputs | 현재 코드 + 개선 포인트 |
| 파트 A 내부 작업 계획 문서 | MD | 별도 보관 | Codex 활성 문서에 포함하지 않음 |
| **마스터 플랜** | MD | outputs | **본 문서** (단일 진실의 원천) |

---

## 13. 다음 액션

### 즉시 시작 가능

✅ **Phase 0 공통 인프라 개선**
- 파트 A 내부 작업 계획의 Phase 0 항목 참고
- 파트 A 담당 도구에서 별도 진행

### D+1 종료 전 B와 같이 결정

- [ ] BaseEntity 도입 시 B의 TravelGroup도 함께 마이그레이션할지
- [ ] ErrorCode의 GROUP_* 항목 분배 (중복 방지)
- [ ] Flyway 도입 시점 (지금 vs 나중)

### D+3 전 B에게 요청

- [ ] 그룹 권한 어노테이션 시그니처 미리 공유 (`@RequiredGroupMember`, `@RequiredGroupOwner`)
- [ ] 그룹 API 응답 DTO 형태 미리 공유 (A의 일정/장소 화면에서 사용)

### D+5 전 B와 합의

- [ ] FR-EXPENSE-07 DTO 구조 (ExpenseAutoRegisterRequest)

### D+9 전 B와 합의

- [ ] SSE EventType enum 항목
- [ ] DomainEvent 페이로드 표준

---

## 부록 A: 컨벤션 요약

### 패키지 구조
```
com.enjoytrip.backend.domain.{도메인}/
├── controller/   # @RestController
├── service/      # @Service
├── repository/   # JpaRepository
├── entity/       # @Entity
└── dto/          # Request/Response

com.enjoytrip.backend.global/
├── config/       # SecurityConfig, CorsConfig, WebClientConfig
├── exception/    # GlobalExceptionHandler, BusinessException, ErrorCode
├── response/     # ApiResponse
├── security/     # JwtUtil, JwtFilter
└── entity/       # BaseEntity
```

### 엔티티 패턴
```java
@Entity
@Table(name = "...")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class XxxEntity extends BaseEntity {  // ← BaseEntity 상속

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 필드...

    @Builder
    private XxxEntity(...) { ... }

    // 도메인 메서드 (update, soft delete 등)
}
```

### 응답 패턴
```java
// 성공
return ResponseEntity.ok(ApiResponse.success("메시지", data));

// 실패
throw new BusinessException(ErrorCode.XXX);
```

### 커밋 메시지 (Conventional Commits)
```
feat(survey): 설문 응답 API 구현
fix(schedule): 드래그 후 순서 깨짐 수정
refactor(auth): BaseEntity 적용
chore(deps): @dnd-kit 추가
```

### Flyway 마이그레이션 번호
- A: 홀수 (V3, V5, V7...)
- B: 짝수 (V2, V4, V6...)

---

## 부록 B: 외부 API 키 관리 체크리스트

| 키 | 발급처 | 환경변수명 | 사용 위치 |
| --- | --- | --- | --- |
| Google Maps API Key | Google Cloud Platform | `GOOGLE_MAPS_API_KEY` | Phase 2 (장소) |
| Kakao Mobility REST Key | 카카오 디벨로퍼스 | `KAKAO_MOBILITY_API_KEY` | Phase 3 (이동/비용) |
| TourAPI Service Key | 공공데이터포털 | `TOURAPI_SERVICE_KEY` | Phase 5 (추천) |
| JWT Secret | 자체 생성 (32바이트 이상) | `JWT_SECRET` | Auth |

**관리 원칙**
- `.env`는 `.gitignore`
- `.env.example`만 Git 추적
- 운영/개발 환경 분리
- 키 노출 시 즉시 폐기 및 재발급

---

*Last updated: 2026-06-10 / Version 1.0*
*다음 갱신 예정: Phase 0 완료 후 (D+1 저녁)*

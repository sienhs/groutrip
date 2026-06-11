# Part A 머지 위험 정리 - Part B 기준

작성일: 2026-06-11  
대상 범위: Part B 담당 영역(Group, Group Permission AOP, Expense, Settlement, SSE, Notification)과 Part A 결과물을 병합할 때 생길 수 있는 문제

이 문서는 `docs/team/MERGE_READINESS_REVIEW.md`의 내용을 Part B 관점에서 바로 확인하기 쉽도록 재정리한 체크 문서다. Part A 내부 작업 지시서를 실행 계획으로 사용하지 않는다.

---

## 1. 가장 위험한 충돌 파일

| 파일 | 위험도 | 왜 위험한가 | 병합 원칙 |
| --- | --- | --- | --- |
| `backend/src/main/java/com/enjoytrip/backend/global/exception/ErrorCode.java` | 높음 | Part A와 Part B가 모두 도메인별 에러 코드를 추가할 가능성이 높다. `GROUP_NOT_FOUND` 중복, 멤버 권한 에러명 불일치가 생기기 쉽다. | `GROUP_NOT_FOUND`는 하나만 둔다. 멤버 권한/미가입 에러는 `GROUP_MEMBER_NOT_FOUND`로 통일한다. |
| `backend/src/main/java/com/enjoytrip/backend/global/config/DataInitializer.java` | 높음 | 현재 테스트 유저가 있으면 `return`하는 구조라 Part A의 survey seed가 실행되지 않을 수 있다. | 테스트 유저 seed와 survey/기타 seed가 서로 막지 않도록 독립 실행 구조로 만든다. |
| `backend/build.gradle` | 중간~높음 | Part A는 WebClient/외부 API, Part B는 AOP/QueryDSL/테스트 설정을 추가할 수 있다. 한쪽 의존성이 누락되면 컴파일 또는 런타임이 깨진다. | WebClient, AOP, QueryDSL, UTF-8, `-parameters`, test 설정을 모두 보존한다. |
| `backend/src/main/resources/application.yml` | 중간~높음 | Part A 외부 API 설정과 Part B/JWT/DB 설정이 겹칠 수 있다. 현재 `ddl-auto: create`와 평문 secret도 운영 위험이다. | 환경변수 기반 설정으로 정리하고, Google/Kakao/TourAPI 키는 backend에서만 읽는다. |
| `backend/src/main/java/com/enjoytrip/backend/domain/group/` | 높음 | Part A 임시 group stub와 Part B 공식 group 도메인이 충돌할 수 있다. | 공식 엔티티는 `TravelGroup`, `GroupMember`다. 임시 `Group` 엔티티나 `travel_groups` 기반 스텁은 제거한다. |

---

## 2. 현재 Part B 공식 기준

Part B 기준에서 병합 후 반드시 유지해야 하는 이름은 다음과 같다.

| 구분 | 공식 이름 |
| --- | --- |
| 그룹 엔티티 | `TravelGroup` |
| 그룹 테이블 | `groups` |
| 멤버십 엔티티 | `GroupMember` |
| 멤버십 테이블 | `group_members` |
| 멤버 권한 애노테이션 | `@RequiredGroupMember` |
| Owner 권한 애노테이션 | `@RequiredGroupOwner` |
| 그룹 접근 검증 서비스 | `GroupAccessValidator` |
| 그룹 없음 에러 | `GROUP_NOT_FOUND` |
| 그룹 멤버 아님/비활성 멤버 에러 | `GROUP_MEMBER_NOT_FOUND` |

Part A 코드가 그룹을 참조해야 할 때는 `TravelGroup`을 FK로 사용한다.

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "group_id", nullable = false)
private TravelGroup travelGroup;
```

`Group`이라는 엔티티명이나 `travel_groups` 테이블명은 병합 대상에서 발견되면 Part B 공식 구조와 충돌하는지 먼저 확인한다.

---

## 3. Part A와 맞춰야 하는 인터페이스

### 3.1 그룹 권한

Part A의 Place, Schedule, Vote API는 그룹 멤버만 접근해야 한다. 컨트롤러 진입점에서는 Part B 애노테이션을 사용한다.

```java
@RequiredGroupMember
@GetMapping("/api/groups/{groupId}/places")
public ResponseEntity<?> getPlaces(@PathVariable Long groupId) {
    ...
}
```

Owner 전용 작업은 `@RequiredGroupOwner`를 사용한다. 다만 서비스 메서드가 여러 경로에서 호출될 수 있으면 서비스 레벨에서도 `GroupAccessValidator`로 최종 검증해야 한다.

### 3.2 일정 이동 비용 -> 지출 등록

Part A는 일정/이동 비용을 계산하고, Part B는 확정된 금액을 지출로 저장한다. 별도 API를 새로 만들기보다 기존 지출 생성 API를 우선 사용한다.

```http
POST /api/groups/{groupId}/expenses
```

요청 형태:

```json
{
  "amount": 12000,
  "payerId": 1,
  "category": "TRANSPORT",
  "splitType": "EQUAL",
  "description": "[자동] 강남역 -> 홍대입구 자동차 이동",
  "paidAt": "2026-07-01",
  "participantIds": [1, 2, 3],
  "sourceScheduleId": 42
}
```

주의사항:

- `sourceScheduleId`는 nullable loose reference다.
- Part B는 Kakao Mobility 금액 계산을 하지 않는다.
- Part B는 사용자가 확정해서 넘긴 금액만 저장한다.
- `registerAutoExpense()`와 `registerTransportExpense()` 같은 중복 메서드를 동시에 만들지 않는다.

### 3.3 SSE 이벤트

Part A는 SSE 구현체에 직접 의존하지 않는다. Spring application event만 발행한다.

```java
publisher.publishEvent(new DomainEvent<>(
        EventType.SCHEDULE_ADDED,
        groupId,
        actorId,
        payload,
        LocalDateTime.now()
));
```

Part B는 `@EventListener`로 수신해 `/api/groups/{groupId}/stream` 구독자에게 전파한다.

필요한 이벤트 타입:

- `SCHEDULE_ADDED`, `SCHEDULE_UPDATED`, `SCHEDULE_DELETED`, `SCHEDULE_REORDERED`
- `VOTE_CAST`, `VOTE_CLOSED`
- `PLACE_BOOKMARKED`, `PLACE_REMOVED`
- `EXPENSE_ADDED`, `EXPENSE_UPDATED`, `EXPENSE_DELETED`
- `MEMBER_JOINED`, `MEMBER_LEFT`, `GROUP_UPDATED`

---

## 4. 병합 시 자주 생길 문제

### 4.1 ErrorCode 중복

증상:

- `GROUP_NOT_FOUND`가 두 번 정의되어 컴파일 실패
- Part A 코드가 다른 멤버 권한 에러명을 참조해 컴파일 실패
- 같은 상황에서 서로 다른 에러 응답이 내려감

처리:

- `GROUP_NOT_FOUND`는 하나만 남긴다.
- 미가입/탈퇴 멤버 접근은 `GROUP_MEMBER_NOT_FOUND`로 통일한다.
- Part A 서비스에서 직접 권한 검증을 했다면 `GroupAccessValidator` 사용으로 정리할지 검토한다.

### 4.2 DataInitializer seed 누락

증상:

- 테스트 유저가 이미 있으면 survey questions가 생성되지 않음
- 반대로 survey seed 때문에 테스트 유저 생성이 생략됨

처리:

- seed별로 존재 여부를 따로 확인한다.
- `if (testUserExists) return;` 형태의 메서드 전체 종료를 피한다.
- 테스트 유저, survey questions, 기타 seed는 서로 독립적으로 실행한다.

### 4.3 임시 group stub 잔존

증상:

- `TravelGroup`와 별개로 `Group` 엔티티가 생김
- `groups`와 `travel_groups` 테이블이 동시에 생김
- Place/Schedule/Vote가 Part B 그룹 테이블을 참조하지 않음

처리:

- Part B 공식 `TravelGroup`, `GroupMember`를 유지한다.
- Part A 임시 group entity/repository는 제거하거나 공식 repository 사용으로 전환한다.
- FK 컬럼은 `group_id`로 맞춘다.

### 4.4 Expense split 계약 불일치

현재 Part B 코드는 `SplitType` enum에 `EQUAL`, `RATIO`, `AMOUNT`가 있지만 실제 계산은 `EQUAL`만 지원한다.

증상:

- Part A/FE가 `RATIO` 또는 `AMOUNT`를 보내면 `INVALID_INPUT` 발생
- UI에는 비율/직접 금액 입력이 있는데 서버가 저장하지 못함

처리:

- 빠른 병합 단계에서는 `EQUAL`만 지원한다고 API 문서에 명시한다.
- SRS를 맞추려면 별도 작업으로 `RATIO`, `AMOUNT` 요청 DTO와 검증 로직을 추가한다.

### 4.5 SSE 이벤트 중복 발행

증상:

- Part A 서비스가 SSE 서비스에 직접 의존
- 같은 작업에서 Part A와 Part B가 둘 다 이벤트를 발행
- 본인 이벤트 무시/캐시 무효화 기준이 흔들림

처리:

- Part A는 `DomainEvent`만 publish한다.
- Part B의 `SseEventBridge`가 단일 경로로 broadcast한다.
- payload에는 최소한 `type`, `groupId`, `actorId`, `payload`, `ts`를 포함한다.

---

## 5. 병합 전 체크리스트

- [ ] `git status --short`로 변경 파일을 확인했다.
- [ ] `domain/group/`에 임시 `Group` 엔티티나 `travel_groups` 기반 스텁이 없는지 확인했다.
- [ ] `ErrorCode.java`에 `GROUP_NOT_FOUND`가 하나만 있는지 확인했다.
- [ ] 멤버 권한 에러가 `GROUP_MEMBER_NOT_FOUND`로 통일되어 있는지 확인했다.
- [ ] `DataInitializer`가 테스트 유저 seed와 survey seed를 독립적으로 실행하는지 확인했다.
- [ ] `build.gradle`에 WebClient, AOP, QueryDSL, `-parameters`가 모두 남아 있는지 확인했다.
- [ ] `application.yml`에 외부 API 키나 JWT secret이 평문으로 굳어 있지 않은지 확인했다.
- [ ] Part A의 Place/Schedule/Vote가 `TravelGroup`과 `GroupMemberRepository` 공식 계약을 사용하는지 확인했다.
- [ ] FR-EXPENSE-07은 기존 지출 생성 API와 `sourceScheduleId`로 연결되는지 확인했다.
- [ ] SSE는 직접 의존이 아니라 Spring event bridge 구조인지 확인했다.
- [ ] `.\gradlew.bat compileJava`를 통과했다.
- [ ] 관련 테스트를 실행했다.

---

## 6. 추천 병합 순서

1. `build.gradle` 병합  
   의존성 누락을 먼저 막는다.

2. `ErrorCode.java` 병합  
   중복 상수와 에러명 불일치를 정리한다.

3. `DataInitializer.java` 병합  
   seed가 서로 막히지 않게 구조를 정리한다.

4. `domain/group/` 정리  
   Part B 공식 group 도메인만 남긴다.

5. Part A 도메인 FK/권한 연결  
   Place/Schedule/Vote가 `TravelGroup`, `@RequiredGroupMember`, `GroupAccessValidator` 계약을 따르는지 맞춘다.

6. Expense/SSE 계약 연결  
   `sourceScheduleId`와 `DomainEvent` 발행 경로를 연결한다.

7. 컴파일/테스트  
   최소 `compileJava`, Part B 단위 테스트, 가능하면 API smoke test까지 확인한다.

---

## 7. 지금 바로 고치면 좋은 항목

- `DataInitializer` early return 구조
- `application.yml`의 평문 secret과 `ddl-auto: create`
- `Expense` split 지원 범위 명확화
- SSE 공통 계약(`EventType`, `DomainEvent`) 선정
- 임시 `permission-check` API를 테스트 전용으로 분리하거나 제거할지 결정

## 8. 나중에 해도 되는 항목

- Notification 저장/읽음 처리
- 정산 완료 상태 persisted 모델
- 30일 hard delete batch
- BaseEntity 전면 리팩터링
- Toss/KakaoPay deep-link/QR 응답 확장

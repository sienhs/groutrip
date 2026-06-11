# 그룹 여행 협업 플랫폼

> Wanderlog를 벤치마크한 국내 전용 그룹 여행 협업 플랫폼.
> 그룹 의사결정 · 성향 매칭 · 카카오 이동비용 · Google 장소검색 · 송금 딥링크 · SSE 실시간 동기화로 차별화.

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [폴더 구조](#3-폴더-구조)
4. [현재 구현 상태](#4-현재-구현-상태)
5. [핵심 컴포넌트 설명](#5-핵심-컴포넌트-설명)
6. [API 엔드포인트](#6-api-엔드포인트)
7. [실행 방법](#7-실행-방법)
8. [환경 변수](#8-환경-변수)
9. [작업 분담](#9-작업-분담)
10. [개선 포인트 / TODO](#10-개선-포인트--todo)
11. [외부 인터페이스](#11-외부-인터페이스)
12. [관련 문서](#12-관련-문서)

---

> **Codex 사용 메모 (Part B 기준)**
> 이 문서는 프로젝트 구조와 기존 컨벤션 확인용이다. 최신 실제 구현은 현재 코드가 우선한다.
> Part A 내부 작업 계획 문서는 Codex 활성 문서에 넣지 않는다.
> Part B 작업 시 그룹/정산/SSE/알림/권한 AOP 범위 밖의 대규모 구현은 하지 않는다.

## 1. 프로젝트 개요

| 항목 | 내용 |
| --- | --- |
| **프로젝트명** | 그룹 여행 협업 플랫폼 (작업명: enjoy-trip) |
| **기간** | 2주 |
| **인원** | 2명 (담당 A · 담당 B) |
| **벤치마크** | Wanderlog (국내 차별화 버전) |
| **요구사항** | `요구사항 명세서 v1.1` 참조 |

### 핵심 차별점
1. **그룹 의사결정 강화** — 일정·장소 후보 투표 시스템
2. **성향 기반 매칭** — 5차원 벡터 설문 → 그룹 페르소나
3. **국내 최적화** — Google Maps Places (장소 검색) + 카카오 모빌리티 (이동/비용)
4. **한국형 정산** — 토스 / 카카오페이 송금 딥링크
5. **실시간 동기화** — SSE 기반 즉시 반영

---

## 2. 기술 스택

### Backend
| 항목 | 버전 | 비고 |
| --- | --- | --- |
| Spring Boot | **4.0.6** | 최신 |
| JDK | 21 (LTS) | toolchain 설정 |
| Build Tool | Gradle | |
| Database | PostgreSQL | |
| ORM | Spring Data JPA | + QueryDSL 5.1.0 |
| 보안 | Spring Security 6+ | JWT |
| JWT 라이브러리 | jjwt 0.12.6 | |
| 파일 스토리지 | MinIO 8.5.11 | 의존성만 추가, 아직 미사용 |
| 코드 간소화 | Lombok | |

> ⚠️ Spring Boot 4.0의 변경점: 컴파일 시점 파라미터 이름 보존이 자동이 아님.
> `build.gradle`에 `-parameters` 옵션 명시 필수 (이미 설정됨).

### Frontend
| 항목 | 버전 | 비고 |
| --- | --- | --- |
| React | 19.2 | |
| TypeScript | 6.0 | |
| Vite | 8.0 | 빌드 도구 |
| Tailwind CSS | 4.3 | |
| 상태관리 | Zustand 5.0 | accessToken은 메모리 전용 |
| HTTP | axios 1.16 | 인터셉터로 토큰 재발급 |
| Router | react-router-dom 7.15 | |
| Lint | ESLint 10 + typescript-eslint 8 | |

---

## 3. 폴더 구조

```
backend/
├── build.gradle
└── src/
    ├── main/
    │   ├── java/com/enjoytrip/backend/
    │   │   ├── BackendApplication.java        # @EnableJpaAuditing
    │   │   ├── domain/                         # 도메인 단위 패키지
    │   │   │   └── auth/
    │   │   │       ├── controller/AuthController.java
    │   │   │       ├── service/
    │   │   │       │   ├── AuthService.java
    │   │   │       │   └── CustomUserDetailService.java
    │   │   │       ├── repository/
    │   │   │       │   ├── UserRepository.java
    │   │   │       │   └── RefreshTokenRepository.java
    │   │   │       ├── entity/
    │   │   │       │   ├── User.java
    │   │   │       │   └── RefreshToken.java
    │   │   │       └── dto/
    │   │   │           ├── LoginRequest.java
    │   │   │           ├── LoginResponse.java
    │   │   │           └── SignupRequest.java
    │   │   └── global/                         # 공통 설정·인프라
    │   │       ├── config/
    │   │       │   ├── SecurityConfig.java
    │   │       │   ├── CorsConfig.java
    │   │       │   └── DataInitializer.java    # 테스트 유저 자동 생성
    │   │       ├── exception/
    │   │       │   ├── GlobalExceptionHandler.java
    │   │       │   ├── BusinessException.java
    │   │       │   └── ErrorCode.java          # enum
    │   │       ├── response/
    │   │       │   └── ApiResponse.java        # 표준 응답 포맷
    │   │       └── security/
    │   │           ├── JwtUtil.java
    │   │           └── JwtFilter.java
    │   └── resources/
    │       └── application.yml
    └── test/

frontend/
├── package.json
└── src/
    ├── api/
    │   ├── instance.ts                         # axios 인스턴스 + 인터셉터
    │   └── auth.ts                             # 인증 API 함수
    ├── pages/
    │   └── auth/
    │       ├── LoginPage.tsx
    │       └── SignupPage.tsx
    ├── store/
    │   └── authStore.ts                        # Zustand 인증 스토어
    └── types/
        └── auth.ts
```

### 패키지 구조 규칙
- **도메인 단위 분할**: `domain/{도메인명}/{controller|service|repository|entity|dto}`
- **공통 인프라**: `global/{config|exception|response|security}`
- 신규 도메인 추가 시 위 패턴 그대로 따름

---

## 4. 현재 구현 상태

### ✅ 완료

#### Backend
- [x] 프로젝트 셋업 (Spring Boot 4.0.6, JDK 21)
- [x] PostgreSQL 연결 (`application.yml`)
- [x] **인증 도메인 전체** (FR-AUTH-01 ~ 04)
  - 회원가입 (이메일·비밀번호·이름 + Validation)
  - 로그인 (Access Token + Refresh Token 발급)
  - 토큰 재발급
  - 로그아웃
- [x] JWT 발급/검증 (`JwtUtil`, `JwtFilter`)
- [x] BCrypt 비밀번호 해싱
- [x] Refresh Token HttpOnly 쿠키 저장
- [x] Refresh Token DB 영속화 (탈취 검증용)
- [x] Spring Security 설정 (Stateless, CORS, CSRF disabled)
- [x] 글로벌 예외 처리 (`GlobalExceptionHandler`)
- [x] 표준 응답 포맷 (`ApiResponse<T>`)
- [x] ErrorCode enum 기본 항목 (Auth, Common, File)
- [x] JPA Auditing (`@CreatedDate`, `@LastModifiedDate`)
- [x] 테스트 사용자 자동 생성 (`DataInitializer`: `test@test.com` / `test1234`)

#### Frontend
- [x] Vite + React 19 + TypeScript 셋업
- [x] axios 인스턴스 + 토큰 인터셉터 (401 자동 재발급)
- [x] Zustand 인증 스토어 (accessToken 메모리 + user localStorage)
- [x] 로그인 페이지
- [x] 회원가입 페이지
- [x] 인증 API 함수 (login, signup, logout, reissue)
- [x] Tailwind CSS 디자인 토큰 (오렌지 `#FF9F66`)

### 🚧 진행 중 / 다음 작업
- [ ] 성향 설문 (FR-SURVEY-01 ~ 03) ← **다음 A 작업**
- [ ] 비밀번호 변경, 계정 탈퇴 (FR-AUTH-05, 06)
- [ ] 장소 검색 (Google Places API 통합)
- [ ] 일정 관리 + 카카오 모빌리티
- [ ] 일정 투표
- [ ] 그룹 (B 담당)
- [ ] 정산 (B 담당)
- [ ] SSE (B 담당)

---

## 5. 핵심 컴포넌트 설명

### 5.1 `ApiResponse<T>` — 표준 응답 포맷

모든 API의 응답은 다음 형태로 통일:

```json
{
  "success": true,
  "message": "로그인 성공",
  "data": { ... }
}
```

```java
ApiResponse.success("메시지", data);  // 성공 + 데이터
ApiResponse.success("메시지");        // 성공만
ApiResponse.fail("메시지");           // 실패
```

### 5.2 `ErrorCode` + `BusinessException` — 비즈니스 예외

도메인 로직에서 예외 발생 시 `BusinessException`을 던지면 `GlobalExceptionHandler`가 잡아서 표준 응답으로 변환.

```java
throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
// → 401 + "이메일 또는 비밀번호가 올바르지 않습니다."
```

새 에러가 필요할 때마다 `ErrorCode` enum에 추가.

### 5.3 `JwtUtil` + `JwtFilter` — JWT 흐름

```
요청 → JwtFilter (OncePerRequestFilter)
        ├─ Authorization 헤더에서 Bearer 토큰 추출
        ├─ JwtUtil.isTokenValid() 검증
        ├─ JwtUtil.extractEmail() 로 이메일 추출
        ├─ CustomUserDetailService.loadUserByUsername()
        └─ SecurityContextHolder에 인증 정보 저장
→ 컨트롤러 진입
```

**토큰 정책**
- Access Token: 15분 (`jwt.access-token-expiration: 900000` ms)
- Refresh Token: 7일 (`jwt.refresh-token-expiration: 604800000` ms)
- Access는 메모리(Zustand) 전용
- Refresh는 HttpOnly + Secure 쿠키 + DB 영속화

> ⚠️ 요구사항 v1.1은 Access Token 30분 명시. 현재 15분이라 차이 있음. 운영 전 통일 필요.

### 5.4 axios 인터셉터 — 자동 토큰 재발급

```ts
// frontend/src/api/instance.ts
401 응답 → Refresh Token으로 reissue 호출
       → 새 Access Token으로 원래 요청 재시도
       → 실패 시 /login 강제 이동
```

`_retry` 플래그로 무한 루프 방지.

### 5.5 CORS 설정

`application.yml`의 `cors.allowed-origins`를 환경변수로 오버라이드 가능:

```bash
CORS_ALLOWED_ORIGINS=https://myapp.com ./gradlew bootRun
```

`allowCredentials: true` 설정으로 Refresh Token 쿠키 전송 가능.

### 5.6 `DataInitializer` — 개발용 시드 데이터

서버 시작 시 `test@test.com` / `test1234` 계정이 없으면 자동 생성. 매번 회원가입할 필요 없음.

---

## 6. API 엔드포인트

### Auth (구현 완료)

| Method | Path | 인증 | 설명 |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | ❌ | 회원가입 |
| POST | `/api/auth/login` | ❌ | 로그인 → Access Token + Refresh Token Cookie |
| POST | `/api/auth/reissue` | Cookie | Refresh Token으로 Access Token 재발급 |
| POST | `/api/auth/logout` | Cookie | 로그아웃 (쿠키 + DB 삭제) |

### 예정

> 요구사항 명세서 v1.1의 도메인별 엔드포인트 표 참고.
> Survey / User / Place / Schedule / Vote / Group / Expense / SSE / Dashboard

---

## 7. 실행 방법

### 7.1 사전 준비

| 항목 | 버전 |
| --- | --- |
| JDK | 21 |
| Node.js | v20 LTS 이상 |
| PostgreSQL | 15+ |

PostgreSQL 데이터베이스 + 사용자 생성:

```sql
CREATE DATABASE enjoy_trip;
CREATE USER enjoy_trip_user WITH PASSWORD 'enjoy_trip_pass';
GRANT ALL PRIVILEGES ON DATABASE enjoy_trip TO enjoy_trip_user;
```

### 7.2 Backend

```bash
cd backend
./gradlew bootRun
# 또는
./gradlew clean build
java -jar build/libs/backend-0.0.1-SNAPSHOT.jar
```

- 포트: `8080`
- 시작 시 `DataInitializer`가 테스트 유저 자동 생성
- `ddl-auto: create` → 매 실행마다 DB 스키마 재생성 (개발 단계)

### 7.3 Frontend

```bash
cd frontend
npm install
npm run dev
```

- 포트: `5173` (Vite 기본)
- `.env`에 `VITE_API_BASE_URL=http://localhost:8080` 설정

### 7.4 테스트 계정

```
이메일:   test@test.com
비밀번호: test1234
이름:     테스트선생님
```

---

## 8. 환경 변수

### Backend (`application.yml`)

```yaml
spring.datasource.url           # PostgreSQL URL
spring.datasource.username      # DB 사용자
spring.datasource.password      # DB 비밀번호
spring.jpa.hibernate.ddl-auto   # create (개발) / validate (운영)

jwt.secret                      # JWT 서명 키 (32바이트 이상)
jwt.access-token-expiration     # ms 단위 (현재 15분)
jwt.refresh-token-expiration    # ms 단위 (현재 7일)

cors.allowed-origins            # 쉼표 구분 (FE origin)

minio.endpoint                  # MinIO 서버 URL (현재 미사용)
minio.access-key
minio.secret-key
minio.bucket-name
```

### Frontend (`.env`)

```bash
VITE_API_BASE_URL=http://localhost:8080
```

### 추후 추가 예정 (외부 API)

```yaml
google.maps.api-key             # Google Maps Places API
kakao.mobility.api-key          # 카카오 모빌리티 (이동/비용)
tourapi.service-key             # 한국관광공사 TourAPI
```

> ⚠️ **모든 키는 환경변수로만 관리하고 절대 Git에 커밋 금지.** 현재 `application.yml`에 평문으로 있는 JWT secret도 운영 전 환경변수로 이전 필요.

---

## 9. 작업 분담

### 파트 A (사용자 여정 + 콘텐츠)
- 인증 / 회원가입 ✅
- 사용자 성향 설문 (FR-SURVEY) ← **현재 작업**
- 장소 보관함 (FR-PLACE) — Google Places API
- 일정 빌더 (FR-SCHEDULE) — 카카오 모빌리티 (이동/비용)
- 일정 투표 (FR-VOTE)
- 추천 (FR-RECOMMEND) — TourAPI
- 홈 (FR-HOME)
- 마이페이지 (FR-MYPAGE)

### 파트 B (기반 + 비용 + 인프라)
- 여행 그룹 (FR-GROUP) — 모든 도메인의 기반
- 비용 정산 (FR-EXPENSE) — Greedy 알고리즘 + 송금 딥링크
- 실시간 SSE (FR-SSE) — 모든 도메인 이벤트 수집
- 알림 (notifications)

### 크로스 도메인 의존 처리
1. **FR-EXPENSE-07 (이동 비용 자동 등록)**: A의 일정 → B의 정산 호출. `sourceScheduleId`를 포함한 DTO로 컨트랙트 정의 (D+5 합의)
2. **SSE 이벤트 발행**: A의 도메인은 Spring `ApplicationEventPublisher`로만 발행. B의 `@EventListener`가 받아 채널 전파
3. **그룹 권한 검증**: B가 `@RequiredGroupMember`, `@RequiredGroupOwner` AOP 구현. A는 필요한 API에 어노테이션만 사용

---

## 10. 개선 포인트 / TODO

코드 리뷰 결과 발견된 항목들. 우선순위 표시.

### 🔴 운영 전 필수
- [ ] **JWT secret을 환경변수로 이전** (`application.yml`에 평문 노출 중)
- [ ] **`ddl-auto: create` → `validate` 변경** (운영 전환 시. 개발 중에는 유지)
- [ ] **Refresh Token 쿠키 `Secure: true`** (`AuthController` 참고. 현재 false, HTTPS 환경에서 활성화)
- [ ] **패키지명 정리**: `com.enjoytrip.backend` → 새 프로젝트명으로 변경 검토
- [ ] **Access Token 만료 시간 통일**: 현재 15분 vs 요구사항 30분 → 정책 결정

### 🟠 다음 도메인 작업 전
- [ ] **`BaseEntity` 공통 클래스 추출** — 현재 User만 직접 `@EntityListeners`. 도메인 늘어나기 전에 공통화
- [ ] **회원가입 이름 길이 Validation 추가** (현재 `@NotBlank`만, 요구사항은 2~20자)
- [ ] **`AuthController.logout`의 SecurityContext에서 email 추출** (TODO 주석으로 남아있음)
- [ ] **`AuthController`에서 `RefreshTokenRepository` 직접 주입 제거** — Service 계층으로 이동
- [ ] **`Soft Delete` 표준 도입** (`@SQLDelete + @Where`, `deleted_at` 컬럼)
- [ ] **`ErrorCode`에 Group/Place/Schedule/Vote/Expense/SSE 항목 추가** — 메시지 카탈로그 v1.1 기준

### 🟡 품질 / 보안 강화
- [ ] **로그인 Rate Limiting** (5회/5분, FR-AUTH-02) — 현재 미구현
- [ ] **회원가입 Rate Limiting** (3회/시간/IP)
- [ ] **Refresh Token 만료 7일 후 자동 삭제 배치**
- [ ] **단위 테스트** — 정산 알고리즘, 권한 검증 등 핵심 비즈니스 로직
- [ ] **MinIO 의존성 정리** — 아직 사용 안 함. 파일 업로드 도입 시점에 활성화

### 🟢 운영 / 인프라
- [ ] **Flyway 마이그레이션 도입** — 현재 `ddl-auto`로 스키마 관리 중. 운영 전 필수
- [ ] **Docker Compose 작성** — Postgres + (MinIO + Redis) 통합 실행
- [ ] **GitHub Actions CI** — 빌드 + 테스트 자동화
- [ ] **`.env.example` 파일 생성** — 환경변수 템플릿 제공

---

## 11. 외부 인터페이스

요구사항 명세서 v1.1 기준. 본격 작업 시점에 활성화.

| 소스 | 담당 영역 | 사용 시점 |
| --- | --- | --- |
| **Google Maps Places** | 모든 장소 검색 (숙소·맛집·명소·카페·쇼핑) | FR-PLACE 도메인 시작 시 |
| **카카오 모빌리티** | 이동 시간 + 비용 (톨비/연료비/택시비/대중교통 운임) | FR-SCHEDULE 도메인 시작 시 |
| **TourAPI** | 관광지 추천 (성향 기반) | FR-RECOMMEND (SHOULD) |
| **토스 / 카카오페이** | 송금 URL Scheme 생성 | FR-EXPENSE 도메인 (B 담당) |

### 키 관리 원칙
- 모든 키는 BE 환경 변수, FE 노출 절대 금지
- GCP는 IP + API 제한
- 카카오는 도메인 제한
- BE 프록시 패턴으로 외부 API 호출 (FE 직접 호출 차단)
- **24시간 DB 캐시 강력 적용** (특히 Google Places, 호출량 통제 핵심)
- GCP Budget Alert: 월 $50 알림, $150 강제 차단

---

## 12. 관련 문서

> the Part A internal task document 또는 파트 A 내부 작업 지시서는 이 Codex 문서 세트에 포함하지 않는다. Part B Codex는 해당 문서를 실행 계획으로 사용하지 않는다.


- **요구사항 명세서**: `그룹여행협업플랫폼_요구사항명세서_v1.1.pdf`
  - 전체 기능 / 비기능 / 외부 인터페이스 / 권한 / 상태 전이 / 메시지 카탈로그
- **성향 설문 문항 모음**: `성향설문_문항모음.txt`
  - 9개 차원, 45개 문항 풀 + 추천 12문항 압축 세트
- **분담 가이드**: 대화 기록 참조
  - 파트 A/B 도메인 분담, 크로스 의존 처리 패턴, 14일 일정

---

## 13. 개발 컨벤션

### Git Branch
- `main` — 배포 가능한 안정 버전 (직접 push 금지)
- `develop` — 개발 통합 브랜치
- `feature/<도메인>-<세부기능>` — 신규 기능 (예: `feature/survey-question-api`)
- `fix/<이슈번호>-<요약>`
- `refactor/<대상>`

### Commit Message (Conventional Commits)
```
feat(survey): 설문 응답 API 구현
fix(auth): 토큰 만료 시 리다이렉트 누락 수정
refactor(auth): 컨트롤러에서 직접 주입 제거
```

### Flyway 마이그레이션 번호 (도입 시)
- A: 홀수 (V3, V5, V7...)
- B: 짝수 (V2, V4, V6...)

### PR 규칙
- 200 lines 이하 권장
- 상대방 리뷰 1회 후 머지
- 본인이 작성한 PR은 본인이 머지

---

*Last updated: 2026-06-10 / Version 1.0*

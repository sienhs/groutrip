# 파트 A 작업 지시서 (Claude Code용)

> 이 문서는 Claude Code가 순차적으로 실행할 수 있도록 작성된 파트 A 전체 작업 지시서입니다.
> 각 Task는 self-contained하며, 위에서 아래로 순서대로 실행하세요.

---

## 📌 사전 컨텍스트 (반드시 먼저 읽기)

### 프로젝트 개요
- 프로젝트명: 그룹 여행 협업 플랫폼 (작업 패키지: `com.enjoytrip.backend`)
- 기술 스택: Spring Boot 4.0.6, JDK 21, PostgreSQL, JPA + QueryDSL, Spring Security + JWT
- 프론트엔드: React 19 + TypeScript 6 + Vite 8 + Tailwind 4 + Zustand 5
- 요구사항: `그룹여행협업플랫폼_요구사항명세서_v1.1.pdf`

### 작업 분담
- **파트 A (본 지시서)**: 인증, 성향설문, 장소, 일정, 투표, 추천, 홈, 마이페이지
- **파트 B (다른 팀원)**: 그룹, 정산, SSE, 알림

### B가 이미 만든 클래스 (A가 사용해야 함)
```
com.enjoytrip.backend.domain.group.entity.TravelGroup    # 그룹 엔티티 (Group이 아님!)
com.enjoytrip.backend.domain.group.entity.GroupMember    # 그룹-사용자 매핑
com.enjoytrip.backend.domain.group.entity.GroupRole      # OWNER, MEMBER
com.enjoytrip.backend.domain.group.entity.GroupStatus    # PLANNING, IN_PROGRESS, COMPLETED, DELETED
```

### B가 만들 예정 (A는 인터페이스만 사용)
- `@GroupMember`, `@GroupOwner` 어노테이션 + AOP (권한 검증)
- `SseEventBridge` (`@EventListener`로 A의 도메인 이벤트 수신)
- `ExpenseService.registerTransportExpense()` (FR-EXPENSE-07, A가 호출)

### 컨벤션 (B 코드 기반)

#### 패키지 구조
```
com.enjoytrip.backend.domain.{도메인}/
├── controller/
├── service/
├── repository/
├── entity/
└── dto/
```

#### 엔티티 패턴 (B 코드 따라하기)
```java
@Entity
@Table(name = "...")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class XxxEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ... 필드

    @Builder
    private XxxEntity(...) { ... }

    // 도메인 메서드 (updateXxx, softDelete 등)
}
```

#### 응답 패턴
- 모든 API는 `ApiResponse<T>`로 감싸기
- 예외는 `BusinessException(ErrorCode.XXX)`로 던지기
- Validation은 `@Valid` + `jakarta.validation.constraints.*`

---

## 🗺️ 전체 작업 흐름

```
Phase 0  공통 인프라 개선 (2시간)
   ↓
Phase 1  성향 설문 (1일)              [FR-SURVEY]
   ↓
Phase 2  장소 보관함 (1.5일)           [FR-PLACE + Google Places]
   ↓
Phase 3  일정 빌더 (2일)               [FR-SCHEDULE + 카카오 모빌리티]
   ↓
Phase 4  일정 투표 (1일)               [FR-VOTE]
   ↓
Phase 5  추천 (0.5일)                  [FR-RECOMMEND + TourAPI]
   ↓
Phase 6  홈 + 마이페이지 (1일)         [FR-HOME, FR-MYPAGE]
```

각 Phase가 끝날 때마다 PR을 작성해서 develop으로 머지하세요.

---

# Phase 0: 공통 인프라 개선

> **목표**: 도메인 작업 시작 전에 반복 코드를 줄이고, B 코드와 일관성을 맞춥니다.

## Task 0.1: BaseEntity 공통 클래스 추출

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/global/entity/BaseEntity.java`

```java
package com.enjoytrip.backend.global.entity;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;

@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
```

**파일 수정**: `User.java`, `RefreshToken.java`
- `@EntityListeners(AuditingEntityListener.class)` 어노테이션 제거
- `createdAt`, `updatedAt` 필드 제거
- 클래스 선언을 `extends BaseEntity`로 변경

> ⚠️ `TravelGroup`, `GroupMember`는 B 코드라 건드리지 마세요. B가 BaseEntity 적용할지는 B에게 PR로 제안만.

**검증**: `./gradlew build`로 빌드 성공 확인

---

## Task 0.2: ErrorCode 도메인별 항목 추가

**파일 수정**: `backend/src/main/java/com/enjoytrip/backend/global/exception/ErrorCode.java`

기존 항목 아래에 다음을 추가:

```java
// User
USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
PASSWORD_MISMATCH(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다."),
SAME_AS_OLD_PASSWORD(HttpStatus.BAD_REQUEST, "기존 비밀번호와 동일합니다."),

// Survey
SURVEY_INCOMPLETE(HttpStatus.BAD_REQUEST, "모든 문항에 응답해주세요."),
SURVEY_QUESTION_NOT_FOUND(HttpStatus.NOT_FOUND, "설문 문항을 찾을 수 없습니다."),

// Place
PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다."),
PLACE_ALREADY_BOOKMARKED(HttpStatus.CONFLICT, "이미 보관함에 등록된 장소입니다."),
PLACE_SEARCH_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "장소 검색 서비스가 일시적으로 불안정합니다."),

// Schedule
SCHEDULE_NOT_FOUND(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다."),
SCHEDULE_TIME_INVALID(HttpStatus.BAD_REQUEST, "시작 시각이 종료 시각보다 늦을 수 없습니다."),
SCHEDULE_OUT_OF_PERIOD(HttpStatus.BAD_REQUEST, "여행 기간을 벗어난 일자입니다."),
DIRECTIONS_FETCH_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "길찾기 정보를 불러오지 못했습니다."),

// Vote
VOTE_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "투표 세션을 찾을 수 없습니다."),
VOTE_CANDIDATE_NOT_FOUND(HttpStatus.NOT_FOUND, "투표 후보를 찾을 수 없습니다."),
VOTE_ALREADY_CLOSED(HttpStatus.BAD_REQUEST, "이미 마감된 투표입니다."),
VOTE_SCORE_INVALID(HttpStatus.BAD_REQUEST, "투표 점수는 1~5 사이여야 합니다."),

// Group (B 도메인이지만 A 코드에서 참조 필요)
GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "그룹을 찾을 수 없습니다."),
NOT_GROUP_MEMBER(HttpStatus.FORBIDDEN, "해당 그룹의 멤버가 아닙니다."),
```

> 💡 B 도메인 ErrorCode(`GROUP_NOT_FOUND` 등) 추가는 B와 사전 합의 필요. B가 이미 추가했으면 중복 제거.

---

## Task 0.3: 회원가입 이름 길이 Validation 추가

**파일 수정**: `backend/src/main/java/com/enjoytrip/backend/domain/auth/dto/SignupRequest.java`

```java
@NotBlank(message = "이름을 입력해주세요")
@Pattern(
    regexp = "^[가-힣a-zA-Z0-9]{2,20}$",
    message = "이름은 2~20자의 한글, 영문, 숫자만 가능합니다."
)
private String name;
```

**검증**: 회원가입 시 1자/21자/특수문자 포함 이름으로 시도하여 400 응답 확인

---

## Task 0.4: AuthController TODO 정리 + 불필요한 주입 제거

**파일 수정**: `backend/src/main/java/com/enjoytrip/backend/domain/auth/controller/AuthController.java`

1. **불필요한 `RefreshTokenRepository` 주입 제거**:
   ```java
   // 삭제
   private final RefreshTokenRepository refreshTokenRepository;
   ```
   `import` 문도 함께 정리.

2. **logout 메서드의 TODO 해결** — SecurityContext에서 email 추출:
   ```java
   @PostMapping("/logout")
   public ResponseEntity<ApiResponse<Void>> logout(
           HttpServletRequest request,
           HttpServletResponse response,
           Authentication authentication) {

       if (authentication != null && authentication.isAuthenticated()) {
           String email = authentication.getName();
           authService.logout(email);
       }

       // 쿠키 만료
       Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE, null);
       cookie.setMaxAge(0);
       cookie.setPath("/");
       response.addCookie(cookie);

       return ResponseEntity.ok(ApiResponse.success("로그아웃 성공"));
   }
   ```

**검증**: 로그인 후 로그아웃 → DB의 `refresh_token` 테이블에서 해당 레코드 삭제 확인

---

## Task 0.5: JWT secret 환경변수화

**파일 수정**: `backend/src/main/resources/application.yml`

```yaml
jwt:
  secret: ${JWT_SECRET:enjoy-trip-jwt-secret-key-must-be-at-least-256-bits-long-enough-for-hmac}
  access-token-expiration: ${JWT_ACCESS_EXP:1800000}  # 30분 (요구사항 반영)
  refresh-token-expiration: ${JWT_REFRESH_EXP:604800000}  # 7일
```

> ✅ Access Token을 15분 → 30분으로 변경 (요구사항 v1.1과 통일)

**파일 생성**: `backend/.env.example`
```bash
JWT_SECRET=your-very-long-and-random-secret-key-at-least-256-bits
JWT_ACCESS_EXP=1800000
JWT_REFRESH_EXP=604800000

# Database
DB_URL=jdbc:postgresql://localhost:5432/enjoy_trip
DB_USER=enjoy_trip_user
DB_PASS=enjoy_trip_pass

# Google Maps
GOOGLE_MAPS_API_KEY=

# Kakao Mobility
KAKAO_MOBILITY_API_KEY=

# TourAPI
TOURAPI_SERVICE_KEY=

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

# Phase 1: 사용자 성향 설문 (FR-SURVEY)

> **목표**: 회원가입 직후 또는 마이페이지에서 진행하는 12문항 5점 척도 설문. 5차원 벡터로 환산하여 저장.

## Task 1.1: 엔티티 작성

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/entity/SurveyDimension.java`

```java
package com.enjoytrip.backend.domain.survey.entity;

public enum SurveyDimension {
    ACTIVITY, FOOD, PACE, URBAN_NATURE, TIME_PREF
}
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/entity/SurveyQuestion.java`

```java
package com.enjoytrip.backend.domain.survey.entity;

import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "survey_questions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SurveyQuestion extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String code;  // A03, F01, etc.

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SurveyDimension dimension;

    @Column(nullable = false, length = 200)
    private String content;

    @Column(nullable = false)
    private boolean isReverse;  // true면 역문항

    @Column(nullable = false)
    private int displayOrder;

    @Builder
    private SurveyQuestion(String code, SurveyDimension dimension, String content,
                          boolean isReverse, int displayOrder) {
        this.code = code;
        this.dimension = dimension;
        this.content = content;
        this.isReverse = isReverse;
        this.displayOrder = displayOrder;
    }
}
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/entity/UserPreference.java`

```java
package com.enjoytrip.backend.domain.survey.entity;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_preferences")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPreference extends BaseEntity {

    @Id
    private Long userId;  // User PK 공유

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private User user;

    @Column(nullable = false)
    private double activity;       // 0.0 ~ 1.0

    @Column(nullable = false)
    private double food;

    @Column(nullable = false)
    private double pace;

    @Column(nullable = false)
    private double urbanNature;

    @Column(nullable = false)
    private double timePref;

    @Builder
    private UserPreference(User user, double activity, double food,
                          double pace, double urbanNature, double timePref) {
        this.user = user;
        this.userId = user.getId();
        this.activity = activity;
        this.food = food;
        this.pace = pace;
        this.urbanNature = urbanNature;
        this.timePref = timePref;
    }

    public void update(double activity, double food, double pace,
                       double urbanNature, double timePref) {
        this.activity = activity;
        this.food = food;
        this.pace = pace;
        this.urbanNature = urbanNature;
        this.timePref = timePref;
    }
}
```

## Task 1.2: Repository

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/repository/SurveyQuestionRepository.java`

```java
package com.enjoytrip.backend.domain.survey.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.survey.entity.SurveyQuestion;

public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, Long> {
    List<SurveyQuestion> findAllByOrderByDisplayOrderAsc();
}
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/repository/UserPreferenceRepository.java`

```java
package com.enjoytrip.backend.domain.survey.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.enjoytrip.backend.domain.survey.entity.UserPreference;

public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {
    Optional<UserPreference> findByUserId(Long userId);
}
```

## Task 1.3: DTO

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/dto/SurveyQuestionResponse.java`

```java
package com.enjoytrip.backend.domain.survey.dto;

import com.enjoytrip.backend.domain.survey.entity.SurveyQuestion;
import com.enjoytrip.backend.domain.survey.entity.SurveyDimension;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SurveyQuestionResponse {
    private Long id;
    private String code;
    private SurveyDimension dimension;
    private String content;
    private boolean isReverse;
    private int displayOrder;

    public static SurveyQuestionResponse from(SurveyQuestion q) {
        return SurveyQuestionResponse.builder()
                .id(q.getId())
                .code(q.getCode())
                .dimension(q.getDimension())
                .content(q.getContent())
                .isReverse(q.isReverse())
                .displayOrder(q.getDisplayOrder())
                .build();
    }
}
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/dto/SurveySubmitRequest.java`

```java
package com.enjoytrip.backend.domain.survey.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class SurveySubmitRequest {

    @NotEmpty(message = "응답이 비어있습니다.")
    @Valid
    private List<Answer> answers;

    @Getter
    public static class Answer {
        @NotNull
        private Long questionId;

        @Min(1) @Max(5)
        private int score;
    }
}
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/dto/UserPreferenceResponse.java`

```java
package com.enjoytrip.backend.domain.survey.dto;

import com.enjoytrip.backend.domain.survey.entity.UserPreference;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserPreferenceResponse {
    private double activity;
    private double food;
    private double pace;
    private double urbanNature;
    private double timePref;

    public static UserPreferenceResponse from(UserPreference p) {
        return UserPreferenceResponse.builder()
                .activity(p.getActivity())
                .food(p.getFood())
                .pace(p.getPace())
                .urbanNature(p.getUrbanNature())
                .timePref(p.getTimePref())
                .build();
    }
}
```

## Task 1.4: Service

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/service/SurveyService.java`

```java
package com.enjoytrip.backend.domain.survey.service;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.auth.repository.UserRepository;
import com.enjoytrip.backend.domain.survey.dto.SurveyQuestionResponse;
import com.enjoytrip.backend.domain.survey.dto.SurveySubmitRequest;
import com.enjoytrip.backend.domain.survey.dto.UserPreferenceResponse;
import com.enjoytrip.backend.domain.survey.entity.SurveyDimension;
import com.enjoytrip.backend.domain.survey.entity.SurveyQuestion;
import com.enjoytrip.backend.domain.survey.entity.UserPreference;
import com.enjoytrip.backend.domain.survey.repository.SurveyQuestionRepository;
import com.enjoytrip.backend.domain.survey.repository.UserPreferenceRepository;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SurveyService {

    private final SurveyQuestionRepository questionRepository;
    private final UserPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SurveyQuestionResponse> getQuestions() {
        return questionRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(SurveyQuestionResponse::from)
                .toList();
    }

    @Transactional
    public UserPreferenceResponse submit(String email, SurveySubmitRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 모든 질문 가져와서 응답 매칭
        List<SurveyQuestion> questions = questionRepository.findAll();
        Map<Long, SurveyQuestion> questionMap = new HashMap<>();
        questions.forEach(q -> questionMap.put(q.getId(), q));

        // 모든 문항 응답 필수
        if (request.getAnswers().size() != questions.size()) {
            throw new BusinessException(ErrorCode.SURVEY_INCOMPLETE);
        }

        // 차원별 점수 합산
        Map<SurveyDimension, Double> sumByDim = new EnumMap<>(SurveyDimension.class);
        Map<SurveyDimension, Integer> countByDim = new EnumMap<>(SurveyDimension.class);

        for (SurveySubmitRequest.Answer answer : request.getAnswers()) {
            SurveyQuestion q = questionMap.get(answer.getQuestionId());
            if (q == null) {
                throw new BusinessException(ErrorCode.SURVEY_QUESTION_NOT_FOUND);
            }
            double normalized = q.isReverse()
                    ? (5.0 - answer.getScore()) / 4.0
                    : (answer.getScore() - 1) / 4.0;

            sumByDim.merge(q.getDimension(), normalized, Double::sum);
            countByDim.merge(q.getDimension(), 1, Integer::sum);
        }

        double activity = avg(sumByDim, countByDim, SurveyDimension.ACTIVITY);
        double food = avg(sumByDim, countByDim, SurveyDimension.FOOD);
        double pace = avg(sumByDim, countByDim, SurveyDimension.PACE);
        double urbanNature = avg(sumByDim, countByDim, SurveyDimension.URBAN_NATURE);
        double timePref = avg(sumByDim, countByDim, SurveyDimension.TIME_PREF);

        UserPreference preference = preferenceRepository.findByUserId(user.getId())
                .orElseGet(() -> UserPreference.builder()
                        .user(user)
                        .activity(activity).food(food).pace(pace)
                        .urbanNature(urbanNature).timePref(timePref)
                        .build());

        preference.update(activity, food, pace, urbanNature, timePref);
        preferenceRepository.save(preference);

        return UserPreferenceResponse.from(preference);
    }

    @Transactional(readOnly = true)
    public UserPreferenceResponse getMyPreference(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        UserPreference preference = preferenceRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        return UserPreferenceResponse.from(preference);
    }

    private double avg(Map<SurveyDimension, Double> sum,
                       Map<SurveyDimension, Integer> count,
                       SurveyDimension dim) {
        Double s = sum.get(dim);
        Integer c = count.get(dim);
        if (s == null || c == null || c == 0) return 0.5;  // 기본값 중립
        return s / c;
    }
}
```

## Task 1.5: Controller

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/survey/controller/SurveyController.java`

```java
package com.enjoytrip.backend.domain.survey.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.enjoytrip.backend.domain.survey.dto.SurveyQuestionResponse;
import com.enjoytrip.backend.domain.survey.dto.SurveySubmitRequest;
import com.enjoytrip.backend.domain.survey.dto.UserPreferenceResponse;
import com.enjoytrip.backend.domain.survey.service.SurveyService;
import com.enjoytrip.backend.global.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/surveys")
@RequiredArgsConstructor
public class SurveyController {

    private final SurveyService surveyService;

    @GetMapping("/questions")
    public ResponseEntity<ApiResponse<List<SurveyQuestionResponse>>> getQuestions() {
        return ResponseEntity.ok(
                ApiResponse.success("설문 문항 조회 성공", surveyService.getQuestions())
        );
    }

    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> submit(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid SurveySubmitRequest request) {
        UserPreferenceResponse response = surveyService.submit(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("설문 응답 저장 성공", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> getMine(
            @AuthenticationPrincipal UserDetails userDetails) {
        UserPreferenceResponse response = surveyService.getMyPreference(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("내 성향 조회 성공", response));
    }
}
```

## Task 1.6: 시드 데이터 추가

**파일 수정**: `backend/src/main/java/com/enjoytrip/backend/global/config/DataInitializer.java`

`run()` 메서드 끝부분에 추가:

```java
// 설문 문항 시드 (이미 있으면 스킵)
if (surveyQuestionRepository.count() == 0) {
    List<SurveyQuestion> questions = List.of(
        SurveyQuestion.builder().code("A03").dimension(SurveyDimension.ACTIVITY).content("하루에 1만 보 이상 걷는 일정도 괜찮다").isReverse(false).displayOrder(1).build(),
        SurveyQuestion.builder().code("A05").dimension(SurveyDimension.ACTIVITY).content("여행은 결국 쉬려고 가는 거다").isReverse(true).displayOrder(2).build(),
        SurveyQuestion.builder().code("F01").dimension(SurveyDimension.FOOD).content("줄을 1시간 서더라도 유명한 맛집은 꼭 가야 한다").isReverse(false).displayOrder(3).build(),
        SurveyQuestion.builder().code("F02").dimension(SurveyDimension.FOOD).content("식사는 끼니만 때우면 된다").isReverse(true).displayOrder(4).build(),
        SurveyQuestion.builder().code("P01").dimension(SurveyDimension.PACE).content("시간 단위로 계획을 짜놓는 게 마음이 편하다").isReverse(false).displayOrder(5).build(),
        SurveyQuestion.builder().code("P05").dimension(SurveyDimension.PACE).content("일정 사이에 비어있는 시간이 있어야 마음이 편하다").isReverse(true).displayOrder(6).build(),
        SurveyQuestion.builder().code("P07").dimension(SurveyDimension.PACE).content("사진 찍느라 한 장소에서 30분 이상 머무는 것도 괜찮다").isReverse(false).displayOrder(7).build(),
        SurveyQuestion.builder().code("U01").dimension(SurveyDimension.URBAN_NATURE).content("도시의 활기찬 분위기를 좋아한다").isReverse(false).displayOrder(8).build(),
        SurveyQuestion.builder().code("U02").dimension(SurveyDimension.URBAN_NATURE).content("자연 풍경 속에 있을 때 가장 행복하다").isReverse(true).displayOrder(9).build(),
        SurveyQuestion.builder().code("T01").dimension(SurveyDimension.TIME_PREF).content("일출을 보러 새벽에 일어날 수 있다").isReverse(false).displayOrder(10).build(),
        SurveyQuestion.builder().code("T03").dimension(SurveyDimension.TIME_PREF).content("밤 늦게까지 야경이나 술 한잔을 즐기고 싶다").isReverse(true).displayOrder(11).build(),
        SurveyQuestion.builder().code("T04").dimension(SurveyDimension.TIME_PREF).content("저녁 10시 전에는 숙소에 들어가는 게 좋다").isReverse(false).displayOrder(12).build()
    );
    surveyQuestionRepository.saveAll(questions);
    log.info("설문 문항 12개 시드 완료");
}
```

`DataInitializer`에 `SurveyQuestionRepository`를 주입하고 필요한 import 추가.

## Task 1.7: 프론트엔드 - 설문 페이지

**파일 생성**: `frontend/src/types/survey.ts`

```typescript
export type SurveyDimension = 'ACTIVITY' | 'FOOD' | 'PACE' | 'URBAN_NATURE' | 'TIME_PREF';

export interface SurveyQuestion {
  id: number;
  code: string;
  dimension: SurveyDimension;
  content: string;
  isReverse: boolean;
  displayOrder: number;
}

export interface SurveyAnswer {
  questionId: number;
  score: number;  // 1~5
}

export interface SurveySubmitRequest {
  answers: SurveyAnswer[];
}

export interface UserPreference {
  activity: number;       // 0.0 ~ 1.0
  food: number;
  pace: number;
  urbanNature: number;
  timePref: number;
}
```

**파일 생성**: `frontend/src/api/survey.ts`

```typescript
import instance from './instance';
import type { ApiResponse, SurveyQuestion, SurveySubmitRequest, UserPreference } from '../types/survey';

export const getQuestions = async (): Promise<SurveyQuestion[]> => {
  const res = await instance.get<ApiResponse<SurveyQuestion[]>>('/api/surveys/questions');
  return res.data.data;
};

export const submitSurvey = async (request: SurveySubmitRequest): Promise<UserPreference> => {
  const res = await instance.post<ApiResponse<UserPreference>>('/api/surveys/submit', request);
  return res.data.data;
};

export const getMyPreference = async (): Promise<UserPreference> => {
  const res = await instance.get<ApiResponse<UserPreference>>('/api/surveys/me');
  return res.data.data;
};
```

> ⚠️ `ApiResponse` 타입은 `frontend/src/types/auth.ts`에서 가져오거나 별도 공통 타입으로 분리

**파일 생성**: `frontend/src/pages/survey/SurveyPage.tsx`

요구사항:
- 한 페이지에 12문항 모두 표시 (스크롤)
- 각 문항은 라디오 버튼 5개 (1~5점)
- 모든 문항 응답해야 제출 가능
- 제출 시 로딩 표시, 성공 시 `/survey/result`로 이동
- 우상단에 "나중에" 버튼 (`/`로 이동)
- 디자인 토큰: Primary `#FF9F66`, 둥근 모서리, Tailwind 사용

**파일 생성**: `frontend/src/pages/survey/SurveyResultPage.tsx`

요구사항:
- 5차원 결과를 레이더 차트로 표시 (`recharts` 사용 — `npm install recharts`)
- 각 차원별 한 줄 설명 (예: "당신은 액티비티 80%형 여행자입니다")
- "재설문하기" 버튼 → `/survey`로 이동
- "홈으로" 버튼 → `/`로 이동

**라우터 등록**: `frontend/src/App.tsx` (또는 라우트 정의 파일)
```tsx
<Route path="/survey" element={<SurveyPage />} />
<Route path="/survey/result" element={<SurveyResultPage />} />
```

회원가입 직후 `/survey`로 리다이렉트하도록 `SignupPage.tsx`의 `navigate('/login')`를 변경하지 말고, **로그인 직후** 성향이 없으면 `/survey`로 안내하는 로직을 `LoginPage.tsx`에 추가:
```tsx
// 로그인 성공 후
try {
  await getMyPreference();
  navigate('/');
} catch {
  navigate('/survey');  // 성향 정보 없음 → 설문으로
}
```

## Task 1.8: 검증

1. 백엔드 빌드 → 서버 시작 → 시드 로그 확인 ("설문 문항 12개 시드 완료")
2. Postman으로 `GET /api/surveys/questions` (인증 토큰 헤더 포함) → 12문항 응답 확인
3. `POST /api/surveys/submit` body 예시:
```json
{
  "answers": [
    {"questionId": 1, "score": 4},
    {"questionId": 2, "score": 2},
    ... 12개 ...
  ]
}
```
응답으로 5차원 벡터 정상 반환 확인
4. `GET /api/surveys/me`로 저장된 성향 조회 확인
5. 프론트: 설문 페이지 → 12문항 모두 응답 → 제출 → 레이더 차트 결과 확인

---

# Phase 2: 장소 보관함 (FR-PLACE + Google Places)

> **목표**: Google Places API로 모든 카테고리(숙소·맛집·카페·명소·쇼핑) 검색 및 그룹 단위 보관함 관리.

## Task 2.1: Google Places 클라이언트 설정

**파일 수정**: `backend/src/main/resources/application.yml`

```yaml
google:
  maps:
    api-key: ${GOOGLE_MAPS_API_KEY:}
    places-base-url: https://places.googleapis.com/v1
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/global/config/WebClientConfig.java`

```java
package com.enjoytrip.backend.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}
```

> ⚠️ WebClient 사용을 위해 `build.gradle`에 추가:
> ```groovy
> implementation 'org.springframework.boot:spring-boot-starter-webflux'
> ```

## Task 2.2: places, bookmarks 엔티티

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/place/entity/PlaceCategory.java`

```java
package com.enjoytrip.backend.domain.place.entity;

public enum PlaceCategory {
    LODGING, RESTAURANT, CAFE, ATTRACTION, SHOPPING, OTHER;

    public static PlaceCategory fromGoogleType(String type) {
        if (type == null) return OTHER;
        return switch (type) {
            case "lodging" -> LODGING;
            case "restaurant" -> RESTAURANT;
            case "cafe" -> CAFE;
            case "tourist_attraction", "museum", "park" -> ATTRACTION;
            case "shopping_mall", "store" -> SHOPPING;
            default -> OTHER;
        };
    }
}
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/place/entity/Place.java`

```java
package com.enjoytrip.backend.domain.place.entity;

import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "places", indexes = {
    @Index(name = "idx_places_google_id", columnList = "googlePlaceId", unique = true)
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Place extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 200)
    private String googlePlaceId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 300)
    private String address;

    @Column(nullable = false)
    private double lat;

    @Column(nullable = false)
    private double lng;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PlaceCategory category;

    private Double rating;
    private Integer ratingCount;

    @Column(length = 30)
    private String priceLevel;  // PRICE_LEVEL_MODERATE 등

    @Column(length = 500)
    private String photoUrl;

    @Builder
    private Place(String googlePlaceId, String name, String address,
                  double lat, double lng, PlaceCategory category,
                  Double rating, Integer ratingCount, String priceLevel, String photoUrl) {
        this.googlePlaceId = googlePlaceId;
        this.name = name;
        this.address = address;
        this.lat = lat;
        this.lng = lng;
        this.category = category;
        this.rating = rating;
        this.ratingCount = ratingCount;
        this.priceLevel = priceLevel;
        this.photoUrl = photoUrl;
    }
}
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/place/entity/Bookmark.java`

```java
package com.enjoytrip.backend.domain.place.entity;

import com.enjoytrip.backend.domain.auth.entity.User;
import com.enjoytrip.backend.domain.group.entity.TravelGroup;
import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "bookmarks", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"group_id", "place_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Bookmark extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(length = 500)
    private String memo;

    private Integer personalRating;  // 1~5, nullable

    @Builder
    private Bookmark(TravelGroup travelGroup, Place place, User createdBy,
                     String memo, Integer personalRating) {
        this.travelGroup = travelGroup;
        this.place = place;
        this.createdBy = createdBy;
        this.memo = memo;
        this.personalRating = personalRating;
    }

    public void update(String memo, Integer personalRating) {
        this.memo = memo;
        this.personalRating = personalRating;
    }
}
```

## Task 2.3: Google Places 클라이언트 + 캐시

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/place/client/GooglePlacesClient.java`

```java
package com.enjoytrip.backend.domain.place.client;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.enjoytrip.backend.domain.place.dto.GooglePlaceSearchResult;
import com.enjoytrip.backend.global.exception.BusinessException;
import com.enjoytrip.backend.global.exception.ErrorCode;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Slf4j
@Component
public class GooglePlacesClient {

    private final WebClient webClient;
    private final String apiKey;

    private static final String FIELD_MASK = String.join(",",
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.types",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.photos",
            "places.googleMapsUri"
    );

    public GooglePlacesClient(WebClient.Builder builder,
                              @Value("${google.maps.api-key}") String apiKey,
                              @Value("${google.maps.places-base-url}") String baseUrl) {
        this.webClient = builder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
    }

    public List<GooglePlaceSearchResult> searchText(String query, String includedType) {
        Map<String, Object> requestBody = new java.util.HashMap<>();
        requestBody.put("textQuery", query);
        requestBody.put("languageCode", "ko");
        requestBody.put("regionCode", "kr");
        if (includedType != null && !includedType.isBlank()) {
            requestBody.put("includedType", includedType);
        }

        try {
            return webClient.post()
                    .uri("/places:searchText")
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(GooglePlaceSearchResponse.class)
                    .map(GooglePlaceSearchResponse::getPlaces)
                    .onErrorResume(e -> {
                        log.error("Google Places search failed", e);
                        return Mono.empty();
                    })
                    .blockOptional()
                    .orElseThrow(() -> new BusinessException(ErrorCode.PLACE_SEARCH_FAILED));
        } catch (Exception e) {
            log.error("Google Places exception", e);
            throw new BusinessException(ErrorCode.PLACE_SEARCH_FAILED);
        }
    }

    @lombok.Getter
    private static class GooglePlaceSearchResponse {
        private List<GooglePlaceSearchResult> places;
    }
}
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/place/dto/GooglePlaceSearchResult.java`

```java
package com.enjoytrip.backend.domain.place.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GooglePlaceSearchResult {
    private String id;
    private DisplayName displayName;
    private String formattedAddress;
    private Location location;
    private List<String> types;
    private Double rating;
    private Integer userRatingCount;
    private String priceLevel;
    private List<Photo> photos;
    private String googleMapsUri;

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DisplayName {
        private String text;
    }

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Location {
        private double latitude;
        private double longitude;
    }

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Photo {
        private String name;  // Photo resource name for fetching media
    }
}
```

## Task 2.4: 검색 결과 캐싱 (DB 24시간)

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/place/entity/PlaceSearchCache.java`

```java
package com.enjoytrip.backend.domain.place.entity;

import java.time.LocalDateTime;

import com.enjoytrip.backend.global.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "place_search_cache", indexes = {
    @Index(name = "idx_psc_key", columnList = "cacheKey")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceSearchCache extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 300)
    private String cacheKey;  // {query}:{category}:{regionGrid}

    @Column(nullable = false, columnDefinition = "TEXT")
    private String resultJson;  // JSON 직렬화된 결과

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Builder
    private PlaceSearchCache(String cacheKey, String resultJson, LocalDateTime expiresAt) {
        this.cacheKey = cacheKey;
        this.resultJson = resultJson;
        this.expiresAt = expiresAt;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
```

## Task 2.5: 서비스 + 컨트롤러 + DTO

전체 구조:
- `PlaceService` — 검색 (캐시 우선) + 보관함 CRUD
- `PlaceController`
- DTO: `PlaceSearchRequest`, `PlaceResponse`, `BookmarkCreateRequest`, `BookmarkResponse`

상세 코드는 Phase 1 패턴과 동일하게 구현. 핵심 메서드:

```java
// PlaceService
public List<PlaceResponse> search(String query, PlaceCategory category) {
    String cacheKey = buildCacheKey(query, category);
    Optional<PlaceSearchCache> cached = cacheRepository.findByCacheKey(cacheKey);

    if (cached.isPresent() && !cached.get().isExpired()) {
        return parseJson(cached.get().getResultJson());
    }

    String includedType = mapCategoryToIncludedType(category);
    List<GooglePlaceSearchResult> results = googlePlacesClient.searchText(query, includedType);
    List<PlaceResponse> mapped = results.stream().map(this::toPlaceResponse).toList();

    cacheRepository.save(PlaceSearchCache.builder()
            .cacheKey(cacheKey)
            .resultJson(toJson(mapped))
            .expiresAt(LocalDateTime.now().plusHours(24))
            .build());

    return mapped;
}

public BookmarkResponse addBookmark(Long groupId, String email, BookmarkCreateRequest request) {
    // 1. 그룹 멤버 검증 (B의 권한 AOP가 있으면 @GroupMember 사용)
    // 2. Place 엔티티 upsert (googlePlaceId로 lookup, 없으면 생성)
    // 3. Bookmark 생성 (중복 시 PLACE_ALREADY_BOOKMARKED)
    // 4. SSE 이벤트 발행: PLACE_BOOKMARKED
}
```

## Task 2.6: API 엔드포인트

```
GET    /api/places/search?q=강남카페&category=CAFE         # 검색 (인증 필요)
GET    /api/groups/{id}/bookmarks                          # 보관함 조회
POST   /api/groups/{id}/bookmarks                          # 보관함 추가
PATCH  /api/groups/{id}/bookmarks/{bookmarkId}             # 메모/별점 수정
DELETE /api/groups/{id}/bookmarks/{bookmarkId}             # 삭제
```

## Task 2.7: 프론트엔드

**페이지**: `frontend/src/pages/places/PlaceSearchPage.tsx`

요구사항:
- 상단 검색 입력창
- 카테고리 칩 필터: 전체 / 숙소 / 맛집 / 카페 / 명소 / 쇼핑
- 결과 카드: 사진, 이름, 평점, 가격대, 주소
- "보관함에 추가" 버튼 → 모달 (메모, 별점 입력)
- 지도 + 리스트 토글 (지도는 일단 placeholder, Phase 3에서 통합)

**페이지**: `frontend/src/pages/places/BookmarkListPage.tsx`

요구사항:
- 그룹 보관함 목록
- 카테고리 필터, 정렬 (최근/평점/이름)
- 삭제, 메모 수정 가능

## Task 2.8: 검증

1. `GET /api/places/search?q=강남 카페&category=CAFE` → Google Places 응답 매핑된 결과 확인
2. 같은 쿼리 다시 호출 → DB 캐시에서 응답 (로그로 확인)
3. 보관함 추가 → 중복 시 409 응답
4. 프론트: 검색 → 결과 표시 → 보관함 추가 → 보관함 페이지에서 조회

---

# Phase 3: 일정 빌더 (FR-SCHEDULE + 카카오 모빌리티)

> **목표**: 드래그앤드롭 일정 빌더 + 카카오 모빌리티로 이동 시간/비용 자동 표시.

## Task 3.1: 카카오 모빌리티 클라이언트

**파일 수정**: `application.yml`
```yaml
kakao:
  mobility:
    rest-key: ${KAKAO_MOBILITY_API_KEY:}
    directions-url: https://apis-navi.kakaomobility.com/v1/directions
```

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/schedule/client/KakaoMobilityClient.java`

요구사항:
- `getDirections(originLat, originLng, destLat, destLng, mode)` 메서드
- mode: CAR, TRANSIT, WALK
- 응답에서 추출: `duration`, `distance`, `toll`, `taxi`, `fuelCost(자체계산)`
- 1시간 캐시 (메모리 또는 DB)

자동차 모드 응답 파싱 예:
```java
public DirectionsResult getCarDirections(double oLat, double oLng, double dLat, double dLng) {
    KakaoDirectionsResponse res = webClient.get()
            .uri(uriBuilder -> uriBuilder
                    .queryParam("origin", oLng + "," + oLat)
                    .queryParam("destination", dLng + "," + dLat)
                    .queryParam("priority", "RECOMMEND")
                    .build())
            .header("Authorization", "KakaoAK " + apiKey)
            .retrieve()
            .bodyToMono(KakaoDirectionsResponse.class)
            .block();

    var summary = res.getRoutes().get(0).getSummary();
    int distanceM = summary.getDistance();
    int durationSec = summary.getDuration();
    int toll = summary.getFare().getToll();
    int taxi = summary.getFare().getTaxi();
    int fuel = (int) (distanceM / 1000.0 / 13.0 * 1700);  // 13km/L, 1700원/L

    return DirectionsResult.builder()
            .mode("CAR")
            .durationSec(durationSec)
            .distanceM(distanceM)
            .toll(toll)
            .taxi(taxi)
            .fuelCost(fuel)
            .build();
}
```

## Task 3.2: 엔티티

**파일 생성**: `backend/src/main/java/com/enjoytrip/backend/domain/schedule/entity/Schedule.java`

```java
@Entity
@Table(name = "schedules")
public class Schedule extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup travelGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id")
    private Place place;

    @Column(nullable = false)
    private int dayIndex;  // Day 1, 2, ...

    private LocalTime startTime;
    private LocalTime endTime;

    @Column(length = 500)
    private String memo;

    @Column(nullable = false)
    private int orderIndex;  // 같은 일자 내 순서

    private Integer estimatedCost;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TransportMode transportMode;  // CAR, TRANSIT, WALK

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ScheduleStatus status;  // PLANNED, VOTING, CANCELLED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    // ... Builder, 도메인 메서드
}
```

**파일 생성**: `TransportLeg.java` (이동 구간 + 비용)

```java
@Entity
@Table(name = "transport_legs",
       uniqueConstraints = {@UniqueConstraint(columnNames = {"from_schedule_id", "to_schedule_id", "mode"})})
public class TransportLeg extends BaseEntity {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne private Schedule fromSchedule;
    @ManyToOne private Schedule toSchedule;

    @Enumerated(EnumType.STRING)
    private TransportMode mode;

    private int durationSec;
    private int distanceM;
    private Integer toll;
    private Integer fuelCost;
    private Integer taxiFare;
    private Integer transitFare;

    private LocalDateTime cachedAt;
}
```

## Task 3.3: API 엔드포인트

```
GET    /api/groups/{id}/schedules?day=N
POST   /api/groups/{id}/schedules
PATCH  /api/groups/{id}/schedules/{scheduleId}
DELETE /api/groups/{id}/schedules/{scheduleId}
POST   /api/groups/{id}/schedules/reorder         # 드래그 결과 일괄 반영
GET    /api/groups/{id}/schedules/{id}/directions # 다음 일정까지의 이동 정보 (3가지 모드)
```

## Task 3.4: 드래그 reorder 처리

```java
// SchedulePosition: { scheduleId, dayIndex, orderIndex }
@Transactional
public void reorder(Long groupId, List<SchedulePosition> positions) {
    Map<Long, Schedule> map = scheduleRepository.findAllById(
            positions.stream().map(SchedulePosition::getScheduleId).toList()
    ).stream().collect(Collectors.toMap(Schedule::getId, s -> s));

    for (var pos : positions) {
        Schedule s = map.get(pos.getScheduleId());
        if (s == null || !s.getTravelGroup().getId().equals(groupId)) continue;
        s.reorder(pos.getDayIndex(), pos.getOrderIndex());
    }
    // SSE 발행: SCHEDULE_REORDERED
}
```

## Task 3.5: 프론트엔드 일정 빌더

**라이브러리 추가**: `npm install @dnd-kit/core @dnd-kit/sortable`

**페이지**: `frontend/src/pages/schedules/ScheduleBuilderPage.tsx`

요구사항:
- 일자별 컬럼 뷰 (Day 1, Day 2, ...)
- 각 컬럼 안에 일정 카드 세로 나열
- 카드 간에 이동 정보 카드 자동 삽입 (자동차/대중교통/도보 탭)
- 드래그 앤 드롭 (`@dnd-kit/sortable`)
  - 같은 컬럼 내 순서 변경
  - 다른 컬럼으로 이동 (dayIndex 변경)
- 일정 추가 모달 (장소 검색 또는 보관함에서 선택)

**페이지 분리** (선택): `SchedulesMapView.tsx` — 지도 뷰

## Task 3.6: 검증

1. `POST /api/groups/1/schedules` 로 일정 3개 생성
2. `GET /api/groups/1/schedules/{id}/directions` → 자동차/대중교통/도보 응답 확인
3. `POST .../reorder` 로 순서 변경 → DB의 `orderIndex` 갱신 확인
4. 프론트에서 드래그 → 서버 호출 1회만 → 카드 위치 즉시 반영

---

# Phase 4: 일정 투표 (FR-VOTE)

> **목표**: 한 시간 슬롯에 여러 후보 장소를 등록하고 멤버들이 1~5점으로 투표하여 최다 득표 채택.

## 엔티티

```
vote_sessions (id, schedule_id, status, deadline_at, created_by, ...)
vote_candidates (id, vote_session_id, place_id, memo, created_by)
votes (id, candidate_id, user_id, score, ...)
```

## API

```
POST   /api/schedules/{id}/candidates              # 후보 추가 (Schedule 상태 VOTING으로)
POST   /api/schedules/{id}/votes                   # 투표 {candidateId, score}
GET    /api/schedules/{id}/votes/result            # 집계
POST   /api/schedules/{id}/promote?candidateId=N   # 수동 채택
```

## 마감 자동 처리

- `@Scheduled` 또는 클라이언트 요청 시점에 마감 검사
- 동점 시 Owner가 수동 선택 (응답으로 알림)

## 프론트엔드

- 후보 카드 가로 스크롤
- 각 카드에 1~5점 라디오
- 결과 시각화 (막대 그래프, recharts)
- "당신은 아직 투표하지 않았습니다" 인라인 알림

---

# Phase 5: 추천 (FR-RECOMMEND + TourAPI)

> **목표**: 그룹 평균 성향 벡터와 매칭하여 한국관광공사 명소 추천.

## 핵심 로직

1. TourAPI `areaBasedList2` 호출 → 지역 기반 관광지 목록
2. 응답을 우리 카테고리에 매핑
3. 각 명소에 특성 벡터 부여 (카테고리/태그 기반):
   - 트레킹 코스 → activity 높음
   - 박물관 → urban 높음, pace 낮음 (역값)
4. 그룹 멤버 성향 벡터 평균 계산
5. 코사인 유사도로 정렬, 상위 20개

## API
```
GET /api/recommendations?groupId=X&category=ATTRACTION
```

## 캐시
- 같은 (지역, 카테고리)는 24시간 DB 캐시

## 프론트엔드
- 그룹 상세 페이지의 "추천" 탭
- 카드 그리드, "보관함에 추가" 원클릭

---

# Phase 6: 홈 + 마이페이지 (FR-HOME, FR-MYPAGE)

## 홈 API

```
GET /api/dashboard

응답:
{
  "inProgress": [{ "groupId": ..., "title": ..., "dDay": 0, "nextSchedule": {...} }],
  "upcoming": [...],
  "completed": [...],
  "pendingSettlements": 45000,
  "pendingVotes": 2,
  "memberJoinedNotifications": [...]
}
```

## 마이페이지

```
GET    /api/users/me
PATCH  /api/users/me                   # 이름 변경
PATCH  /api/users/me/password          # 비밀번호 변경 (FR-AUTH-05)
DELETE /api/users/me                   # 계정 탈퇴 (FR-AUTH-06)

GET    /api/users/me/groups            # 참여 그룹 목록 (완료 포함)
POST   /api/users/me/reviews           # 회고 작성 {groupId, rating, content}
```

## 프론트엔드 페이지
- `/` — 홈 대시보드
- `/mypage` — 마이페이지 (탭: 프로필, 보안, 그룹, 회고)
- `/mypage/password` — 비밀번호 변경
- `/mypage/withdraw` — 계정 탈퇴 확인 페이지

---

# 🧪 통합 테스트 시나리오 (D+12)

전체 흐름이 동작하는지 확인하는 시나리오. Phase 6 이후 진행.

1. **회원가입 → 성향 설문 → 홈**
   - 신규 회원가입 후 자동으로 설문 페이지로 이동
   - 12문항 응답 → 결과 차트 확인 → 홈으로

2. **그룹 생성/참여 (B 도메인)**
   - 그룹 생성 → 초대 코드 발급 → 다른 계정으로 참여

3. **장소 → 일정 → 투표**
   - 보관함에 장소 5개 추가
   - 일정에 3개 배치, 드래그로 순서 변경
   - 이동 정보(자동차/대중교통) 표시 확인
   - 한 일정을 투표로 전환, 후보 2개 등록, 멤버들 투표, 채택

4. **정산 (B 도메인) + 이동비용 자동 등록**
   - 일정의 "이동 비용 정산에 추가" 클릭
   - B의 정산 매트릭스에 자동 등록 확인

5. **SSE 실시간 (B 도메인)**
   - 두 브라우저로 같은 그룹 접속
   - 한쪽에서 일정 추가 → 반대쪽 즉시 반영 확인

6. **마이페이지**
   - 비밀번호 변경 → 재로그인 강제
   - 종료된 그룹에 회고 작성

---

# 📝 기타 컨벤션 / 주의사항

## SSE 이벤트 발행 (A의 책임)
모든 도메인 변경 시 `ApplicationEventPublisher`로 발행:

```java
@Service
@RequiredArgsConstructor
public class ScheduleService {
    private final ApplicationEventPublisher publisher;

    public Schedule create(...) {
        Schedule saved = scheduleRepository.save(...);
        publisher.publishEvent(new ScheduleAddedEvent(
            saved.getTravelGroup().getId(),
            saved.getCreatedBy().getId(),
            ScheduleResponse.from(saved)
        ));
        return saved;
    }
}
```

B가 `@EventListener`로 받아서 SSE 채널로 전파. A는 SSE 구현을 몰라도 됨.

## 권한 검증
B의 `@GroupMember` AOP가 완성되면 컨트롤러 메서드에:

```java
@GetMapping("/groups/{groupId}/schedules")
@GroupMember  // ← AOP가 자동 검증
public ResponseEntity<...> getSchedules(@PathVariable Long groupId, ...) { ... }
```

B의 AOP 미완성 시점에는 서비스 안에서 직접 체크:

```java
boolean isMember = groupMemberRepository.existsByTravelGroupIdAndUserIdAndLeftAtIsNull(groupId, userId);
if (!isMember) throw new BusinessException(ErrorCode.NOT_GROUP_MEMBER);
```

## FR-EXPENSE-07 (이동 비용 자동 등록)
A의 일정 화면에서 "이 비용을 정산에 추가" 버튼 클릭 시:

```java
// A의 ScheduleService에서 B의 ExpenseService 호출
@Service
@RequiredArgsConstructor
public class ScheduleExpenseService {
    private final ExpenseService expenseService;  // B 도메인

    public void registerTransportExpense(Long scheduleId, String email) {
        Schedule schedule = ...;
        TransportLeg leg = ...;
        int totalCost = leg.getToll() + leg.getFuelCost();

        expenseService.create(
            schedule.getTravelGroup().getId(),
            ExpenseCreateRequest.builder()
                .amount(totalCost)
                .category("TRANSPORT")
                .splitType("EQUAL")
                .description("[자동] " + schedule.getPlace().getName() + " 이동")
                .sourceScheduleId(scheduleId)
                .build()
        );
    }
}
```

DTO 형식은 B와 D+5에 합의.

## 외부 API 호출 원칙
- 모든 외부 API는 BE 프록시 (FE 직접 호출 금지)
- 응답 캐시 필수 적용 (Google 24h, Kakao 1h, TourAPI 24h)
- 키는 환경변수에서만 로드 (`@Value("${...}")`)
- 호출 실패 시 적절한 ErrorCode로 변환

## 커밋 메시지
Conventional Commits 형식:
```
feat(survey): 설문 응답 API 구현
feat(place): Google Places 검색 프록시 추가
fix(schedule): 드래그 후 순서 깨짐 수정
refactor(auth): BaseEntity 적용
chore(deps): @dnd-kit 추가
```

---

# 🚀 시작 명령

다음 명령으로 Phase 0부터 시작:

```
@CLAUDE_TASKS.md Phase 0의 모든 Task를 순차적으로 실행해줘.
각 Task가 끝나면 빌드 성공 여부를 확인하고 다음 Task로 진행해.
Task 0.5까지 끝나면 멈추고 보고해.
```

Phase가 끝날 때마다 PR을 작성하고 머지 후 다음 Phase로 진행.

/**
 * 비(非)그룹 스코프 화면의 React Query 키 표준.
 * 그룹 상세 내부 키는 {@link ./groupQueryKeys} 를 사용한다.
 *
 * prefix 무효화를 위해 `[domain, ...]` 형태를 유지한다.
 * 예: invalidateQueries({ queryKey: ['user'] }) 로 stats·payout 등 user 하위 전체 무효화.
 */
export const appQueryKeys = {
  /** 홈 대시보드(GET /api/home). */
  home: () => ['home'] as const,
  /** 내 그룹 목록(GET /api/groups). */
  myGroups: () => ['groups', 'mine'] as const,

  /** 마이페이지 여행 통계. */
  myStats: () => ['user', 'stats'] as const,
  /** 정산 받기 링크·계좌. */
  myPayout: () => ['user', 'payout'] as const,

  /** 설문 문항(정적). */
  surveyQuestions: () => ['survey', 'questions'] as const,
  /** 내 성향(설문 결과). */
  myPreference: () => ['survey', 'preference'] as const,

  /** 인앱 알림 목록. */
  notifications: () => ['notifications'] as const,
} as const;

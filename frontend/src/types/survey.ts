/**
 * 설문(취향 분석) 도메인 타입 — 코드(types/survey.ts)가 계약. 현재 5차원.
 *
 * ▶ 9차원 확장 시 변경 지점은 단 두 곳:
 *   1) SurveyDimension 유니온에 새 차원 추가
 *   2) DIMENSION_META 에 라벨/페르소나키/UserPreference 매핑 추가
 *      (+ UserPreference 인터페이스에 필드 추가)
 *   화면/레이더/페르소나 로직은 DIMENSIONS·DIMENSION_META 만 보므로 그대로 동작한다.
 */

export type SurveyDimension =
  | 'ACTIVITY'
  | 'FOOD'
  | 'PACE'
  | 'URBAN_NATURE'
  | 'TIME_PREF';

export interface SurveyQuestion {
  id: number;
  code: string;
  dimension: SurveyDimension;
  content: string;
  /** 역문항: 점수를 6-score 로 뒤집어 집계 */
  isReverse: boolean;
  displayOrder: number;
}

export interface SurveyAnswer {
  questionId: number;
  /** 1~5 */
  score: number;
}

export interface SurveySubmitRequest {
  answers: SurveyAnswer[];
}

/** 차원별 선호도 0.0~1.0. */
export interface UserPreference {
  activity: number;
  food: number;
  pace: number;
  urbanNature: number;
  timePref: number;
}

/* ── 차원 메타 (UI 라벨 + UserPreference 매핑) ───────────────── */

interface DimensionMeta {
  /** 짧은 라벨(레이더 축/칩) */
  label: string;
  /** 양 극단 설명 (낮음 ↔ 높음) */
  low: string;
  high: string;
  /** UserPreference 에서 이 차원의 값 키 */
  prefKey: keyof UserPreference;
}

export const DIMENSION_META: Record<SurveyDimension, DimensionMeta> = {
  ACTIVITY: { label: '활동', low: '휴식', high: '액티비티', prefKey: 'activity' },
  FOOD: { label: '맛집', low: '간단히', high: '미식', prefKey: 'food' },
  PACE: { label: '페이스', low: '여유', high: '빠듯', prefKey: 'pace' },
  URBAN_NATURE: { label: '자연', low: '도시', high: '자연', prefKey: 'urbanNature' },
  TIME_PREF: { label: '시간대', low: '저녁형', high: '아침형', prefKey: 'timePref' },
};

/** 화면 표시/집계 순서. */
export const DIMENSIONS: SurveyDimension[] = [
  'ACTIVITY',
  'FOOD',
  'PACE',
  'URBAN_NATURE',
  'TIME_PREF',
];

/** UserPreference 에서 차원 값(0~1)을 안전하게 읽는다. */
export const prefValue = (pref: UserPreference, dim: SurveyDimension): number =>
  pref[DIMENSION_META[dim].prefKey] ?? 0;

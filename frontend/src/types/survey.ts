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

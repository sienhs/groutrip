import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  SurveyQuestion,
  SurveySubmitRequest,
  UserPreference,
} from '../types/survey';

/** 설문 API (백엔드 Part A 계약 기준). */

/** 설문 문항 목록(12개, displayOrder 순). */
export const getSurveyQuestions = async (): Promise<SurveyQuestion[]> => {
  const res = await instance.get<ApiResponse<SurveyQuestion[]>>('/api/surveys/questions');
  return res.data.data;
};

/** 답변 제출 → 5차원 선호도 반환. (경로: /submit) */
export const submitSurvey = async (body: SurveySubmitRequest): Promise<UserPreference> => {
  const res = await instance.post<ApiResponse<UserPreference>>('/api/surveys/submit', body);
  return res.data.data;
};

/** 내 성향 조회(결과 페이지 폴백). 미응답이면 null. */
export const getMyPreference = async (): Promise<UserPreference | null> => {
  const res = await instance.get<ApiResponse<UserPreference | null>>('/api/surveys/me');
  return res.data.data;
};

/** FR-SURVEY-03: 그룹 평균 성향/일치율/충돌 차원. 응답자 2명 미만이면 matchRate/conflict는 null. */
export interface GroupPersona {
  memberCount: number;
  respondedCount: number;
  average: { activity: number; food: number; pace: number; urbanNature: number; timePref: number } | null;
  matchRate: number | null;
  mostConflictingDimension: string | null;
  conflictMessage: string | null;
}

export const getGroupPersona = async (groupId: number): Promise<GroupPersona> => {
  const res = await instance.get<ApiResponse<GroupPersona>>(`/api/groups/${groupId}/persona`);
  return res.data.data;
};

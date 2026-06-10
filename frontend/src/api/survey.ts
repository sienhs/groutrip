import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { SurveyQuestion, SurveySubmitRequest, UserPreference } from '../types/survey';

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

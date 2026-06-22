import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  VoteSession,
  VoteSessionCreateRequest,
  CandidateCreateRequest,
  CastVoteRequest,
  CloseVoteRequest,
  VoteCandidate,
} from '../types/vote';

/** 투표 API (백엔드 Part A). 세션은 일정에 종속. */

/** 일정의 투표 세션 목록. */
export const getVoteSessions = async (groupId: number, scheduleId: number): Promise<VoteSession[]> => {
  const res = await instance.get<ApiResponse<VoteSession[]>>(
    `/api/groups/${groupId}/schedules/${scheduleId}/vote-sessions`,
  );
  return res.data.data;
};

/** 투표 세션 상세(결과). */
export const getVoteSession = async (groupId: number, sessionId: number): Promise<VoteSession> => {
  const res = await instance.get<ApiResponse<VoteSession>>(
    `/api/groups/${groupId}/vote-sessions/${sessionId}`,
  );
  return res.data.data;
};

/** 투표 세션 생성(일정에). */
export const createVoteSession = async (
  groupId: number,
  scheduleId: number,
  body: VoteSessionCreateRequest = {},
): Promise<VoteSession> => {
  const res = await instance.post<ApiResponse<VoteSession>>(
    `/api/groups/${groupId}/schedules/${scheduleId}/vote-sessions`,
    body,
  );
  return res.data.data;
};

/** 후보(장소) 등록. 멤버당 ≤5. */
export const addCandidate = async (
  groupId: number,
  sessionId: number,
  body: CandidateCreateRequest,
): Promise<VoteCandidate> => {
  const res = await instance.post<ApiResponse<VoteCandidate>>(
    `/api/groups/${groupId}/vote-sessions/${sessionId}/candidates`,
    body,
  );
  return res.data.data;
};

/** 후보에 점수 투표(1~5). 갱신된 세션 반환. */
export const castVote = async (
  groupId: number,
  sessionId: number,
  body: CastVoteRequest,
): Promise<VoteSession> => {
  const res = await instance.post<ApiResponse<VoteSession>>(
    `/api/groups/${groupId}/vote-sessions/${sessionId}/votes`,
    body,
  );
  return res.data.data;
};

/** 마감. candidateId 없으면 최다 득표 자동(동점이면 400). */
export const closeVoteSession = async (
  groupId: number,
  sessionId: number,
  body: CloseVoteRequest = {},
): Promise<VoteSession> => {
  const res = await instance.post<ApiResponse<VoteSession>>(
    `/api/groups/${groupId}/vote-sessions/${sessionId}/close`,
    body,
  );
  return res.data.data;
};

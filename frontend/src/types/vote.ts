/**
 * 투표(FR-VOTE) — 백엔드 Part A 계약.
 *  - 투표 세션은 일정(schedule)에 종속
 *  - 후보 = 장소(멤버당 ≤5 등록)
 *  - 투표는 후보별 점수(score 1~5)
 *  - 마감: candidateId 없으면 최다 득표 자동, 동점이면 400 → Owner 가 지정 재호출
 *    당선 시 일정 장소가 그 후보로 바뀜
 */

export type VoteStatus = 'OPEN' | 'CLOSED';

export interface VoteVoter {
  userId: number;
  name: string;
  score: number; // 1~5
}

export interface VoteCandidatePlace {
  placeId: number;
  name: string;
  address?: string | null;
  photoUrl?: string | null;
}

export interface VoteCandidate {
  id: number;
  place: VoteCandidatePlace;
  registeredById: number;
  registeredByName: string;
  memo: string | null;
  /** 점수 합계 */
  totalScore: number;
  /** 투표 인원 수 */
  voteCount: number;
  voters: VoteVoter[];
}

export interface VoteSession {
  id: number;
  scheduleId: number;
  title: string | null;
  status: VoteStatus;
  closesAt: string | null;
  /** 마감 시 당선 후보 */
  winnerCandidateId: number | null;
  /** 내가 투표했는지 */
  hasVoted: boolean;
  candidates: VoteCandidate[];
}

export interface VoteSessionCreateRequest {
  title?: string;
  closesAt?: string;
}

export interface CandidateCreateRequest {
  placeId: number;
  memo?: string;
}

export interface CastVoteRequest {
  candidateId: number;
  score: number; // 1~5
}

export interface CloseVoteRequest {
  /** 동점 시 Owner 가 지정 */
  candidateId?: number;
}

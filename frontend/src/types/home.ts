/** 홈(FR-HOME) 응답 — 백엔드 Part A. */

export interface HomeGroupSummary {
  id: number;
  title: string;
  destination: string;
  /** 표시용(예: "D-3", "3박 4일") */
  day: string;
  memberCount: number;
  coverImageKey: string;
}

export interface HomeNotification {
  /** 미정산 금액(원) */
  unsettledAmount: number;
  /** 대기 중 투표 수 */
  pendingVoteCount: number;
}

export interface HomeResponse {
  greetingName: string;
  inProgress: HomeGroupSummary[];
  upcoming: HomeGroupSummary[];
  completed: HomeGroupSummary[];
  notification: HomeNotification;
}

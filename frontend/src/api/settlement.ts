import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type {
  SettlementPaymentLinksResponse,
  SettlementProgressResponse,
  SettlementSummaryResponse,
} from '../types/settlement';

const settlementPath = (groupId: number) => `/api/groups/${groupId}/settlements`;

export const getSettlementSummary = async (groupId: number): Promise<SettlementSummaryResponse> => {
  const response = await instance.get<ApiResponse<SettlementSummaryResponse>>(settlementPath(groupId));
  return response.data.data;
};

export const startSettlement = async (groupId: number): Promise<SettlementProgressResponse> => {
  const response = await instance.post<ApiResponse<SettlementProgressResponse>>(settlementPath(groupId));
  return response.data.data;
};

export const getSettlementProgress = async (groupId: number): Promise<SettlementProgressResponse> => {
  const response = await instance.get<ApiResponse<SettlementProgressResponse>>(
    `${settlementPath(groupId)}/progress`,
  );
  return response.data.data;
};

export const getSettlementPaymentLinks = async (
  groupId: number,
  settlementId: number,
): Promise<SettlementPaymentLinksResponse> => {
  const response = await instance.get<ApiResponse<SettlementPaymentLinksResponse>>(
    `${settlementPath(groupId)}/${settlementId}/payment-links`,
  );
  return response.data.data;
};

export const confirmSettlementSent = async (
  groupId: number,
  settlementId: number,
): Promise<SettlementProgressResponse> => {
  const response = await instance.patch<ApiResponse<SettlementProgressResponse>>(
    `${settlementPath(groupId)}/${settlementId}/sent`,
  );
  return response.data.data;
};

export const confirmSettlementReceived = async (
  groupId: number,
  settlementId: number,
): Promise<SettlementProgressResponse> => {
  const response = await instance.patch<ApiResponse<SettlementProgressResponse>>(
    `${settlementPath(groupId)}/${settlementId}/complete`,
  );
  return response.data.data;
};
